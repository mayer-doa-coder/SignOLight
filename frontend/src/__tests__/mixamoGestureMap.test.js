import {
  gestureForMixamoWord,
  spellingUnitsForMixamoWord,
} from "../services/mixamoGestureMap";

describe("Mixamo caption gesture mapping", () => {
  it("uses numeric handshapes for written number words", () => {
    expect(gestureForMixamoWord("zero")).toBe("NUM_0");
    expect(gestureForMixamoWord("one")).toBe("NUM_1");
    expect(gestureForMixamoWord("NINE")).toBe("NUM_9");
  });

  it("uses numeric handshapes for structured number glosses", () => {
    expect(gestureForMixamoWord("[NUMBER:4]")).toBe("NUM_4");
  });

  it("retains fingerspelling for words with no authored sign", () => {
    expect(gestureForMixamoWord("neologism", 0)).toBe("N");
    expect(gestureForMixamoWord("neologism", 0.99)).toBe("M");
    expect(spellingUnitsForMixamoWord("neologism")).toHaveLength(9);
  });

  it("fingerspells concept tags instead of pausing", () => {
    expect(gestureForMixamoWord("[CONCEPT:iron]", 0)).toBe("I");
    expect(gestureForMixamoWord("[CONCEPT:iron]", 0.99)).toBe("N");
  });

  it("steps through Bangla alphabet gestures for translated words", () => {
    expect(gestureForMixamoWord("[BANGLA:আমার]", 0)).toBe("BN_AA");
    expect(spellingUnitsForMixamoWord("[BANGLA:আমার]")).toHaveLength(4);
  });

  it("maps common caption synonyms to authored Mixamo gestures", () => {
    expect(gestureForMixamoWord("thanks")).toBe("THANK");
    expect(gestureForMixamoWord("myself")).toBe("ME");
    expect(gestureForMixamoWord("study")).toBe("LEARN");
  });

  it("maps calculus video vocabulary to varied concept motions", () => {
    expect(gestureForMixamoWord("calculus")).toBe("CALCULUS");
    expect(gestureForMixamoWord("derivatives")).toBe("DERIVATIVES");
    expect(gestureForMixamoWord("rectangles")).toBe("RECTANGLES");
    expect(gestureForMixamoWord("smaller")).toBe("SMALLER");
  });
});
