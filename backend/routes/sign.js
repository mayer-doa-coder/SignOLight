const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const { enforceSignability } = require("../lib/signability");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ASL (American Sign Language) gloss prompt.
// Grammar rules follow standard ASL glossing conventions (topic-comment,
// WH-word sentence-final, negation sentence-final, dropped articles/auxiliaries).
//
// The vocabulary the avatar can actually sign, generated from SIGN_MOTIONS in
// frontend/src/components/SignAvatar.js by scripts/sync-sign-vocabulary.js.
// Telling the LLM the true dictionary matters: any word missing from this list gets
// glossed as [CONCEPT:x], which the avatar renders as a silent pause. This list was
// previously hand-maintained and had drifted to 143 words against the avatar's 332,
// so 57% of the dictionary was unreachable. __tests__/vocabulary.test.js guards the drift.
const SIGN_VOCAB = require("../data/sign-vocabulary.json").vocabulary.join(" ");

// Detects Bangla/Bengali script (Unicode block U+0980–U+09FF).
// Used for Phase B1 code-switching: mixed Bangla-English lecture captions.
function detectBangla(text) {
  return /[ঀ-৿]/.test(text ?? "");
}

function buildGlossPrompt(text) {
  const banglaSection = detectBangla(text) ? `

IMPORTANT — MIXED BANGLA-ENGLISH TEXT DETECTED:
- Translate Bengali words to their English conceptual equivalent first, then apply ASL rules.
- Bengali nouns: map to nearest SIGN_VOCAB word if a concept match exists.
- Bengali proper nouns (person names, places, organisations): use [FINGERSPELL:X] with romanised transliteration.
- Bengali concepts with no SIGN_VOCAB equivalent: use [CONCEPT:bengali_word].
- Apply ASL topic-comment order after translation, as always.
Mixed examples:
"শিক্ষক বললেন that neural networks learn patterns" → TEACHER NEURAL NETWORK PATTERN LEARN
"আমার নাম Riya এবং I study computer science"       → [FINGERSPELL:RIYA] COMPUTER STUDY
"এই algorithm টা কি কাজ করে?"                       → ALGORITHM WHAT DO
` : "";

  return `Convert this English caption to ASL (American Sign Language) gloss notation.

AVAILABLE ASL SIGNS — prefer words from this list when meaning is preserved:
${SIGN_VOCAB}

ASL GRAMMAR RULES — mandatory, not optional:
- Topic-comment structure: state the topic FIRST, then what is said about it
- Remove ALL articles (a, an, the) — no exceptions
- Remove ALL auxiliary verbs (is, are, was, were, has, have, will) unless negated
- Remove ALL prepositions (in, on, at, to, of, from) unless meaning changes entirely
- WH-words (WHAT, WHERE, WHEN, HOW, WHY) appear at the END of the gloss (ASL WH-final)
- Negation: place NOT or CANNOT at the END of the gloss
- Capitalize every word
- Maximum 8 words per gloss
- Use BASE FORM of all verbs: write TAKE not TAKES, LEARN not LEARNS, GO not WENT/GOES
- Drop filler pronouns "it"/"this"/"that" when they do not refer to a specific thing (e.g. "takes it all" → ALL TAKE, not IT ALL TAKE)
- For proper nouns, names, places, abbreviations → [FINGERSPELL:WORD]
- For concepts with no available sign → [CONCEPT:word]
- Use [NUMBER:X] for all digits

ASL GLOSS EXAMPLES:
"The student reads the book every day"        → STUDENT EXAMPLE EVERY-DAY LEARN
"Where does the teacher live?"                → TEACHER LIVE WHERE
"Did you finish the homework?"                → YOU EXAMPLE FINISH
"I cannot understand this lesson"             → EXAMPLE ME UNDERSTAND CANNOT
"Mathematics is difficult for children"       → [CONCEPT:mathematics] PROBLEM DEEP
"The neural network learns patterns from data" → NEURAL-NETWORK DATA PATTERN LEARN
"What does this function calculate?"          → FUNCTION CALCULATE WHAT
"The model did not produce the correct output" → MODEL OUTPUT RESULT PRODUCE NOT
"The winner takes it all"                     → WINNER ALL TAKE
"DNA carries genetic information"             → [FINGERSPELL:DNA] [CONCEPT:genetic] DATA CONNECT

Input: "${text}"

Reply ONLY with the gloss — no explanation, no punctuation.` + banglaSection;
}

