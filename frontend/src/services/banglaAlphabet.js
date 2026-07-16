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

export function isBanglaGesture(gesture) {
  return Object.prototype.hasOwnProperty.call(BANGLA_LABELS, gesture);
}

export function banglaGestureLabel(gesture) {
  return BANGLA_LABELS[gesture] || "";
}
