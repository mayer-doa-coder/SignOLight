// Deterministic safety net that guarantees every glossed word is something the avatar can
// either sign or explain — never a silent, unexplained pause.
//
// The LLM is told the avatar's vocabulary, but it does not obey perfectly: live output leaks
// prepositions it should have dropped ("...LEARN FROM DATA") and content words with no sign
// ("BACKPROPAGATION", "ADJUST"). A leaked function word looks like a stutter; a leaked content
// word renders as an idle pause with no caption card, because concept cards are only generated
// for [CONCEPT:x]-tagged words. This pass runs after the LLM and fixes both, deterministically:
//   - leaked function words are dropped
//   - unsignable content words are wrapped as [CONCEPT:x] so they get an explanation card
//
// Signability mirrors the frontend's getSignInfo: a word counts as signable if it is in the
// dictionary directly or via lemmatizeForDictionary. backend/__tests__/signability.test.js
// checks this lemmatizer against the live SignAvatar.js source so the two cannot drift apart.

const { signable } = require("../data/sign-vocabulary.json");
const SIGNABLE = new Set(signable);

// Function words that carry no ASL sign and should never survive glossing. If the LLM leaks
// one as a plain token (it sometimes keeps "FROM", "THE", "IS"), drop it rather than pause on it.
const DROP_WORDS = new Set([
  "A", "AN", "THE",
  "IS", "ARE", "WAS", "WERE", "BE", "BEEN", "BEING", "AM",
  "HAS", "HAVE", "HAD", "WILL", "SHALL", "WOULD",
  "OF", "TO", "IN", "ON", "AT", "FROM", "WITH", "BY", "AS",
  "THAT", "THIS", "THESE", "THOSE",
  // Generic filler with no distinct ASL sign — real interpreters drop these rather than
  // inventing a gesture, so treat them the same way instead of pausing on a concept card.
  "YET", "ALREADY", "UNLESS", "NONE", "MATTERS", "FOREVER", "SOMETHING", "SOMEONE",
  "BASED", "CASUAL",
]);

/**
 * Port of lemmatizeForDictionary from frontend/src/components/SignAvatar.js. Returns the
 * signable dictionary key an inflected word maps to, or null. Kept byte-for-byte faithful to
 * the frontend rules — signability.test.js fails if the frontend version changes and this
 * doesn't. Only the lookup target differs (a Set here vs the SIGN_MOTIONS object there).
 */
function lemmatizeForDictionary(word) {
  const candidates = [];
  if (word.endsWith("IES")) candidates.push(word.slice(0, -3) + "Y");
  if (word.endsWith("TIONS")) candidates.push(word.slice(0, -5) + "TE");
  if (word.endsWith("TION")) candidates.push(word.slice(0, -4) + "TE");
  if (word.endsWith("IONS")) candidates.push(word.slice(0, -4));
  if (word.endsWith("ION")) candidates.push(word.slice(0, -3));
  if (word.endsWith("ES")) candidates.push(word.slice(0, -2));
  if (word.endsWith("S") && word.length > 3) candidates.push(word.slice(0, -1));
  if (word.endsWith("ING")) {
    candidates.push(word.slice(0, -3));
    candidates.push(word.slice(0, -3) + "E");
    const stem = word.slice(0, -3);
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) candidates.push(stem.slice(0, -1));
  }
  if (word.endsWith("ED")) {
    candidates.push(word.slice(0, -2));
    candidates.push(word.slice(0, -1));
    const stem = word.slice(0, -2);
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) candidates.push(stem.slice(0, -1));
  }
  if (word.endsWith("LY")) candidates.push(word.slice(0, -2));
  if (word.endsWith("ER") && word.length > 3) {
    candidates.push(word.slice(0, -2));
    candidates.push(word.slice(0, -1));
    const s = word.slice(0, -2);
    if (s.length > 1 && s[s.length - 1] === s[s.length - 2]) candidates.push(s.slice(0, -1));
  }
  if (word.endsWith("EST") && word.length > 4) {
    candidates.push(word.slice(0, -3));
    candidates.push(word.slice(0, -2));
  }
  for (const candidate of candidates) {
    if (SIGNABLE.has(candidate)) return candidate;
  }
  return null;
}

/** True if the avatar can render this bare word (directly or via an inflected form). */
function isSignable(word) {
  const u = String(word || "").replace(/[^A-Z]/g, "");
  if (!u) return false;
  return SIGNABLE.has(u) || lemmatizeForDictionary(u) !== null;
}

/**
 * Enforces that every token in a gloss word array is renderable. Already-bracketed tokens
 * ([FINGERSPELL:x], [CONCEPT:x], [NUMBER:x]) pass through untouched. Bare words are kept if
 * signable, dropped if a function word, else wrapped as [CONCEPT:word] so the caption layer
 * can attach an explanation instead of the avatar pausing silently.
 *
 * @param {string[]} words
 * @returns {string[]}
 */
function enforceSignability(words) {
  const out = [];
  for (const raw of words || []) {
    const w = String(raw || "").trim();
    if (!w) continue;
    if (w.startsWith("[")) { out.push(w); continue; } // already tagged
    const upper = w.toUpperCase();
    const bare = upper.replace(/[^A-Z]/g, "");
    if (!bare) continue;
    if (isSignable(bare)) { out.push(upper); continue; }
    if (DROP_WORDS.has(bare)) continue; // leaked function word — drop, don't pause
    out.push(`[CONCEPT:${bare.toLowerCase()}]`); // unknown content word — make it explainable
  }
  return out;
}

module.exports = { enforceSignability, isSignable, lemmatizeForDictionary, DROP_WORDS, SIGNABLE };