function normalizeGloss(gloss) {
  return String(gloss || "")
    .replace(/^["']|["']$/g, "")
    .replace(/^(?:BdSL|ASL)\s+GLOSS:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Wraps any word with no Latin letters/digits and no existing bracket tag (raw Bangla or
// other non-Latin script that slipped through un-translated, stray symbols, etc.) as a
// [CONCEPT:x] so the avatar always gets a labeled, renderable token instead of silently
// receiving text it has no way to sign or fingerspell.
function wrapUnsignable(word) {
  const w = String(word || "");
  if (!w || w.startsWith("[") || /[A-Za-z0-9]/.test(w)) return w;
  return `[CONCEPT:${w}]`;
}

function glossResult(gloss, fallbackText, confidence) {
  const cleaned = normalizeGloss(gloss);
  if (!cleaned) return simpleGloss(fallbackText);

  // enforceSignability drops leaked function words and wraps unknown content words as
  // [CONCEPT:x] so the avatar never receives a bare word it can only render as a silent
  // pause. wrapUnsignable still catches raw non-Latin script that slips through.
  const rawWords = cleaned.split(/\s+/).slice(0, 10).map(wrapUnsignable);
  const words = enforceSignability(rawWords);
  // A caption that reduces to nothing signable (all function words / all dropped) is not a
  // useful frame — fall back to the heuristic gloss of the original text.
  if (words.length === 0) return simpleGloss(fallbackText);
  return { gloss: words.join(" "), words, confidence: confidence ?? 0.9 };
}

// Single-caption ASL gloss via Groq.
async function textToSignGloss(text) {
  if (!groq) {
    return simpleGloss(text);
  }

  try {
    const response = await withRetry(
      () =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You convert English captions into concise ASL (American Sign Language) gloss for a sign language avatar. ASL uses topic-comment structure — not English word order.",
            },
            { role: "user", content: buildGlossPrompt(text) },
          ],
          temperature: 0,
          max_tokens: 80,
        }),
      "single gloss"
    );

    return glossResult(response.choices[0]?.message?.content, text, 0.9);
  } catch (err) {
    console.error("Groq API error:", err.message);
    return simpleGloss(text);
  }
}

// ---------------------------------------------------------------------------
// Groq call resilience and scheduling
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 3;
// Batches run concurrently rather than one after another. Groq's free tier enforces a
// requests-per-minute cap, so this is bounded — unbounded Promise.all over a long video
// trips 429s that the old sequential loop never hit.
const GROQ_CONCURRENCY = Math.max(1, Number(process.env.GROQ_CONCURRENCY || 1));
const MAX_GROQ_CAPTIONS = Math.max(1, Number(process.env.SIGNOLIGHT_MAX_GROQ_CAPTIONS || 60));

function retryableStatus(err) {
  const status = err?.status ?? err?.response?.status;
  return status === 429 || (status >= 500 && status < 600);
}

function shouldUseHeuristicPipeline(captions) {
  return !groq || captions.length > MAX_GROQ_CAPTIONS;
}

function extractRetryAfterMs(err) {
  const headerValue = Number(
    err?.headers?.["retry-after"] ?? err?.response?.headers?.["retry-after"]
  );
  if (Number.isFinite(headerValue)) return headerValue * 1000;

  const message = String(err?.message ?? err?.error?.message ?? "");
  const match = message.match(/try again in\s+([\d.]+)s/i);
  if (match) return Number(match[1]) * 1000;

  return null;
}

/** Retries a Groq call on rate limits and transient 5xx, honouring Retry-After when sent. */
async function withRetry(fn, label, { maxRetries = DEFAULT_MAX_RETRIES } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!retryableStatus(err) || attempt === maxRetries) break;
      const retryAfterMs = extractRetryAfterMs(err);
      const backoff = Number.isFinite(retryAfterMs)
        ? retryAfterMs
        : 2 ** attempt * 500 + Math.random() * 250; // jitter avoids thundering herd across batches
      console.warn(`[groq] ${label} attempt ${attempt + 1} failed (${err.status ?? err.message}) — retrying in ${Math.round(backoff)}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastErr;
}

/** Runs fn over items with at most `limit` in flight, preserving input order in the output. */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Pulls the per-caption {simplified, gloss} pairs out of whatever shape the model returned.
 * Accepts the requested `{results:[{simplified,gloss}]}` plus the parallel-array shapes
 * (`{glosses:[], simplified:[]}`) and bare arrays, because JSON mode constrains syntax but
 * not schema — a model that renames the wrapper key should not blank the whole batch.
 */
function parseBatchResponse(parsed, count) {
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed.results || parsed.captions || parsed.translations || null;

  if (Array.isArray(rows)) {
    return Array.from({ length: count }, (_, i) => {
      const row = rows[i];
      if (typeof row === "string") return { gloss: row, simplified: null };
      return {
        gloss: row?.gloss ?? row?.asl_gloss ?? row?.translation ?? row?.text ?? null,
        simplified: row?.simplified ?? row?.simple ?? null,
      };
    });
  }

  // Parallel-array shape: {glosses:[...], simplified:[...]}
  const glosses = parsed.glosses || [];
  const simplified = parsed.simplified || [];
  if (!Array.isArray(glosses)) throw new Error("Groq returned a non-array gloss list");
  return Array.from({ length: count }, (_, i) => ({
    gloss: typeof glosses[i] === "string" ? glosses[i] : glosses[i]?.gloss ?? null,
    simplified: typeof simplified[i] === "string" ? simplified[i] : null,
  }));
}

/**
 * Simplify + gloss in a single Groq call.
 *
 * These were two sequential passes (simplify every batch, then gloss every batch), which
 * doubled both request count and wall-clock latency. Asking for both in one completion also
 * improves the gloss: the model writes the simplified sentence first and glosses the text it
 * just produced, so the gloss is conditioned on the simplification instead of being a
 * separate round-trip that has to re-read it.
 *
 * Never throws — falls back to the offline heuristic gloss so one bad batch cannot fail a video.
 */
async function simplifyAndGlossBatch(captions) {
  if (!groq) {
    return captions.map((cap) => ({ simplified: cap.text, ...simpleGloss(cap.text) }));
  }

  const numbered = captions
    .map((cap, i) => `${i + 1}. ${cap.text.replace(/\s+/g, " ")}`)
    .join("\n");

  try {
    const response = await withRetry(
      () =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You prepare English lecture captions for a sign language avatar. For each caption you do two things: simplify the English to secondary-school reading level, then convert that simplified sentence to ASL gloss. ASL uses topic-comment structure — NOT English word order. Return valid JSON only.",
            },
            {
              role: "user",
              content: `For each caption below, produce BOTH:
  1. "simplified" — the caption rewritten at secondary-school reading level. Keep technical terms (they will be signed). Shorter, clearer sentences. Plain English, normal capitalization.
  2. "gloss" — that simplified sentence converted to ASL gloss.

AVAILABLE ASL SIGNS — the avatar can only sign these words. Strongly prefer them whenever meaning is preserved; a word outside this list becomes a silent pause:
${SIGN_VOCAB}

MANDATORY ASL RULES for "gloss":
- Topic-comment structure: topic FIRST, verb LAST
- Remove all articles (a, an, the) — always
- Remove auxiliary verbs (is, are, was, were) unless negated
- WH-words (WHAT, WHERE, WHEN, HOW, WHY, WHO) go at the END
- Negation (NOT, CANNOT) goes at the END
- Use BASE FORM of all verbs: TAKE not TAKES, LEARN not LEARNS, GO not WENT/GOES
- Drop filler pronouns "it"/"this"/"that" when they refer to nothing specific
- Capitalize all words, max 8 words per gloss
- For proper nouns, names, abbreviations → [FINGERSPELL:WORD]
- For concepts with NO word in the available list → [CONCEPT:word]
- Use [NUMBER:X] for digits

EXAMPLES:
caption: "The neural network learns patterns from data"
  → simplified: "A neural network learns patterns from data." gloss: "NEURAL NETWORK DATA PATTERN LEARN"
caption: "What does a compiler do?"
  → simplified: "What does a compiler do?" gloss: "[CONCEPT:compiler] DO WHAT"
caption: "I cannot understand this concept"
  → simplified: "I do not understand this idea." gloss: "ME IDEA UNDERSTAND NOT"
caption: "DNA carries genetic information"
  → simplified: "DNA carries genetic information." gloss: "[FINGERSPELL:DNA] [CONCEPT:genetic] DATA CONNECT"

Return JSON: {"results":[{"simplified":"...","gloss":"..."}]}
The results array must have exactly ${captions.length} items, in the same order.

Captions:
${numbered}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          // Budgets both fields per caption; the old gloss-only call used 60.
          max_tokens: Math.min(2000, Math.max(300, captions.length * 130)),
        }),
      `simplify+gloss batch of ${captions.length}`,
      { maxRetries: 0 }
    );

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const rows = parseBatchResponse(parsed, captions.length);

    return captions.map((cap, i) => ({
      simplified: rows[i]?.simplified || cap.text,
      ...glossResult(rows[i]?.gloss, cap.text, 0.9),
    }));
  } catch (err) {
    console.error("Groq batch API error:", err.message);
    return captions.map((cap) => ({ simplified: cap.text, ...simpleGloss(cap.text) }));
  }
}

