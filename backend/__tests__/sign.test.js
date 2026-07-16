// Run: npx jest backend/__tests__/sign.test.js
// (install jest first: npm install --save-dev jest)
const { simpleGloss, buildGlossPrompt, normalizeGloss } =
  require("../routes/sign")._test;

// ---------------------------------------------------------------------------
// simpleGloss — stop-word stripping fallback (confidence 0.5)
// ---------------------------------------------------------------------------

describe("simpleGloss", () => {
  it("removes articles", () => {
    const result = simpleGloss("the cat sat on a mat");
    expect(result.gloss).not.toMatch(/\bTHE\b/);
    expect(result.gloss).not.toMatch(/\bA\b/);
  });

  it("removes common auxiliary verbs and lemmatizes the main verb", () => {
    const result = simpleGloss("the network is learning fast");
    expect(result.gloss).not.toMatch(/\bIS\b/);
    // "LEARNING" → lemmatized to "LEARN" (verb, moved to end via SOV)
    expect(result.gloss).toMatch(/\bLEARN\b/);
    expect(result.gloss.trim().endsWith("LEARN")).toBe(true);
  });

  it("removes prepositions", () => {
    const result = simpleGloss("data flows from input to output");
    expect(result.gloss).not.toMatch(/\bFROM\b/);
    expect(result.gloss).not.toMatch(/\bTO\b/);
  });

  it("uppercases all words", () => {
    const result = simpleGloss("neural network trains on data");
    expect(result.gloss).toBe(result.gloss.toUpperCase());
  });

  it("returns confidence 0.5", () => {
    const result = simpleGloss("hello world");
    expect(result.confidence).toBe(0.5);
  });

  it("caps output at 10 words", () => {
    const long = "one two three four five six seven eight nine ten eleven twelve";
    const result = simpleGloss(long);
    expect(result.words.length).toBeLessThanOrEqual(10);
  });

  it("handles empty string without crashing", () => {
    const result = simpleGloss("");
    expect(result.gloss).toBe("");
    expect(result.confidence).toBe(0.5);
  });

  it("returns gloss and words array in sync", () => {
    const result = simpleGloss("the compiler converts source code");
    expect(result.words.join(" ")).toBe(result.gloss);
  });
});

// ---------------------------------------------------------------------------
// simpleGloss — verb lemmatization (inflected → base form, SOV)
// ---------------------------------------------------------------------------

