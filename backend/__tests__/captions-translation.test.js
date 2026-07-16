const captionsRoute = require("../routes/captions");

const { containsBangla, makeTranslationChunks } = captionsRoute._test;

describe("Bangla caption translation helpers", () => {
  it("distinguishes real Bangla output from an English fallback", () => {
    expect(containsBangla("যখন তুমি লোহার পেরেক মারবে")).toBe(true);
    expect(containsBangla("when you hammer the iron nail")).toBe(false);
  });

  it("keeps every caption while limiting free-translation request size", () => {
    const captions = Array.from(
      { length: 25 },
      (_, index) => `Caption ${index} ${"x".repeat(120)}`
    );
    const chunks = makeTranslationChunks(captions, 12, 800);

    expect(chunks.flat()).toEqual(captions);
    expect(chunks.every((chunk) => chunk.length <= 12)).toBe(true);
    expect(
      chunks.every((chunk) => chunk.join("\n").length <= 800)
    ).toBe(true);
  });
});
