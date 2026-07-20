import {
  computeWordTimings,
  resolveSignState,
  effectiveNMM,
  shouldAvatarAnimate,
  applySlowPlayback,
} from "../services/timelineScheduler";

// ---------------------------------------------------------------------------
// computeWordTimings
// ---------------------------------------------------------------------------

describe("computeWordTimings", () => {
  const caption = { start: 0, end: 3000, words: ["NETWORK", "DATA", "LEARN"] };

  it("returns one entry per word", () => {
    expect(computeWordTimings(caption)).toHaveLength(3);
  });

  it("windows span the full caption duration without gaps", () => {
    const timings = computeWordTimings(caption);
    expect(timings[0].startMs).toBe(0);
    expect(timings[timings.length - 1].endMs).toBeCloseTo(3000, 0);
  });

  it("each window start equals the previous end", () => {
    const timings = computeWordTimings(caption);
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].startMs).toBeCloseTo(timings[i - 1].endMs, 5);
    }
  });

  it("returns empty array for caption with no words", () => {
    expect(computeWordTimings({ start: 0, end: 1000, words: [] })).toHaveLength(0);
  });

  it("returns empty array for null caption", () => {
    expect(computeWordTimings(null)).toHaveLength(0);
  });

  it("gives unknown and Bangla words enough time for every character", () => {
    const timings = computeWordTimings({
      start: 0,
      end: 6000,
      words: ["HELLO", "[CONCEPT:iron]", "[BANGLA:আমার]"],
    });
    expect(timings[1].durationMs).toBeGreaterThan(timings[0].durationMs);
    expect(timings[2].word).toBe("[BANGLA:আমার]");
  });
});

// ---------------------------------------------------------------------------
// resolveSignState
// ---------------------------------------------------------------------------

describe("resolveSignState", () => {
  const caption = { start: 0, end: 3000, words: ["HELLO", "WORLD", "LEARN"] };

  it("returns isActive: false for null caption", () => {
    const result = resolveSignState(null, 1000);
    expect(result.isActive).toBe(false);
    expect(result.isCatchingUp).toBe(false);
  });

  it("finds the correct word at the start of its window", () => {
    const result = resolveSignState(caption, 50);
    expect(result.wordIndex).toBe(0);
    expect(result.wordProgress).toBeGreaterThanOrEqual(0);
    expect(result.isCatchingUp).toBe(false);
  });

  it("advances to next word as time progresses", () => {
    const timings = computeWordTimings(caption);
    const midSecond = timings[1].startMs + timings[1].durationMs * 0.1;
    const result = resolveSignState(caption, midSecond);
    expect(result.wordIndex).toBe(1);
    expect(result.isCatchingUp).toBe(false);
  });

  it("sets isCatchingUp when arriving past 65% of a word window", () => {
    const timings = computeWordTimings(caption);
    const lateInWord = timings[1].startMs + timings[1].durationMs * 0.8;
    const result = resolveSignState(caption, lateInWord);
    expect(result.wordIndex).toBe(1);
    expect(result.isCatchingUp).toBe(true);
  });

  it("does not set isCatchingUp when arriving early in a word window", () => {
    const timings = computeWordTimings(caption);
    const earlyInWord = timings[1].startMs + timings[1].durationMs * 0.2;
    const result = resolveSignState(caption, earlyInWord);
    expect(result.wordIndex).toBe(1);
    expect(result.isCatchingUp).toBe(false);
  });

  it("holds on last word past caption end without isCatchingUp", () => {
    const result = resolveSignState(caption, 5000);
    expect(result.wordIndex).toBe(2);
    expect(result.wordProgress).toBe(1);
    expect(result.isCatchingUp).toBe(false);
  });

  it("shows first word at progress 0 before speech span starts (spokenTimings silence edge case)", () => {
    // Caption spans 0–4000ms; speech starts at 500ms via spokenTimings.
    // Without the pre-first-word guard, t=100ms would fall to "Past last word" and show word 2.
    const cap = {
      start: 0, end: 4000,
      words: ["NETWORK", "DATA", "LEARN"],
      spokenTimings: [
        { word: "THE", startMs: 500, endMs: 750, score: 0.98 },
        { word: "NETWORK", startMs: 760, endMs: 1200, score: 0.95 },
      ],
    };
    const result = resolveSignState(cap, 100);
    expect(result.wordIndex).toBe(0);
    expect(result.wordProgress).toBe(0);
    expect(result.isActive).toBe(true);
    expect(result.isCatchingUp).toBe(false);
  });

  it("stretches timing windows when speedFactor < 1 (learning mode)", () => {
    const normal = resolveSignState(caption, 1500);
    const slow = resolveSignState(caption, 1500, 0.5);
    // At half speed, word windows are doubled — wordIndex should be earlier
    expect(slow.wordIndex).toBeLessThanOrEqual(normal.wordIndex);
  });
});

// ---------------------------------------------------------------------------
// effectiveNMM
// ---------------------------------------------------------------------------

