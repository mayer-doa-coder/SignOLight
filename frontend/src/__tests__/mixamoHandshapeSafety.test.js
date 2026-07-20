const fs = require("fs");
const path = require("path");

describe("Mixamo front-view handshape safety", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "components", "MixamoAvatar.js"),
    "utf8"
  );

  it("curls non-thumb fingers on the front-facing local X axis", () => {
    expect(source).toContain(
      'finger === "Thumb" ? thumbOpposition : blendedAngle * curlSign'
    );
    expect(source).toContain(
      'finger === "Thumb" ? blendedAngle * curlSign : 0'
    );
  });

  it.each(["zero", "six", "seven", "eight", "nine"])(
    "keeps a safe authored %s number handshape",
    (shape) => {
      expect(source).toMatch(new RegExp(`\\n  ${shape}: \\{`));
    }
  );

  it("does not restore the unsafe whole-hand contact rotations", () => {
    expect(source).not.toContain("applyContactHandPose(");
    expect(source).not.toContain("contactPose:");
  });

  it("keeps the scanned front-view thumb contacts for 0, 6 and 9", () => {
    expect(source).toContain("[-0.14, 0.06, 0.66]");
    expect(source).toContain("[-0.015, 0.06, 1.18]");
    expect(source).toContain("[0.14618, -0.08284, 0.71626]");
  });
});