// Fallback simple gloss without AI — strips stop words, uppercases remaining,
// then applies a heuristic verb-final reorder to approximate ASL topic-comment
// word order even when Groq is unavailable.
// Confidence: 0.5 (lower — heuristic only, not validated ASL grammar).
function simpleGloss(text) {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "to", "of", "from", "with", "and", "but", "or",
    "that", "this", "it", "its", "we", "they", "he", "she", "has", "have",
    "had", "will", "would", "could", "should", "may", "might", "do", "does",
  ]);
  // Known verbs to move toward the end (ASL topic-comment: topic first, verb last).
  // Covers lecture-domain predicates + common English verbs for general content.
  const verbSet = new Set([
    "LEARN", "TRAIN", "KNOW", "UNDERSTAND", "PREDICT", "CALCULATE",
    "CONNECT", "CLASSIFY", "ACTIVATE", "PROCESS", "REPRESENT", "DEFINE",
    "COMPUTE", "DETERMINE", "MINIMIZE", "MAXIMIZE", "OPTIMIZE", "ADJUST",
    "UPDATE", "CONVERT", "PRODUCE", "GENERATE", "APPLY", "USE", "SHOW",
    "MEAN", "BECOME", "CALL", "TAKE", "GIVE", "MAKE", "FIND", "NEED",
    "WANT", "TRY", "HELP", "ALLOW", "WORK", "PASS", "MOVE", "CHANGE",
    // Common non-domain verbs (cover general video content)
    "WIN", "LOSE", "PLAY", "SAY", "GET", "RUN", "SEE", "TELL",
    "COME", "GO", "THINK", "FEEL", "LIVE", "LOVE", "HATE", "SING",
    "WRITE", "READ", "BUY", "KEEP", "HOLD", "SPEAK", "FINISH",
    "START", "STOP", "WATCH", "BUILD", "BREAK", "OPEN", "CLOSE",
  ]);

  // Strips common English inflections to find the base form in verbSet.
  // This handles conjugated forms (TAKES→TAKE, LEARNING→LEARN, PLAYED→PLAY).
  function lemmatizeVerb(word) {
    if (verbSet.has(word)) return word;
    if (word.endsWith("S") && verbSet.has(word.slice(0, -1))) return word.slice(0, -1);
    if (word.endsWith("ES") && verbSet.has(word.slice(0, -2))) return word.slice(0, -2);
    if (word.endsWith("ING") && verbSet.has(word.slice(0, -3))) return word.slice(0, -3);
    if (word.endsWith("ING") && verbSet.has(word.slice(0, -3) + "E")) return word.slice(0, -3) + "E";
    if (word.endsWith("ED") && verbSet.has(word.slice(0, -2))) return word.slice(0, -2);
    if (word.endsWith("ED") && verbSet.has(word.slice(0, -1))) return word.slice(0, -1);
    return null;
  }

  const words = text
    .replace(/[^\w\sঀ-৿]/g, "")  // preserve Bangla Unicode block
    .split(/\s+/)
    .filter((w) => w && (/[ঀ-৿]/.test(w) || !stopWords.has(w.toLowerCase())))
    .map((w) => w.toUpperCase())
    .slice(0, 10);

  // Heuristic SOV reorder: normalize verbs to base form, then move to end.
  const lemmatized = words.map((w) => lemmatizeVerb(w) || w);
  const verbs = lemmatized.filter((w) => verbSet.has(w));
  const nonVerbs = lemmatized.filter((w) => !verbSet.has(w));
  // wrapUnsignable only catches raw non-Latin script; enforceSignability then checks every
  // remaining bare word against the real vocabulary. Without this second pass, a heuristic
  // (Groq-unavailable/rate-limited) word outside the dictionary rendered as a silent idle
  // pause with no explanation card — the exact failure mode this pipeline exists to prevent
  // on the Groq path. Both paths must give the same guarantee.
  const ordered = enforceSignability([...nonVerbs, ...verbs].map(wrapUnsignable));

  return { gloss: ordered.join(" "), words: ordered, confidence: 0.5 };
}

