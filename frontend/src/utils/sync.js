// Binary search for caption at timeMs. Captions must be sorted by start time (API guarantee).
// Returns the caption whose [start, end] range contains timeMs, or null if in a gap.
export function findCaption(captions, timeMs) {
  let lo = 0;
  let hi = captions.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (captions[mid].end < timeMs) {
      lo = mid + 1;
    } else if (captions[mid].start > timeMs) {
      hi = mid - 1;
    } else {
      return captions[mid];
    }
  }
  return null;
}

const WH_WORDS = new Set(["WHAT", "WHERE", "WHEN", "HOW", "WHY"]);
const NEG_WORDS = new Set(["NO", "NOT", "NEVER", "CANNOT", "CANT", "NOTHING", "NONE"]);

// Derive ASL Non-Manual Marker from gloss words and original sentence text.
//
// Returns a structured NMM descriptor:
//   { type, wordIndex, headY }
//
// type     — "wh-question" | "yn-question" | "negation" | "neutral"
// wordIndex — index of the triggering word in the gloss array
//             (-1 for neutral; 0 for YN-questions that apply from sentence start)
//             NMM should only activate once the avatar reaches this word.
// headY    — head rotation Y amplitude for head-shake (negation only); 0 otherwise.
//
// ASL grammar rules:
//   WH-questions: furrow brows from the WH-word onset
//   YN-questions: raise brows from the start of the sentence
//   Negation: head-shake + firm expression from the NEG-word onset
export function computeNMM(gloss, originalText) {
  const words = (gloss || "").toUpperCase().split(/\s+/).filter(Boolean);

  const whIdx = words.findIndex((w) => WH_WORDS.has(w));
  if (whIdx >= 0) return { type: "wh-question", wordIndex: whIdx, headY: 0 };

  if ((originalText || "").trim().endsWith("?")) {
    return { type: "yn-question", wordIndex: 0, headY: 0 };
  }

  const negIdx = words.findIndex((w) => NEG_WORDS.has(w));
  if (negIdx >= 0) return { type: "negation", wordIndex: negIdx, headY: 0.22 };

  return { type: "neutral", wordIndex: -1, headY: 0 };
}
