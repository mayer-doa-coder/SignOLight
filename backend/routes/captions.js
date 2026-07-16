const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const fs = require("fs/promises");
const path = require("path");
const { YoutubeTranscript } = require("youtube-transcript");

const TRANSLATION_CACHE_DIR =
  process.env.SIGNOLIGHT_CACHE_DIR || path.resolve(__dirname, "../cache");

// The regular YouTube watch page is frequently consent-gated or rate-limited on
// cloud-hosting IP ranges such as Render. The Android InnerTube client returns
// the same public caption tracks without relying on watch-page HTML.
const INNERTUBE_API_KEY =
  process.env.YOUTUBE_INNERTUBE_API_KEY ||
  "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_ANDROID_VERSION =
  process.env.YOUTUBE_ANDROID_CLIENT_VERSION || "20.10.38";
const INNERTUBE_ANDROID_USER_AGENT =
  `com.google.android.youtube/${INNERTUBE_ANDROID_VERSION} ` +
  "(Linux; U; Android 11) gzip";
const INNERTUBE_CLIENTS = [
  {
    name: "ANDROID",
    id: "3",
    version: INNERTUBE_ANDROID_VERSION,
    userAgent: INNERTUBE_ANDROID_USER_AGENT,
    context: { androidSdkVersion: 30 },
  },
  {
    name: "IOS",
    id: "5",
    version: "20.10.4",
    userAgent: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_1 like Mac OS X)",
    context: {
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      osName: "iPhone",
      osVersion: "18.3.1.20D67",
    },
  },
  {
    name: "TVHTML5",
    id: "7",
    version: "7.20250205.16.00",
    userAgent: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version",
  },
  {
    name: "WEB",
    id: "1",
    version: "2.20250222.10.00",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
];
const PREFER_INNERTUBE =
  process.env.YOUTUBE_PREFER_INNERTUBE == null
    ? process.env.NODE_ENV === "production"
    : /^true$/i.test(process.env.YOUTUBE_PREFER_INNERTUBE);

const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.youtube.com/",
};

function containsBangla(text) {
  return /[\u0980-\u09ff]/.test(String(text || ""));
}