// Collects all [CONCEPT:X] words from batch results and fetches brief definitions
// in a single Groq call. Returns { WORD: "definition string" }.
async function enrichConceptCards(results) {
  if (!groq) return {};

  const conceptWords = new Set();
  for (const result of results) {
    for (const word of (result.words || [])) {
      const s = String(word || "").trim().toUpperCase();
      const match = s.match(/^\[CONCEPT:(.+)\]$/);
      if (match) {
        const cw = match[1].replace(/[^A-Za-z\s]/g, "").toUpperCase().trim();
        if (cw) conceptWords.add(cw);
      }
    }
  }
  if (!conceptWords.size) return {};

  const wordList = [...conceptWords];
  const numbered = wordList.map((w, i) => `${i + 1}. ${w}`).join("\n");

  try {
    const response = await withRetry(
      () =>
        groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Give a 5-10 word plain-language definition for each word, suitable for a secondary-school student. " +
                'Return JSON only: {"definitions":["def1","def2"]}',
            },
            { role: "user", content: numbered },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
          max_tokens: Math.min(600, wordList.length * 35),
        }),
      `concept cards for ${wordList.length} words`,
      { maxRetries: 0 }
    );
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const defs = parsed.definitions || [];
    const explanations = {};
    wordList.forEach((word, i) => {
      if (defs[i]) explanations[word] = String(defs[i]).slice(0, 70);
    });
    return explanations;
  } catch (err) {
    console.error("Groq concept card enrichment error:", err.message);
    return {};
  }
}

