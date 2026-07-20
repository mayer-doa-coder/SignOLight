import {
  attachSpokenTimings,
  captionSigningUnitMs,
  recommendedPlaybackRate,
} from "../services/playbackPacing";

describe("readable cached-video pacing", () => {
  it("counts fingerspelled characters as separate visible signing units", () => {
    expect(
      captionSigningUnitMs({
        start: 0,
        end: 5000,
        words: ["HELLO", "[CONCEPT:iron]"],
      })
    ).toBe(1000);
  });

  it("selects a slower real video rate for dense cached captions", () => {
    const captions = [
      { start: 0, end: 2000, words: ["YOU", "FORCE", "[CONCEPT:iron]"] },
      { start: 2000, end: 4000, words: ["AREA", "PRESSURE", "APPLY"] },
    ];
    expect(recommendedPlaybackRate(captions)).toBeLessThan(1);
  });

  it("attaches WhisperX words to matching cached caption windows", () => {
    const captions = [{ start: 0, end: 2000, words: ["HELLO"] }];
    const enriched = attachSpokenTimings(captions, [
      { word: "HELLO", startMs: 200, endMs: 700 },
      { word: "THERE", startMs: 710, endMs: 1100 },
    ]);
    expect(enriched[0].spokenTimings).toHaveLength(2);
  });
});
