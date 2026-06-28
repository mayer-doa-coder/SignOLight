const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// BdSL (Bangla Sign Language) gloss prompt.
// Grammar rules follow BdSL linguistic structure (SOV, topic-comment).
// Example pairs are grounded in Bangla-SGP dataset patterns
// (Islam et al., 2024 — arXiv:2511.08507, Appendix A sentence pairs).
// The 58-word vocabulary the avatar can actually sign.
// Included in the LLM prompt so the model prefers words it knows exist as signs.
const SIGN_VOCAB = [
  "HELLO", "THANK", "YOU", "ME", "YES", "NO", "LEARN", "KNOW", "UNDERSTAND",
  "GOOD", "BAD", "HELP", "PLEASE", "SORRY", "WHAT", "WHERE", "WHEN", "HOW",
  "WHY", "BECAUSE", "SIGN", "BDSL",
  "NETWORK", "NEURON", "LAYER", "TRAIN", "MODEL", "WEIGHT", "GRADIENT", "LOSS",
  "FUNCTION", "ACTIVATE", "DATA", "INPUT", "OUTPUT", "ERROR", "PREDICT",
  "CALCULATE", "MATRIX", "VECTOR", "PATTERN", "IMAGE", "CLASSIFY", "ACCURACY",
  "PROBABILITY", "DEEP", "CONNECT", "NODE", "SIGNAL", "PIXEL", "EXAMPLE",
  "PROCESS", "STEP", "RESULT", "PROBLEM", "SOLUTION", "COMPUTER", "PROGRAM",
].join(" ");

function buildGlossPrompt(text) {
  return `Convert this English caption to BdSL (Bangla Sign Language) gloss notation.

AVAILABLE BdSL SIGNS — prefer words from this list when meaning is preserved:
${SIGN_VOCAB}

BdSL GRAMMAR RULES — mandatory, not optional:
- Topic-comment structure: state the topic FIRST, then what is said about it
- SOV word order: Subject → Object → Verb (NOT English SVO)
- Remove ALL articles (a, an, the) — no exceptions
- Remove ALL auxiliary verbs (is, are, was, were, has, have, will) unless negated
- Remove ALL prepositions (in, on, at, to, of, from) unless meaning changes entirely
- WH-words (WHAT, WHERE, WHEN, HOW, WHY) appear at the END of the gloss (BdSL-final)
- Negation: place NOT or CANNOT at the END of the gloss
- Capitalize every word
- Maximum 8 words per gloss
- Use BASE FORM of all verbs: write TAKE not TAKES, LEARN not LEARNS, GO not WENT/GOES
- Drop filler pronouns "it"/"this"/"that" when they do not refer to a specific thing (e.g. "takes it all" → ALL TAKE, not IT ALL TAKE)
- For proper nouns, names, places, abbreviations → [FINGERSPELL:WORD]
- For concepts with no available sign → [CONCEPT:word]
- Use [NUMBER:X] for all digits

BdSL EXAMPLES — source: Bangla-SGP dataset (arXiv:2511.08507):
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

Reply ONLY with the gloss — no explanation, no punctuation.`;
}

function normalizeGloss(gloss) {
  return String(gloss || "")
    .replace(/^["']|["']$/g, "")
    .replace(/^BdSL\s+GLOSS:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function glossResult(gloss, fallbackText, confidence) {
  const cleaned = normalizeGloss(gloss);
  if (!cleaned) return simpleGloss(fallbackText);

  const words = cleaned.split(/\s+/).slice(0, 10);
  return { gloss: words.join(" "), words, confidence: confidence ?? 0.9 };
}

// Single-caption BdSL gloss via Groq.
async function textToSignGloss(text) {
  if (!groq) {
    return simpleGloss(text);
  }

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You convert English captions into concise BdSL (Bangla Sign Language) gloss for a sign language avatar. BdSL uses topic-comment SOV structure — not English word order.",
        },
        { role: "user", content: buildGlossPrompt(text) },
      ],
      temperature: 0,
      max_tokens: 80,
    });

    return glossResult(response.choices[0]?.message?.content, text, 0.9);
  } catch (err) {
    console.error("Groq API error:", err.message);
    return simpleGloss(text);
  }
}

// Simplify academic English to secondary-school reading level.
// This is the "educational scaffolding" step: captions → simplified → gloss.
// Returns the original text unchanged if Groq is unavailable.
async function simplifyBatch(captions) {
  if (!groq) {
    return captions.map((cap) => cap.text);
  }

  const numbered = captions
    .map((cap, i) => `${i + 1}. ${cap.text.replace(/\s+/g, " ")}`)
    .join("\n");

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Simplify academic English sentences to secondary-school reading level. " +
            "Keep technical terms (they will be signed). Remove jargon and long phrases. " +
            "Make sentences shorter and clearer. Return JSON only: {\"simplified\":[\"s1\",\"s2\"]}",
        },
        { role: "user", content: numbered },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: Math.min(800, captions.length * 80),
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    const list = parsed.simplified || [];
    return captions.map((cap, i) => list[i] || cap.text);
  } catch (err) {
    console.error("Groq simplify error:", err.message);
    return captions.map((cap) => cap.text);
  }
}