// ---------------------------------------------------------------------------
// WhisperX word-level timestamps (Phase B2)
// ---------------------------------------------------------------------------

/**
 * Fetch word-level timestamps from the NLP microservice.
 * Runs in parallel with the Groq gloss pipeline during batch processing.
 *
 * Returns an array of { word, startMs, endMs, score } sorted by startMs,
 * or null if the NLP service is unavailable or the request fails.
 * Null return is safe — the frontend falls back to syllable timing.
 *
 * @param {string} videoId
 * @returns {Promise<Array|null>}
 */
async function fetchWordTimestamps(videoId) {
  const NLP_URL = process.env.NLP_SERVICE_URL;
  if (!NLP_URL) return null;

  try {
    const controller = new AbortController();
    // WhisperX can take up to 2 minutes on CPU for a 10-minute video.
    const timeout = setTimeout(() => controller.abort(), 180_000);
    const res = await fetch(`${NLP_URL}/nlp/timestamps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[timestamps] NLP service returned ${res.status} for ${videoId}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data.words) && data.words.length > 0 ? data.words : null;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.warn(`[timestamps] fetch failed for ${videoId}: ${err.message}`);
    }
    return null;
  }
}

/**
 * Slice all spoken words that fall within a single caption's time window.
 * Returns null when there are fewer than 2 words (not enough for meaningful improvement).
 *
 * @param {Array} allWords  - full video word list from WhisperX
 * @param {{ start: number, end: number }} caption  - start/end in ms
 * @returns {Array|null}
 */
function alignTimestampsToCaption(allWords, caption) {
  if (!allWords?.length) return null;
  const words = allWords.filter(
    (w) => w.startMs >= caption.start && w.startMs < caption.end
  );
  return words.length >= 2 ? words : null;
}

// POST /api/sign/translate — single caption
router.post("/translate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    const result = await textToSignGloss(text);
    res.json({ ...result, model: groq ? GROQ_MODEL : "fallback" });
  } catch (err) {
    console.error("Sign translate error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

// POST /api/sign/timestamps — WhisperX word-level timing for cached captions.
// Cached videos skip /batch, so expose the same timestamp enrichment path separately.
router.post("/timestamps", async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "videoId is required" });
    const words = await fetchWordTimestamps(videoId);
    res.json({
      videoId,
      words: words || [],
      source: words?.length ? "whisperx" : "caption-timing-fallback",
    });
  } catch (err) {
    console.error("Timestamp extraction error:", err);
    res.status(500).json({ error: "Timestamp extraction failed" });
  }
});

// POST /api/sign/batch — translate multiple captions at once.
// Optional body field `videoId` — when provided, results are written to both
// the hot Map cache and the file cache so future requests skip re-processing.
router.post("/batch", async (req, res) => {
  try {
    const { captions, videoId } = req.body;
    if (!captions || !Array.isArray(captions)) {
      return res.status(400).json({ error: "captions array is required" });
    }

    if (captions.length === 0) {
      return res.json({ results: [], count: 0, model: groq ? GROQ_MODEL : "fallback" });
    }

    if (shouldUseHeuristicPipeline(captions)) {
      const results = captions.map((caption) => ({
        ...caption,
        simplified: caption.text,
        ...simpleGloss(caption.text),
      }));

      if (req.app.locals.recordVocabularyGaps) {
        req.app.locals.recordVocabularyGaps(results);
      }
      if (videoId && req.app.locals.videoCache) {
        req.app.locals.videoCache.set(videoId, results);
      }
      if (videoId && req.app.locals.writeFileCache) {
        req.app.locals.writeFileCache(videoId, results);
      }

      return res.json({
        results,
        count: results.length,
        model: groq ? `${GROQ_MODEL}-heuristic-fallback` : "fallback",
      });
    }

    const batchSize = Math.max(1, Number(process.env.GROQ_BATCH_SIZE || 5));

    // Kick off WhisperX timestamp extraction in parallel with Groq processing.
    // This runs concurrently — on a 10-minute video it takes ~60-90s (CPU),
    // which overlaps with the Groq simplify + gloss pipeline.
    // If NLP_SERVICE_URL is unset or the call fails, timestampsPromise resolves null
    // and the frontend gracefully falls back to syllable-weighted timing.
    const timestampsPromise = videoId ? fetchWordTimestamps(videoId) : Promise.resolve(null);

    // Simplify and gloss every caption. Each chunk is one Groq call producing both fields,
    // and chunks run GROQ_CONCURRENCY-at-a-time instead of strictly one after another.
    // Was: 2 sequential passes over every chunk (a 200-caption video meant 40 serial calls).
    const chunks = [];
    for (let i = 0; i < captions.length; i += batchSize) {
      chunks.push(captions.slice(i, i + batchSize));
    }
    const processed = await mapWithConcurrency(chunks, GROQ_CONCURRENCY, (chunk) =>
      simplifyAndGlossBatch(chunk)
    );

    // Re-join in caption order — mapWithConcurrency preserves chunk order, so a flat
    // concat lines up 1:1 with the input captions.
    const results = chunks.flatMap((chunk, chunkIndex) =>
      chunk.map((caption, i) => ({ ...caption, ...processed[chunkIndex][i] }))
    );

    // Attach WhisperX word-level timestamps to each caption (Phase B2).
    // spokenTimings gives the frontend accurate speech boundaries so word windows
    // are distributed over actual speech time, not caption metadata time.
    const allSpokenWords = await timestampsPromise;
    if (allSpokenWords) {
      for (const result of results) {
        const spoken = alignTimestampsToCaption(allSpokenWords, result);
        if (spoken) result.spokenTimings = spoken;
      }
    }

    // Record vocabulary gaps for Phase C gap tracking.
    if (req.app.locals.recordVocabularyGaps) {
      req.app.locals.recordVocabularyGaps(results);
    }

    // Enrich concept cards: one Groq call for all [CONCEPT:X] words found in results.
    // Attaches conceptExplanations: { WORD: "plain-language definition" } to each caption.
    const conceptExplanations = await enrichConceptCards(results);
    if (Object.keys(conceptExplanations).length > 0) {
      for (const result of results) {
        const captionConcepts = {};
        for (const word of (result.words || [])) {
          const s = String(word || "").trim().toUpperCase();
          const match = s.match(/^\[CONCEPT:(.+)\]$/);
          if (match) {
            const cw = match[1].replace(/[^A-Za-z\s]/g, "").toUpperCase().trim();
            if (cw && conceptExplanations[cw]) captionConcepts[cw] = conceptExplanations[cw];
          }
        }
        if (Object.keys(captionConcepts).length > 0) {
          result.conceptExplanations = captionConcepts;
        }
      }
    }

    // Persist to file cache when caller supplies a videoId.
    // Also promotes to the hot (Map) layer so the same request cycle hits memory.
    if (videoId && req.app.locals.videoCache) {
      req.app.locals.videoCache.set(videoId, results);
    }
    if (videoId && req.app.locals.writeFileCache) {
      req.app.locals.writeFileCache(videoId, results);
    }

    res.json({ results, count: results.length, model: groq ? GROQ_MODEL : "fallback" });
  } catch (err) {
    console.error("Batch translate error:", err);
    res.status(500).json({ error: "Batch translation failed" });
  }
});

module.exports = router;
// Exported for unit tests only
module.exports._test = {
  simpleGloss, buildGlossPrompt, normalizeGloss, glossResult, detectBangla,
  mapWithConcurrency, parseBatchResponse, retryableStatus, SIGN_VOCAB,
};
