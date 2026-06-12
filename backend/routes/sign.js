const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

function buildGlossPrompt(text) {
  return `Convert this English caption to ASL gloss notation.

Rules:
- Remove articles (a, an, the) unless essential
- Use topic-comment structure where natural
- Capitalize all words
- Keep it concise, max 8 words
- Use [FINGERSPELL:X] for proper nouns
- Use [NUMBER:X] for numbers
- Separate with spaces only

Input: "${text}"

Reply ONLY with the gloss.`;
}

function normalizeGloss(gloss) {
  return String(gloss || "")
    .replace(/^["']|["']$/g, "")
    .replace(/^ASL\s+GLOSS:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function glossResult(gloss, fallbackText) {
  const cleaned = normalizeGloss(gloss);
  if (!cleaned) return simpleGloss(fallbackText);

  const words = cleaned.split(/\s+/).slice(0, 10);
  return { gloss: words.join(" "), words };
}

// Map text to sign language glosses (simplified ASL gloss notation).
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
            "You convert English captions into concise ASL gloss for a sign language avatar.",
        },
        { role: "user", content: buildGlossPrompt(text) },
      ],
      temperature: 0,
      max_tokens: 80,
    });

    return glossResult(response.choices[0]?.message?.content, text);
  } catch (err) {
    console.error("Groq API error:", err.message);
    return simpleGloss(text);
  }
}

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
            "You convert English captions into concise ASL gloss. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Convert each caption to ASL gloss.

Rules:
- Return JSON only, with this shape: {"glosses":["GLOSS ONE","GLOSS TWO"]}
- The glosses array must have exactly ${captions.length} items
- Remove articles unless essential
- Capitalize all words
- Max 8 words per gloss
- Use [FINGERSPELL:X] for proper nouns
- Use [NUMBER:X] for numbers

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
          : item?.gloss || item?.asl_gloss || item?.translation || item?.text;
      return glossResult(gloss, caption.text);
    });
  } catch (err) {
    console.error("Groq batch API error:", err.message);
    return captions.map((caption) => simpleGloss(caption.text));
  }
}

// Fallback simple gloss without AI.
function simpleGloss(text) {
  const stopWords = new Set(["a", "an", "the", "is", "are", "was", "were", "be", "been", "being"]);
  const words = text
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w && !stopWords.has(w.toLowerCase()))
    .map((w) => w.toUpperCase())
    .slice(0, 10);

  return { gloss: words.join(" "), words };
}

// POST /api/sign/translate
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

// POST /api/sign/batch - translate multiple captions at once
router.post("/batch", async (req, res) => {
  try {
    const { captions } = req.body;
    if (!captions || !Array.isArray(captions)) {
      return res.status(400).json({ error: "captions array is required" });
    }

    // Translate in small chunks to stay friendly to Groq free-plan rate limits.
    const batchSize = Number(process.env.GROQ_BATCH_SIZE || 10);
    const results = [];

    for (let i = 0; i < captions.length; i += batchSize) {
      const batch = captions.slice(i, i + batchSize);
      const signs = await batchTextToSignGloss(batch);
      const translated = batch.map((cap, index) => ({ ...cap, ...signs[index] }));
      results.push(...translated);
    }

    res.json({ results, count: results.length, model: groq ? GROQ_MODEL : "fallback" });
  } catch (err) {
    console.error("Batch translate error:", err);
    res.status(500).json({ error: "Batch translation failed" });
  }
});

module.exports = router;