function translationCachePath(videoId, language) {
  const safeVideoId = String(videoId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeLanguage = String(language || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(
    TRANSLATION_CACHE_DIR,
    `${safeVideoId}.${safeLanguage}.captions.json`
  );
}

async function readTranslationCache(videoId, language) {
  try {
    const raw = await fs.readFile(
      translationCachePath(videoId, language),
      "utf8"
    );
    const cached = JSON.parse(raw);
    return cached?.captions?.length ? cached : null;
  } catch {
    return null;
  }
}

async function writeTranslationCache(videoId, language, payload) {
  try {
    await fs.mkdir(TRANSLATION_CACHE_DIR, { recursive: true });
    await fs.writeFile(
      translationCachePath(videoId, language),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  } catch (err) {
    console.error("Translation cache write error:", err.message);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function translateJoinedTexts(texts, targetLanguage) {
  const joined = texts.join("\n");
  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}` +
    `&dt=t&q=${encodeURIComponent(joined)}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      ...YOUTUBE_HEADERS,
      Referer: "https://translate.google.com/",
    },
  });

  if (!response.ok) {
    throw new Error(`Free translation service returned ${response.status}`);
  }

  const data = await response.json();
  const translated = (data?.[0] || [])
    .map((segment) => segment?.[0] || "")
    .join("")
    .replace(/\r/g, "");
  const lines = translated.split("\n");

  while (lines.length > texts.length && lines.at(-1) === "") lines.pop();
  if (lines.length !== texts.length || lines.some((line) => !line.trim())) {
    throw new Error("Free translation service changed caption boundaries");
  }

  return lines.map((line) => line.trim());
}

function makeTranslationChunks(texts, maxItems = 12, maxCharacters = 1600) {
  const chunks = [];
  let current = [];
  let characters = 0;

  for (const text of texts) {
    const nextLength = String(text || "").length + (current.length ? 1 : 0);
    if (
      current.length &&
      (current.length >= maxItems || characters + nextLength > maxCharacters)
    ) {
      chunks.push(current);
      current = [];
      characters = 0;
    }
    current.push(text);
    characters += nextLength;
  }

  if (current.length) chunks.push(current);
  return chunks;
}

async function translateChunkWithBoundaryFallback(texts, targetLanguage) {
  try {
    return await translateJoinedTexts(texts, targetLanguage);
  } catch (batchError) {
    const translated = [];
    for (const text of texts) {
      const [line] = await translateJoinedTexts([text], targetLanguage);
      translated.push(line);
    }
    return translated;
  }
}

async function translateTextsFree(texts, targetLanguage, concurrency = 3) {
  const chunks = makeTranslationChunks(texts);
  const results = new Array(chunks.length);
  let nextChunk = 0;

  async function worker() {
    while (nextChunk < chunks.length) {
      const index = nextChunk;
      nextChunk += 1;
      results[index] = await translateChunkWithBoundaryFallback(
        chunks[index],
        targetLanguage
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, () => worker())
  );
  return results.flat();
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url?.match(pattern);
    if (match) return match[1];
  }

  return url?.length === 11 ? url : null;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function appendQuery(url, params) {
  const parsed = new URL(decodeEntities(url));
  for (const [key, value] of Object.entries(params)) {
    if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function extractJsonObjectAfter(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i += 1) {
    const char = html[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }

  return null;
}

async function getCaptionTracksFromWatchPage(videoId) {
  const response = await fetchWithTimeout(
    `https://www.youtube.com/watch?v=${videoId}`,
    { headers: YOUTUBE_HEADERS },
    10000
  );

  if (!response.ok) return [];

  const html = await response.text();
  const jsonText = extractJsonObjectAfter(html, "ytInitialPlayerResponse");
  if (!jsonText) return [];

  try {
    const player = JSON.parse(jsonText);
    return (
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || []
    );
  } catch (err) {
    console.error("Caption track JSON parse error:", err.message);
    return [];
  }
}

function parseTrackListXml(xml) {
  const tracks = [];
  const regex = /<track\b([^>]*)>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const attrs = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attr;

    while ((attr = attrRegex.exec(match[1])) !== null) {
      attrs[attr[1]] = decodeEntities(attr[2]);
    }

    if (attrs.lang_code) tracks.push(attrs);
  }

  return tracks;
}

async function getCaptionTracksFromTimedText(videoId) {
  const response = await fetchWithTimeout(
    `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`,
    { headers: YOUTUBE_HEADERS },
    10000
  );

  if (!response.ok) return [];

  const xml = await response.text();
  const tracks = parseTrackListXml(xml);

  return tracks.map((track) => ({
    baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${encodeURIComponent(
      track.lang_code
    )}${track.kind ? `&kind=${encodeURIComponent(track.kind)}` : ""}`,
    languageCode: track.lang_code,
    name: { simpleText: track.name || track.lang_original || track.lang_translated },
    kind: track.kind,
    isTranslatable: true,
  }));
}

async function getCaptionTracksFromInnertube(videoId) {
  const attempts = await Promise.allSettled(
    INNERTUBE_CLIENTS.map(async (client) => {
      const response = await fetchWithTimeout(
        `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": client.userAgent,
            "X-YouTube-Client-Name": client.id,
            "X-YouTube-Client-Version": client.version,
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: client.name,
                clientVersion: client.version,
                hl: "en",
                gl: "US",
                ...(client.context || {}),
              },
            },
            videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
        },
        15000
      );

      if (!response.ok) {
        return { client, tracks: [], status: `HTTP_${response.status}` };
      }

      const player = await response.json();
      return {
        client,
        tracks:
          player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [],
        status: player?.playabilityStatus?.status || "UNKNOWN",
      };
    })
  );

  for (const attempt of attempts) {
    if (attempt.status !== "fulfilled") continue;
    const { client, tracks } = attempt.value;
    if (!tracks.length) continue;
    return tracks.map((track) => ({
      ...track,
      _source: `innertube-${client.name.toLowerCase()}`,
      _clientHeaders: {
        "User-Agent": client.userAgent,
        "X-YouTube-Client-Name": client.id,
        "X-YouTube-Client-Version": client.version,
      },
    }));
  }

  const summary = attempts.map((attempt, index) =>
    attempt.status === "fulfilled"
      ? `${attempt.value.client.name}:${attempt.value.status}`
      : `${INNERTUBE_CLIENTS[index].name}:ERROR`
  );
  console.warn(`[captions] InnerTube clients returned no tracks for ${videoId}: ${summary.join(",")}`);
  return [];
}

function chooseCaptionTrack(tracks) {
  if (!tracks.length) return null;

  return (
    tracks.find((track) => track.languageCode === "en" && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode === "en") ||
    tracks.find((track) => /^en[-_]/i.test(track.languageCode || "")) ||
    tracks.find((track) => track.isTranslatable) ||
    tracks[0]
  );
}