describe("simpleGloss verb lemmatization", () => {
  it("lemmatizes TAKES → TAKE and moves to end (SOV)", () => {
    const { gloss } = simpleGloss("the winner takes it all");
    expect(gloss.trim().endsWith("TAKE")).toBe(true);
    expect(gloss).toMatch(/WINNER/);
    expect(gloss).toMatch(/ALL/);
    expect(gloss).not.toMatch(/\bIT\b/);     // "it" is a stop word
    expect(gloss).not.toMatch(/\bTHE\b/);   // "the" is a stop word
    expect(gloss).not.toMatch(/\bTAKES\b/); // base form only in output
  });

  it("lemmatizes LEARNS → LEARN and moves to end", () => {
    const { gloss } = simpleGloss("the student learns quickly");
    expect(gloss.trim().endsWith("LEARN")).toBe(true);
    expect(gloss).not.toMatch(/\bLEARNS\b/);
  });

  it("lemmatizes PLAYING → PLAY and moves to end", () => {
    const { gloss } = simpleGloss("the team is playing well");
    expect(gloss.trim().endsWith("PLAY")).toBe(true);
    expect(gloss).not.toMatch(/\bPLAYING\b/);
  });

  it("lemmatizes WATCHED → WATCH and moves to end", () => {
    const { gloss } = simpleGloss("she watched every episode");
    expect(gloss.trim().endsWith("WATCH")).toBe(true);
    expect(gloss).not.toMatch(/\bWATCHED\b/);
  });

  it("does not disturb non-verb words ending in S (PATTERNS, etc.)", () => {
    const { gloss } = simpleGloss("the network learns patterns");
    expect(gloss).toMatch(/PATTERNS?/);  // PATTERN or PATTERNS accepted (not a verb)
    expect(gloss.trim().endsWith("LEARN")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildGlossPrompt — BdSL grammar rules + Bangla-SGP examples
// ---------------------------------------------------------------------------

describe("buildGlossPrompt", () => {
  it("contains the input text", () => {
    const prompt = buildGlossPrompt("The student is learning mathematics");
    expect(prompt).toContain("The student is learning mathematics");
  });

  // Was "mentions SOV word order". SOV is BdSL's rule; this pipeline targets ASL, whose
  // signature ordering is topic-comment with WH-words final (asserted below and in the
  // "mentions topic-comment structure" case).
  it("mentions WH-final word order (ASL-specific rule)", () => {
    const prompt = buildGlossPrompt("any text");
    expect(prompt.toLowerCase()).toMatch(/wh.{0,30}end/);
  });

  it("mentions topic-comment structure", () => {
    const prompt = buildGlossPrompt("any text");
    expect(prompt.toLowerCase()).toContain("topic-comment");
  });

  it("includes at least one BdSL example pair", () => {
    const prompt = buildGlossPrompt("any text");
    // Should contain at least one → gloss example
    expect(prompt).toMatch(/→\s*[A-Z]+/);
  });

  it("instructs to remove articles", () => {
    const prompt = buildGlossPrompt("any text");
    expect(prompt.toLowerCase()).toMatch(/article|a, an, the/);
  });

  // Inverted from "does not mention ASL (wrong language)". That assertion dates from when
  // this pipeline targeted BdSL; it now targets ASL, so naming ASL is the correct behaviour.
  it("targets ASL", () => {
    const prompt = buildGlossPrompt("any text");
    expect(prompt).toMatch(/\bASL\b/);
  });

  it("offers the LLM the avatar's full signable vocabulary", () => {
    // Any word absent from the prompt's vocabulary list gets glossed as [CONCEPT:x], which
    // the avatar renders as a silent pause. The list is generated from SIGN_MOTIONS, so the
    // prompt must carry every signable word — this catches a prompt that stops embedding it.
    const prompt = buildGlossPrompt("any text");
    const vocabulary = require("../data/sign-vocabulary.json").vocabulary;
    const missing = vocabulary.filter((word) => !prompt.includes(word));
    expect(missing).toEqual([]);
    expect(vocabulary.length).toBeGreaterThan(300);
  });
});

// ---------------------------------------------------------------------------
// normalizeGloss — post-processing AI output
// ---------------------------------------------------------------------------

describe("normalizeGloss", () => {
  it("strips leading BdSL GLOSS: prefix", () => {
    expect(normalizeGloss("BdSL GLOSS: NEURAL NETWORK LEARN")).toBe("NEURAL NETWORK LEARN");
  });

  it("strips surrounding quotes", () => {
    expect(normalizeGloss('"STUDENT MATHEMATICS LEARN"')).toBe("STUDENT MATHEMATICS LEARN");
  });

  it("uppercases output", () => {
    expect(normalizeGloss("neural network")).toBe("NEURAL NETWORK");
  });

  it("collapses multiple whitespace", () => {
    expect(normalizeGloss("NEURAL   NETWORK   LEARN")).toBe("NEURAL NETWORK LEARN");
  });

  it("handles null/undefined gracefully", () => {
    expect(normalizeGloss(null)).toBe("");
    expect(normalizeGloss(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Bangla code-switching — Phase B1
// ---------------------------------------------------------------------------

const { detectBangla } = require("../routes/sign")._test;

describe("Bangla code-switching", () => {
  it("detectBangla returns true for pure Bangla text", () => {
    expect(detectBangla("শিক্ষক বললেন")).toBe(true);
  });

  it("detectBangla returns true for mixed Bangla-English text", () => {
    expect(detectBangla("neural network টা শিখছে")).toBe(true);
  });

  it("detectBangla returns false for English-only text", () => {
    expect(detectBangla("The network learns patterns")).toBe(false);
  });

  it("detectBangla returns false for empty or null input", () => {
    expect(detectBangla("")).toBe(false);
    expect(detectBangla(null)).toBe(false);
  });

  it("buildGlossPrompt includes code-switching instructions when Bangla is detected", () => {
    const prompt = buildGlossPrompt("শিক্ষক বললেন neural network");
    expect(prompt).toMatch(/MIXED BANGLA-ENGLISH/i);
    expect(prompt).toMatch(/SIGN_VOCAB/i);
  });

  it("simpleGloss preserves Bangla tokens instead of stripping them as stop words", () => {
    const result = simpleGloss("শিক্ষক neural network শিখছে");
    expect(result.gloss).toContain("শিক্ষক");
  });
});