describe("effectiveNMM", () => {
  it("returns neutral for null nmm", () => {
    expect(effectiveNMM(null, 0).type).toBe("neutral");
  });

  it("returns neutral nmm unchanged", () => {
    const nmm = { type: "neutral", wordIndex: -1, headY: 0 };
    expect(effectiveNMM(nmm, 3).type).toBe("neutral");
  });

  it("applies yn-question from word 0 regardless of current word", () => {
    const nmm = { type: "yn-question", wordIndex: 0, headY: 0 };
    expect(effectiveNMM(nmm, 0).type).toBe("yn-question");
    expect(effectiveNMM(nmm, 3).type).toBe("yn-question");
  });

  it("gates wh-question until avatar reaches triggering word", () => {
    const nmm = { type: "wh-question", wordIndex: 2, headY: 0 };
    expect(effectiveNMM(nmm, 1).type).toBe("neutral");
    expect(effectiveNMM(nmm, 2).type).toBe("wh-question");
    expect(effectiveNMM(nmm, 3).type).toBe("wh-question");
  });

  it("gates negation until avatar reaches triggering word", () => {
    const nmm = { type: "negation", wordIndex: 1, headY: 0.22 };
    expect(effectiveNMM(nmm, 0).type).toBe("neutral");
    expect(effectiveNMM(nmm, 1).type).toBe("negation");
  });
});

// ---------------------------------------------------------------------------
// shouldAvatarAnimate
// ---------------------------------------------------------------------------

describe("shouldAvatarAnimate", () => {
  const caption = { start: 0, end: 1000, words: ["HELLO"] };

  it("returns true when playing with a caption", () => {
    expect(shouldAvatarAnimate("playing", caption)).toBe(true);
  });

  it("returns false when paused", () => {
    expect(shouldAvatarAnimate("paused", caption)).toBe(false);
  });

  it("returns false when idle", () => {
    expect(shouldAvatarAnimate("idle", caption)).toBe(false);
  });

  it("returns false when caption is null", () => {
    expect(shouldAvatarAnimate("playing", null)).toBe(false);
  });

  it("returns true during seeking (avatar snaps to seek position)", () => {
    expect(shouldAvatarAnimate("seeking", caption)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeWordTimings — Phase B spokenTimings path
// ---------------------------------------------------------------------------

describe("computeWordTimings with spokenTimings (Phase B)", () => {
  // Caption spans 0–4000ms but speech only runs 500–3500ms (1000ms of silence trimmed).
  const captionWithSpoken = {
    start: 0,
    end: 4000,
    words: ["NETWORK", "DATA", "LEARN"],
    spokenTimings: [
      { word: "THE", startMs: 500, endMs: 750, score: 0.98 },
      { word: "NEURAL", startMs: 760, endMs: 1100, score: 0.97 },
      { word: "NETWORK", startMs: 1110, endMs: 1600, score: 0.95 },
      { word: "LEARNS", startMs: 1700, endMs: 2100, score: 0.93 },
      { word: "DATA", startMs: 2200, endMs: 2800, score: 0.96 },
      { word: "PATTERNS", startMs: 2900, endMs: 3500, score: 0.94 },
    ],
  };

  it("starts at first spoken word startMs, not caption.start", () => {
    const timings = computeWordTimings(captionWithSpoken);
    expect(timings[0].startMs).toBe(500); // spokenTimings[0].startMs
    expect(timings[0].startMs).not.toBe(0); // NOT caption.start
  });

  it("ends at last spoken word endMs, not caption.end", () => {
    const timings = computeWordTimings(captionWithSpoken);
    expect(timings[timings.length - 1].endMs).toBeCloseTo(3500, 0); // spokenTimings[last].endMs
    expect(timings[timings.length - 1].endMs).not.toBe(4000); // NOT caption.end
  });

  it("windows are contiguous within the speech span", () => {
    const timings = computeWordTimings(captionWithSpoken);
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].startMs).toBeCloseTo(timings[i - 1].endMs, 5);
    }
  });

  it("returns one timing per gloss word, not per spoken word", () => {
    const timings = computeWordTimings(captionWithSpoken);
    expect(timings).toHaveLength(3); // gloss words: NETWORK, DATA, LEARN
  });

  it("falls back to caption boundaries when spokenTimings has fewer than 2 entries", () => {
    const cap = { start: 1000, end: 3000, words: ["HELLO"], spokenTimings: [{ word: "HI", startMs: 1200, endMs: 1500, score: 0.9 }] };
    const timings = computeWordTimings(cap);
    expect(timings[0].startMs).toBe(1000); // caption.start (fallback)
  });

  it("Phase A behavior unchanged when spokenTimings is absent", () => {
    const cap = { start: 0, end: 3000, words: ["NETWORK", "DATA", "LEARN"] };
    const timings = computeWordTimings(cap);
    expect(timings[0].startMs).toBe(0);
    expect(timings[timings.length - 1].endMs).toBeCloseTo(3000, 0);
  });
});

// ---------------------------------------------------------------------------
// applySlowPlayback
// ---------------------------------------------------------------------------

describe("applySlowPlayback", () => {
  const timings = [
    { word: "A", index: 0, startMs: 0, endMs: 500, durationMs: 500 },
    { word: "B", index: 1, startMs: 500, endMs: 1000, durationMs: 500 },
  ];

  it("returns timings unchanged when speedFactor >= 1", () => {
    expect(applySlowPlayback(timings, 1.0)).toBe(timings);
  });

  it("doubles duration when speedFactor = 0.5", () => {
    const slow = applySlowPlayback(timings, 0.5);
    expect(slow[0].durationMs).toBeCloseTo(1000, 0);
    expect(slow[1].durationMs).toBeCloseTo(1000, 0);
  });

  it("windows are contiguous after stretching", () => {
    const slow = applySlowPlayback(timings, 0.5);
    expect(slow[1].startMs).toBeCloseTo(slow[0].endMs, 5);
  });
});