async function fetchCaptionTextFromTrack(track, targetLanguage = "en") {
  const wantsTranslation =
    targetLanguage &&
    track.languageCode !== targetLanguage &&
    track.isTranslatable;
  const url = appendQuery(track.baseUrl, {
    fmt: "vtt",
    ...(wantsTranslation ? { tlang: targetLanguage } : {}),
  });

  const response = await fetchWithTimeout(
    url,
    {
      headers: track._clientHeaders
        ? { ...YOUTUBE_HEADERS, ...track._clientHeaders }
        : track._source === "innertube-android"
          ? {
              ...YOUTUBE_HEADERS,
              "User-Agent": INNERTUBE_ANDROID_USER_AGENT,
              "X-YouTube-Client-Name": "3",
              "X-YouTube-Client-Version": INNERTUBE_ANDROID_VERSION,
            }
          : YOUTUBE_HEADERS,
    },
    15000
  );
  if (!response.ok) return "";

  return response.text();
}

async function fetchDirectCaptionText(videoId, targetLanguage = "en") {
  const translation = targetLanguage !== "en"
    ? `&tlang=${encodeURIComponent(targetLanguage)}`
    : "";
  const urls = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt${translation}`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=vtt${translation}`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3${translation}`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3${translation}`,
  ];

  const responses = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetchWithTimeout(
          url,
          { headers: YOUTUBE_HEADERS },
          8000
        );
        if (!response.ok) return "";
        const text = await response.text();
        return text.trim().length > 20 ? text : "";
      } catch {
        return "";
      }
    })
  );

  return responses.find(Boolean) || "";
}

async function fetchCaptionsFromLibrary(videoId) {
  let timeout;
  try {
    const rows = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("youtube-transcript timed out")),
          15000
        );
      }),
    ]);
    return rows
      .map((row) => ({
        start: Math.round(row.offset),
        end: Math.round(row.offset + row.duration),
        text: decodeEntities(row.text)
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      }))
      .filter((row) => row.text);
  } catch (err) {
    console.error("youtube-transcript fallback error:", err.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseTimedText(xml) {
  const segments = [];
  const textRegex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  const srv3Regex = /<p\b[^>]*\bt="(\d+)"[^>]*\bd="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;

  let match;
  while ((match = textRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]) * 1000;
    const duration = parseFloat(match[2]) * 1000;
    const text = decodeEntities(match[3])
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      segments.push({
        start: Math.round(start),
        end: Math.round(start + duration),
        text,
      });
    }
  }

  while ((match = srv3Regex.exec(xml)) !== null) {
    const start = Number(match[1]);
    const duration = Number(match[2]);
    const text = decodeEntities(match[3])
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (text) segments.push({ start, end: start + duration, text });
  }

  return segments;
}

function parseVTT(vtt) {
  const segments = [];
  const blocks = vtt.replace(/\r/g, "").split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n").filter(Boolean);
    const timeLine = lines.find((line) => line.includes("-->"));
    if (!timeLine) continue;

    const [startStr, endWithSettings] = timeLine.split("-->").map((s) => s.trim());
    const endStr = endWithSettings.split(/\s+/)[0];
    const text = lines
      .slice(lines.indexOf(timeLine) + 1)
      .join(" ")
      .replace(/<\d{1,2}:\d{2}:\d{2}\.\d{3}>/g, "")
      .replace(/<\d{1,2}:\d{2}\.\d{3}>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;

    segments.push({
      start: Math.round(parseTime(startStr)),
      end: Math.round(parseTime(endStr)),
      text: decodeEntities(text),
    });
  }

  return segments;
}

function parseTime(time) {
  const parts = time.split(":").map(Number);
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return (parts[0] * 60 + parts[1]) * 1000;
}

function parseCaptions(captionText) {
  if (/WEBVTT/i.test(captionText)) return parseVTT(captionText);
  return parseTimedText(captionText);
}

async function fetchParsedCaptionTrack(track, targetLanguage) {
  if (!track) return { text: "", captions: [] };

  let text = await fetchCaptionTextFromTrack(track, targetLanguage);
  let captions = parseCaptions(text);

  // Some YouTube clients advertise translation but return an empty body when
  // tlang is requested. Keep the source transcript and translate it through
  // the free text fallback later instead of discarding a valid caption track.
  if (
    !captions.length &&
    targetLanguage &&
    targetLanguage !== track.languageCode
  ) {
    text = await fetchCaptionTextFromTrack(
      track,
      track.languageCode || "en"
    );
    captions = parseCaptions(text);
  }

  return { text, captions };
}

