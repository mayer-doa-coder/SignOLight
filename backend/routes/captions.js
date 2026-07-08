const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const { YoutubeTranscript } = require("youtube-transcript");

const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.youtube.com/",
};

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
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: YOUTUBE_HEADERS,
  });

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
  const response = await fetch(
    `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`,
    { headers: YOUTUBE_HEADERS }
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

async function fetchCaptionTextFromTrack(track) {
  const wantsTranslation = track.languageCode !== "en" && track.isTranslatable;
  const url = appendQuery(track.baseUrl, {
    fmt: "vtt",
    ...(wantsTranslation ? { tlang: "en" } : {}),
  });

  const response = await fetch(url, { headers: YOUTUBE_HEADERS });
  if (!response.ok) return "";

  return response.text();
}

async function fetchDirectCaptionText(videoId) {
  const urls = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=vtt`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=srv3`,
  ];

  for (const url of urls) {
    const response = await fetch(url, { headers: YOUTUBE_HEADERS });
    if (!response.ok) continue;

    const text = await response.text();
    if (text.trim().length > 20) return text;
  }

  return "";
}

async function fetchCaptionsFromLibrary(videoId) {
  try {
    const rows = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
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
    const text = decodeEntities(match[3]).replace(/<[^>]+>/g, "").trim();

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
    const text = decodeEntities(match[3]).replace(/<[^>]+>/g, "").trim();

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

// GET /api/captions?videoId=xxx
router.get("/", async (req, res) => {
  try {
    const { videoId, url } = req.query;
    const id = videoId || extractVideoId(url);

    if (!id) return res.status(400).json({ error: "videoId is required" });

    const pageTracks = await getCaptionTracksFromWatchPage(id);
    const listTracks = pageTracks.length
      ? []
      : await getCaptionTracksFromTimedText(id);
    const track = chooseCaptionTrack([...pageTracks, ...listTracks]);

    let captionText = track ? await fetchCaptionTextFromTrack(track) : "";
    let source = track ? "captionTracks" : "direct";

    if (!captionText.trim()) {
      captionText = await fetchDirectCaptionText(id);
      source = "direct";
    }

    let captions = parseCaptions(captionText);
    let usedLibraryFallback = false;

    if (!captions.length) {
      captions = await fetchCaptionsFromLibrary(id);
      usedLibraryFallback = captions.length > 0;
      if (usedLibraryFallback) source = "youtube-transcript";
    }

    if (!captions.length) {
      return res.status(404).json({
        error:
          "No captions available from YouTube for this video. Try a public video with CC enabled.",
        hint:
          "Use videos from 3Blue1Brown, TED-Ed, Khan Academy, or official YouTube education channels.",
      });
    }

    res.json({
      captions,
      count: captions.length,
      format: usedLibraryFallback
        ? "transcript"
        : /WEBVTT/i.test(captionText)
          ? "vtt"
          : "xml",
      source,
      language: track?.languageCode || "en",
      translated: !!(track && track.languageCode !== "en" && track.isTranslatable),
    });
  } catch (err) {
    console.error("Caption fetch error:", err);
    res.status(500).json({ error: "Failed to fetch captions" });
  }
});

module.exports = router;
