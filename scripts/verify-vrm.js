#!/usr/bin/env node
/**
 * Verifies a VRM has everything SignAvatar.js needs: all 30 finger bones, the brow
 * expressions the NMM code probes for, and lookAt. Node core only — no Unity, no deps.
 *
 * Run: npm run vrm:verify
 *
 * Exit code is non-zero when a required rig feature is missing, so this can gate a build.
 */

const fs = require("fs");
const path = require("path");

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;

function readGlbJson(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== GLB_MAGIC) throw new Error(`${file} is not a GLB/VRM file`);
  let off = 12;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === CHUNK_JSON) return JSON.parse(buf.subarray(off + 8, off + 8 + len).toString("utf8"));
    off += 8 + len;
  }
  throw new Error("No JSON chunk found in GLB");
}

// The names SignAvatar.js probes via expressionManager.getExpression() to enable isolated
// brow NMMs. Absent -> the WH/YN question grammar silently falls back to whole-face presets.
const PROBED_BROW_DOWN = ["browDownLeft", "browDownRight"];
const PROBED_BROW_UP = ["browOuterUpLeft", "browOuterUpRight"];

function requiredFingerBones() {
  const bones = [];
  for (const side of ["left", "right"]) {
    for (const finger of ["Thumb", "Index", "Middle", "Ring", "Little"]) {
      // VRM 1.0 thumb is Metacarpal -> Proximal -> Distal; other fingers are
      // Proximal -> Intermediate -> Distal. "Intermediate" is a joint, "Middle" is a finger.
      const joints = finger === "Thumb"
        ? ["Metacarpal", "Proximal", "Distal"]
        : ["Proximal", "Intermediate", "Distal"];
      for (const joint of joints) bones.push(side + finger + joint);
    }
  }
  return bones;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/verify-vrm.js <path/to/model.vrm>");
    process.exit(2);
  }

  const json = readGlbJson(file);
  const vrm = json.extensions?.VRMC_vrm;
  if (!vrm) {
    console.error("Not a VRM 1.0 file (no VRMC_vrm extension). VRM 0.x uses different thumb bone names.");
    process.exit(1);
  }

  let ok = true;
  console.log(`${path.basename(file)}  (VRM spec ${vrm.specVersion})\n`);

  // --- finger bones ---
  const present = new Set(Object.keys(vrm.humanoid.humanBones));
  const required = requiredFingerBones();
  const missingBones = required.filter((b) => !present.has(b));
  console.log(`Finger bones : ${required.length - missingBones.length}/${required.length}`);
  if (missingBones.length) {
    console.log(`  MISSING: ${missingBones.join(", ")}`);
    console.log("  -> Re-export from VRoid with bone reduction OFF. Letters I, J, Y, D, F, W, X need the pinky.");
    ok = false;
  }

  // --- expressions ---
  const presets = Object.keys(vrm.expressions?.preset || {});
  const customs = Object.keys(vrm.expressions?.custom || {});
  console.log(`Presets      : ${presets.join(", ") || "(none)"}`);
  console.log(`Custom       : ${customs.join(", ") || "(none)"}`);

  const missingBrows = [...PROBED_BROW_DOWN, ...PROBED_BROW_UP].filter((n) => !customs.includes(n));
  if (missingBrows.length) {
    console.log(`  MISSING brow expressions: ${missingBrows.join(", ")}`);
    console.log("  -> Run: npm run vrm:add-brows   (WH/YN question NMMs fall back to whole-face presets without these)");
    ok = false;
  }

  // --- brow bind weights ---
  // SignAvatar.js fires the left and right of a pair together, and three-vrm ACCUMULATES
  // morph influence across expressions (morphTargetInfluences[i] += bindWeight * value)
  // with no clamp. On VRoid the L/R of a pair drive the same symmetric morph, so each bind
  // must carry weight 0.5 or the pair overdrives the morph past 1.0 and distorts the face.
  for (const pair of [PROBED_BROW_DOWN, PROBED_BROW_UP]) {
    const defined = pair.filter((n) => customs.includes(n));
    if (defined.length < 2) continue;
    const binds = defined.flatMap((n) => vrm.expressions.custom[n].morphTargetBinds || []);
    const sameMorph = new Set(binds.map((b) => `${b.node}:${b.index}`)).size === 1;
    if (!sameMorph) continue; // genuinely asymmetric morphs — accumulation is not a concern
    const total = binds.reduce((sum, b) => sum + (b.weight ?? 1), 0);
    if (Math.abs(total - 1) > 0.001) {
      console.log(`  WARNING: ${defined.join(" + ")} bind the same morph and sum to ${total} (expected 1.0)`);
      console.log("  -> Firing both together overdrives the morph. Re-run: npm run vrm:add-brows");
      ok = false;
    }
  }

  console.log(`lookAt       : ${vrm.lookAt ? "present" : "MISSING"}`);
  if (!vrm.lookAt) ok = false;

  console.log(`\n${ok ? "PASS — rig satisfies every SignAvatar.js requirement." : "FAIL — see fixes above."}`);
  process.exit(ok ? 0 : 1);
}

if (require.main === module) main();
module.exports = { readGlbJson, requiredFingerBones, PROBED_BROW_DOWN, PROBED_BROW_UP };
