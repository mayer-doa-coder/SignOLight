import { findCaption, computeNMM } from "../utils/sync";

// ---------------------------------------------------------------------------
// findCaption — binary search O(log n)
// ---------------------------------------------------------------------------

const makeCaptions = (...ranges) =>
  ranges.map(([start, end], i) => ({ start, end, text: `cap-${i}` }));

describe("findCaption", () => {
  it("returns null for an empty array", () => {
    expect(findCaption([], 5000)).toBeNull();
  });

  it("finds the first caption", () => {
    const caps = makeCaptions([0, 3000], [3500, 6000]);
    expect(findCaption(caps, 1000)).toBe(caps[0]);
  });

  it("finds the last caption", () => {
    const caps = makeCaptions([0, 3000], [3500, 6000], [6500, 9000]);
    expect(findCaption(caps, 8000)).toBe(caps[2]);
  });

  it("returns null when timeMs falls in a gap between captions", () => {
    const caps = makeCaptions([0, 2000], [3000, 5000]);
    expect(findCaption(caps, 2500)).toBeNull();
  });

  it("returns the caption whose range exactly contains timeMs at boundary", () => {
    const caps = makeCaptions([1000, 4000], [5000, 8000]);
    expect(findCaption(caps, 1000)).toBe(caps[0]); // start boundary
    expect(findCaption(caps, 4000)).toBe(caps[0]); // end boundary
    expect(findCaption(caps, 5000)).toBe(caps[1]); // next caption start
  });

  it("handles a single caption", () => {
    const caps = makeCaptions([0, 10000]);
    expect(findCaption(caps, 5000)).toBe(caps[0]);
    expect(findCaption(caps, 15000)).toBeNull();
  });

  it("snaps correctly after a seek to minute 20 in a 30-min lecture", () => {
    const caps = Array.from({ length: 120 }, (_, i) => ({
      start: i * 15000,
      end: i * 15000 + 12000,
      text: `cap-${i}`,
    }));
    const seekMs = 20 * 60 * 1000;
    const result = findCaption(caps, seekMs);
    expect(result).not.toBeNull();
    expect(result.start).toBeLessThanOrEqual(seekMs);
    expect(result.end).toBeGreaterThanOrEqual(seekMs);
  });
});

// ---------------------------------------------------------------------------
// computeNMM — ASL grammar-driven non-manual marker (structured object)
// ---------------------------------------------------------------------------

describe("computeNMM", () => {
  it("returns neutral type for a plain declarative sentence", () => {
    const nmm = computeNMM("NEURAL NETWORK LAYER MANY", "The neural network has many layers.");
    expect(nmm.type).toBe("neutral");
    expect(nmm.wordIndex).toBe(-1);
    expect(nmm.headY).toBe(0);
  });

  it("detects WH-question from WHAT in gloss", () => {
    const nmm = computeNMM("COMPILER WHAT DO", "What does a compiler do?");
    expect(nmm.type).toBe("wh-question");
    expect(nmm.wordIndex).toBe(1); // WHAT is at index 1
    expect(nmm.headY).toBe(0);
  });

  it("detects WH-question from WHERE in gloss", () => {
    const nmm = computeNMM("TEACHER WHERE", "Where is the teacher?");
    expect(nmm.type).toBe("wh-question");
    expect(nmm.wordIndex).toBe(1);
  });

  it("detects WH-question from HOW in gloss", () => {
    const nmm = computeNMM("GRADIENT DESCENT HOW WORK", "How does gradient descent work?");
    expect(nmm.type).toBe("wh-question");
    expect(nmm.wordIndex).toBe(2);
  });

  it("WH-question takes priority over question mark (WH wins over YN)", () => {
    const nmm = computeNMM("WHAT DIFFERENCE METHOD TWO", "What is the difference?");
    expect(nmm.type).toBe("wh-question");
    expect(nmm.wordIndex).toBe(0); // WHAT is at index 0
  });

  it("detects yes/no question from trailing ? when no WH word in gloss", () => {
    const nmm = computeNMM("NETWORK READY", "Is the network ready?");
    expect(nmm.type).toBe("yn-question");
    expect(nmm.wordIndex).toBe(0); // YN applies from sentence start
    expect(nmm.headY).toBe(0);
  });

  it("detects negation from NOT in gloss with correct wordIndex", () => {
    const nmm = computeNMM("LESSON ME UNDERSTAND NOT", "I do not understand this lesson.");
    expect(nmm.type).toBe("negation");
    expect(nmm.wordIndex).toBe(3); // NOT is at index 3
    expect(nmm.headY).toBe(0.22);
  });

  it("detects negation from CANNOT", () => {
    const nmm = computeNMM("CONCEPT ME UNDERSTAND CANNOT", "I cannot understand this concept.");
    expect(nmm.type).toBe("negation");
    expect(nmm.wordIndex).toBe(3);
  });

  it("detects negation from NEVER", () => {
    const nmm = computeNMM("STUDENT LATE NEVER", "The student is never late.");
    expect(nmm.type).toBe("negation");
    expect(nmm.wordIndex).toBe(2);
    expect(nmm.headY).toBe(0.22);
  });

  it("detects WH-question from WHEN in gloss with correct wordIndex", () => {
    const nmm = computeNMM("CLASS WHEN START", "When does the class start?");
    expect(nmm.type).toBe("wh-question");
    expect(nmm.wordIndex).toBe(1); // WHEN is at index 1
    expect(nmm.headY).toBe(0);
  });

  it("detects WH-question from WHY in gloss — not at position 0", () => {
    const nmm = computeNMM("NETWORK SLOW WHY", "Why is the network slow?");
    expect(nmm.type).toBe("wh-question");
    expect(nmm.wordIndex).toBe(2); // WHY is at index 2
  });

  it("detects negation from CANT with headY 0.22", () => {
    const nmm = computeNMM("STUDENT EXAM CANT PASS", "The student cannot pass the exam.");
    expect(nmm.type).toBe("negation");
    expect(nmm.wordIndex).toBe(2); // CANT is at index 2
    expect(nmm.headY).toBe(0.22);
  });

  it("detects negation from NOTHING with headY 0.22", () => {
    const nmm = computeNMM("ERROR NOTHING SHOW", "There is nothing to show.");
    expect(nmm.type).toBe("negation");
    expect(nmm.wordIndex).toBe(1); // NOTHING is at index 1
    expect(nmm.headY).toBe(0.22);
  });

  it("handles null/undefined gloss gracefully", () => {
    expect(computeNMM(null, "Is this correct?").type).toBe("yn-question");
    expect(computeNMM(undefined, "A plain statement.").type).toBe("neutral");
  });

  it("handles null/undefined originalText gracefully", () => {
    expect(computeNMM("WHAT FUNCTION", null).type).toBe("wh-question");
    expect(computeNMM("NETWORK LEARN", undefined).type).toBe("neutral");
  });

  it("negation headY is non-zero only for negation type", () => {
    expect(computeNMM("NEURAL NETWORK LEARN", "Statement.").headY).toBe(0);
    expect(computeNMM("NETWORK READY", "Ready?").headY).toBe(0);
    expect(computeNMM("WHAT FUNCTION", null).headY).toBe(0);
    expect(computeNMM("CONCEPT NOT CLEAR", "Concept not clear.").headY).toBe(0.22);
  });
});
