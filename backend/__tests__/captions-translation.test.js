const captionsRoute = require("../routes/captions");

const {
  chooseCaptionTrack,
  containsBangla,
  makeTranslationChunks,
  parseCaptions,
} = captionsRoute._test;

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

  it("parses the timed XML returned by the Android InnerTube caption URL", () => {
    const xml = `<?xml version="1.0" encoding="utf-8" ?>
      <timedtext format="3"><body>
        <p t="1140" d="2836">First &amp; second line</p>
        <p t="3976" d="3164">Another caption</p>
      </body></timedtext>`;

    expect(parseCaptions(xml)).toEqual([
      { start: 1140, end: 3976, text: "First & second line" },
      { start: 3976, end: 7140, text: "Another caption" },
    ]);
  });

  it("selects English from multilingual InnerTube tracks", () => {
    const selected = chooseCaptionTrack([
      { languageCode: "ar", baseUrl: "arabic" },
      { languageCode: "en", baseUrl: "english", kind: "asr" },
      { languageCode: "bn", baseUrl: "bangla" },
    ]);

    expect(selected.baseUrl).toBe("english");
  });
});