// Batch BdSL gloss — converts multiple captions in one Groq call.
async function batchTextToSignGloss(captions) {
  if (!groq) {
    return captions.map((caption) => simpleGloss(caption.text));
  }

  const numberedCaptions = captions
    .map((caption, index) => `${index + 1}. ${caption.text.replace(/\s+/g, " ")}`)
    .join("\n");

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You convert English captions into concise BdSL (Bangla Sign Language) gloss. BdSL uses topic-comment SOV structure — NOT English word order, NOT ASL conventions. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Convert each caption to BdSL gloss notation.

AVAILABLE BdSL SIGNS — prefer these words when meaning is preserved:
${SIGN_VOCAB}

MANDATORY BdSL RULES:
- Topic-comment structure: topic FIRST, verb LAST
- SOV word order (Subject → Object → Verb)
- Remove all articles (a, an, the) — always
- Remove auxiliary verbs (is, are, was, were) unless negated
- Use BASE FORM of all verbs: TAKE not TAKES, LEARN not LEARNS, GO not WENT/GOES
- Drop filler pronouns "it"/"this"/"that" when they refer to nothing specific
- Capitalize all words, max 8 words per gloss
- For proper nouns, names, abbreviations → [FINGERSPELL:WORD]
- For concepts with no available sign → [CONCEPT:word]
- Use [NUMBER:X] for digits

BdSL EXAMPLES:
"The neural network learns patterns"     → NETWORK PATTERN LEARN
"What does a compiler do?"               → [CONCEPT:compiler] WHAT DO
"I cannot understand this concept"       → EXAMPLE ME UNDERSTAND CANNOT
"The winner takes it all"                → WINNER ALL TAKE
"DNA carries genetic information"        → [FINGERSPELL:DNA] [CONCEPT:genetic] DATA CONNECT

Return JSON: {"glosses":["GLOSS ONE","GLOSS TWO"]}
The glosses array must have exactly ${captions.length} items.

Captions:
${numberedCaptions}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: Math.min(600, captions.length * 60),
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    const list =
      (Array.isArray(parsed) && parsed) ||
      parsed.glosses ||
      parsed.results ||
      parsed.translations ||
      parsed.captions ||
      [];

    if (!Array.isArray(list)) {
      throw new Error("Groq returned a non-array gloss list");
    }

    return captions.map((caption, index) => {
      const item = list[index];
      const gloss =
        typeof item === "string"
          ? item
          : item?.gloss || item?.bdsl_gloss || item?.translation || item?.text;
      return glossResult(gloss, caption.text, 0.9);
    });
  } catch (err) {
    console.error("Groq batch API error:", err.message);
    return captions.map((caption) => simpleGloss(caption.text));
  }
}

// Fallback simple gloss without AI — strips stop words, uppercases remaining,
// then applies a heuristic SOV reorder (verbs moved to end) to approximate BdSL
// word order even when Groq is unavailable.
// Confidence: 0.5 (lower — heuristic only, not validated BdSL grammar).
function simpleGloss(text) {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "to", "of", "from", "with", "and", "but", "or",
    "that", "this", "it", "its", "we", "they", "he", "she", "has", "have",
    "had", "will", "would", "could", "should", "may", "might", "do", "does",
  ]);
  // Known verbs to move toward the end (BdSL SOV: Subject Object Verb).
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
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w && !stopWords.has(w.toLowerCase()))
    .map((w) => w.toUpperCase())
    .slice(0, 10);

  // Heuristic SOV reorder: normalize verbs to base form, then move to end.
  const lemmatized = words.map((w) => lemmatizeVerb(w) || w);
  const verbs = lemmatized.filter((w) => verbSet.has(w));
  const nonVerbs = lemmatized.filter((w) => !verbSet.has(w));
  const ordered = [...nonVerbs, ...verbs];

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
    const response = await groq.chat.completions.create({
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
    });
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

// POST /api/sign/batch — translate multiple captions at once.
// Optional body field `videoId` — when provided, results are written to both
// the hot Map cache and the file cache so future requests skip re-processing.
router.post("/batch", async (req, res) => {
  try {
    const { captions, videoId } = req.body;
    if (!captions || !Array.isArray(captions)) {
      return res.status(400).json({ error: "captions array is required" });
    }

    const batchSize = Number(process.env.GROQ_BATCH_SIZE || 10);
    const results = [];

    // Step 1: Simplify all captions (educational scaffolding layer).
    // Run simplification in batches to match gloss batch size.
    const simplifiedTexts = [];
    for (let i = 0; i < captions.length; i += batchSize) {
      const batch = captions.slice(i, i + batchSize);
      const simplified = await simplifyBatch(batch);
      simplifiedTexts.push(...simplified);
    }

    // Step 2: Translate simplified text to BdSL gloss.
    for (let i = 0; i < captions.length; i += batchSize) {
      const batch = captions.slice(i, i + batchSize).map((cap, idx) => ({
        ...cap,
        textForGloss: simplifiedTexts[i + idx] || cap.text,
      }));
      const captionsForGloss = batch.map((cap) => ({
        ...cap,
        text: cap.textForGloss, // gloss pipeline reads cap.text
      }));
      const signs = await batchTextToSignGloss(captionsForGloss);
      const translated = batch.map((cap, index) => ({
        ...captions[i + index],
        simplified: simplifiedTexts[i + index] || captions[i + index].text,
        ...signs[index],
      }));
      results.push(...translated);
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
module.exports._test = { simpleGloss, buildGlossPrompt, normalizeGloss, glossResult };