// GET /api/captions?videoId=xxx
router.get("/", async (req, res) => {
  try {
    const { videoId, url } = req.query;
    const targetLanguage = /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(req.query.lang || "")
      ? req.query.lang
      : "en";
    const id = videoId || extractVideoId(url);

    if (!id) return res.status(400).json({ error: "videoId is required" });

    if (targetLanguage !== "en") {
      const cachedTranslation = await readTranslationCache(id, targetLanguage);
      if (cachedTranslation) {
        return res.json({
          ...cachedTranslation,
          source: `${cachedTranslation.source || "free-translation"}-cache`,
        });
      }
    }

    const [pageResult, listResult, innertubeResult] = await Promise.allSettled([
      getCaptionTracksFromWatchPage(id),
      getCaptionTracksFromTimedText(id),
      getCaptionTracksFromInnertube(id),
    ]);
    const pageTracks = pageResult.status === "fulfilled" ? pageResult.value : [];
    const listTracks = listResult.status === "fulfilled" ? listResult.value : [];
    const innertubeTracks =
      innertubeResult.status === "fulfilled" ? innertubeResult.value : [];
    const standardTrack = chooseCaptionTrack([...pageTracks, ...listTracks]);
    const innertubeTrack = chooseCaptionTrack(innertubeTracks);
    const candidateTracks = PREFER_INNERTUBE
      ? [innertubeTrack, standardTrack]
      : [standardTrack, innertubeTrack];

    let track = null;
    let captionText = "";
    let captions = [];
    let source = "direct";
    const trackAttempts = [];

    for (const candidate of candidateTracks.filter(Boolean)) {
      const result = await fetchParsedCaptionTrack(candidate, targetLanguage);
      trackAttempts.push({
        source: candidate._source || "captionTracks",
        languageCode: candidate.languageCode || "unknown",
        captionCount: result.captions.length,
      });
      if (!result.captions.length) continue;
      track = candidate;
      captionText = result.text;
      captions = result.captions;
      source = candidate._source || "captionTracks";
      break;
    }

    let usedLibraryFallback = false;

    if (!captions.length) {
      const directText = await fetchDirectCaptionText(id, targetLanguage);
      const directCaptions = parseCaptions(directText);
      if (directCaptions.length) {
        captions = directCaptions;
        captionText = directText;
        source = "direct";
      }
    }

    if (!captions.length) {
      captions = await fetchCaptionsFromLibrary(id);
      usedLibraryFallback = captions.length > 0;
      if (usedLibraryFallback) source = "youtube-transcript";
    }

    if (!captions.length) {
      return res.status(404).json({
        error:
          "YouTube did not return a usable caption track for this video.",
        hint:
          "Confirm the video is public and that CC or automatic captions are available, then try again.",
        attemptedSources: [
          "watch-page",
          "timed-text",
          "direct-caption-url",
          "innertube-android",
          "transcript-library",
        ],
        diagnostics: {
          trackCounts: {
            watchPage: pageTracks.length,
            timedText: listTracks.length,
            innertube: innertubeTracks.length,
          },
          trackAttempts,
        },
      });
    }

    const sourceLanguage = track?.languageCode || "en";
    let translated =
      targetLanguage === sourceLanguage ||
      (targetLanguage === "bn" &&
        captions.some((caption) => containsBangla(caption.text)));

    if (targetLanguage === "bn" && !translated) {
      const translatedTexts = await translateTextsFree(
        captions.map((caption) => caption.text),
        targetLanguage
      );
      captions = captions.map((caption, index) => ({
        ...caption,
        text: translatedTexts[index],
      }));
      translated = captions.some((caption) => containsBangla(caption.text));
      source = "google-translate-free";
    }

    if (targetLanguage === "bn" && !translated) {
      return res.status(502).json({
        error:
          "Bangla translation is temporarily unavailable. Please try again.",
      });
    }

    const payload = {
      captions,
      count: captions.length,
      format: usedLibraryFallback
        ? "transcript"
        : /WEBVTT/i.test(captionText)
          ? "vtt"
          : "xml",
      source,
      language: targetLanguage,
      sourceLanguage,
      translated,
    };

    if (targetLanguage !== "en" && translated) {
      await writeTranslationCache(id, targetLanguage, payload);
    }

    res.json(payload);
  } catch (err) {
    console.error("Caption fetch error:", err);
    res.status(500).json({
      error:
        err.name === "AbortError"
          ? "The translation service timed out. Please try again."
          : "Failed to fetch or translate captions",
    });
  }
});

module.exports = router;
module.exports._test = {
  containsBangla,
  makeTranslationChunks,
  parseCaptions,
  chooseCaptionTrack,
  getCaptionTracksFromInnertube,
  fetchCaptionTextFromTrack,
  fetchParsedCaptionTrack,
};
