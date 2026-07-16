// Bangla manual alphabet shown in the reference chart supplied for the Finger Lab.
// Keep the labels as native Bangla characters; gesture ids are internal only.
export const BANGLA_ALPHABET = [
  { id: "BN_AW", label: "অ" },
  { id: "BN_AA", label: "আ" },
  { id: "BN_I", label: "ই" },
  { id: "BN_U", label: "উ" },
  { id: "BN_E", label: "এ" },
  { id: "BN_O", label: "ও" },
  { id: "BN_KA", label: "ক" },
  { id: "BN_KHA", label: "খ" },
  { id: "BN_GA", label: "গ" },
  { id: "BN_GHA", label: "ঘ" },
  { id: "BN_CA", label: "চ" },
  { id: "BN_CHA", label: "ছ" },
  { id: "BN_JA", label: "জ" },
  { id: "BN_JHA", label: "ঝ" },
  { id: "BN_TTA", label: "ট" },
  { id: "BN_TTHA", label: "ঠ" },
  { id: "BN_DDA", label: "ড" },
  { id: "BN_DDHA", label: "ঢ" },
  { id: "BN_TA", label: "ত" },
  { id: "BN_THA", label: "থ" },
  { id: "BN_DA", label: "দ" },
  { id: "BN_DHA", label: "ধ" },
  { id: "BN_NA", label: "ন" },
  { id: "BN_PA", label: "প" },
  { id: "BN_PHA", label: "ফ" },
  { id: "BN_BA", label: "ব" },
  { id: "BN_BHA", label: "ভ" },
  { id: "BN_MA", label: "ম" },
  { id: "BN_YA", label: "য" },
  { id: "BN_RA", label: "র" },
  { id: "BN_LA", label: "ল" },
  { id: "BN_SA", label: "স" },
  { id: "BN_HA", label: "হ" },
  { id: "BN_RRA", label: "ড়" },
  { id: "BN_ANUSVARA", label: "ং" },
  { id: "BN_VISARGA", label: "ঃ" },
];

const BANGLA_LABELS = Object.fromEntries(
  BANGLA_ALPHABET.map(({ id, label }) => [id, label])
);
const BANGLA_GESTURES = Object.fromEntries(
  BANGLA_ALPHABET.map(({ id, label }) => [label, id])
);

const BANGLA_CHARACTER_ALIASES = {
  "ঈ": "ই",
  "ঊ": "উ",
  "ঋ": "র",
  "ঐ": "এ",
  "ঔ": "ও",
  "া": "আ",
  "ি": "ই",
  "ী": "ই",
  "ু": "উ",
  "ূ": "উ",
  "ৃ": "র",
  "ে": "এ",
  "ৈ": "এ",
  "ো": "ও",
  "ৌ": "ও",
  "ঙ": "ং",
  "ঞ": "জ",
  "ণ": "ন",
  "শ": "স",
  "ষ": "স",
  "য়": "য",
  "ঁ": "ং",
};

const BANGLA_DIGITS = {
  "০": "NUM_0",
  "১": "NUM_1",
  "২": "NUM_2",
  "৩": "NUM_3",
  "৪": "NUM_4",
  "৫": "NUM_5",
  "৬": "NUM_6",
  "৭": "NUM_7",
  "৮": "NUM_8",
  "৯": "NUM_9",
};

export function isBanglaGesture(gesture) {
  return Object.prototype.hasOwnProperty.call(BANGLA_LABELS, gesture);
}

export function banglaGestureLabel(gesture) {
  return BANGLA_LABELS[gesture] || "";
}

export function isBanglaWordToken(word) {
  return /^\[BANGLA:(.+)\]$/u.test(String(word || "").trim());
}

export function banglaWordFromToken(word) {
  const match = String(word || "").trim().match(/^\[BANGLA:(.+)\]$/u);
  return match ? match[1] : "";
}

export function banglaWordToGestureUnits(word) {
  const rawWord = isBanglaWordToken(word) ? banglaWordFromToken(word) : String(word || "");
  const units = [];

  for (const character of rawWord.normalize("NFC")) {
    if (character === "্" || character === "়") continue;
    if (BANGLA_DIGITS[character]) {
      units.push({ label: character, gesture: BANGLA_DIGITS[character] });
      continue;
    }
    const normalized = BANGLA_CHARACTER_ALIASES[character] || character;
    const gesture = BANGLA_GESTURES[normalized];
    if (gesture) units.push({ label: character, gesture });
  }

  return units;
}

export function banglaTextToWordTokens(text) {
  return String(text || "")
    .normalize("NFC")
    .split(/\s+/u)
    .map((word) => word.replace(/[^\u0980-\u09FF]/gu, ""))
    .filter(Boolean)
    .map((word) => `[BANGLA:${word}]`);
}
