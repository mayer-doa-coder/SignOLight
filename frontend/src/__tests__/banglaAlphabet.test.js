import {
  BANGLA_ALPHABET,
  banglaGestureLabel,
  banglaTextToWordTokens,
  banglaWordToGestureUnits,
  isBanglaGesture,
} from "../services/banglaAlphabet";

describe("Bangla manual alphabet", () => {
  it("keeps the supplied alphabet labels in Bangla script", () => {
    expect(BANGLA_ALPHABET).toHaveLength(36);
    expect(BANGLA_ALPHABET.slice(0, 6).map(({ label }) => label)).toEqual([
      "অ",
      "আ",
      "ই",
      "উ",
      "এ",
      "ও",
    ]);
    expect(BANGLA_ALPHABET.map(({ label }) => label)).toContain("ড়");
    expect(BANGLA_ALPHABET.map(({ label }) => label)).toContain("ং");
    expect(BANGLA_ALPHABET.map(({ label }) => label)).toContain("ঃ");
  });

  it("uses internal gesture ids without changing their displayed letters", () => {
    expect(isBanglaGesture("BN_KA")).toBe(true);
    expect(banglaGestureLabel("BN_KA")).toBe("ক");
    expect(banglaGestureLabel("BN_VISARGA")).toBe("ঃ");
    expect(isBanglaGesture("A")).toBe(false);
  });

  it("has a unique avatar gesture id for every Bangla label", () => {
    const ids = BANGLA_ALPHABET.map(({ id }) => id);
    const labels = BANGLA_ALPHABET.map(({ label }) => label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("uses only the front-view Bangla gesture namespace", () => {
    expect(BANGLA_ALPHABET.every(({ id }) => /^BN_[A-Z]+$/.test(id))).toBe(true);
  });

  it("converts translated Bangla words into chart-backed gesture units", () => {
    expect(banglaWordToGestureUnits("[BANGLA:আমার]").map(({ gesture }) => gesture)).toEqual([
      "BN_AA",
      "BN_MA",
      "BN_AA",
      "BN_RA",
    ]);
    expect(banglaTextToWordTokens("আমি একটি ছেলে")).toEqual([
      "[BANGLA:আমি]",
      "[BANGLA:একটি]",
      "[BANGLA:ছেলে]",
    ]);
  });
});
