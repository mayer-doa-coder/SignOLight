#!/usr/bin/env node
/**
 * Adds the four isolated brow expressions SignAvatar.js probes for (browDownLeft/Right,
 * browOuterUpLeft/Right) to a VRM 1.0 file, bound to the Fcl_BRW_* morphs VRoid already
 * ships. Rewrites the file in place after backing it up. Node core only.
 *
 * Run: npm run vrm:add-brows   then   npm run vrm:verify
 *
 * Why this exists: ASL marks WH-questions with furrowed brows and YN-questions with raised
 * brows, held across the whole question. Without these expressions SignAvatar.js falls back
 * to the whole-face "angry"/"surprised" presets, which move the mouth and eyes too — reading
 * as an emotion rather than as question grammar.
 *
 * Why not HANA_Tool (which docs/22 and 23 recommend): it targets VRM 0.x and is documented as
 * incompatible with VRoid Studio 1.20.0+. This model is VRoid 2.13 / VRM 1.0.
 *
 * Symmetry caveat: VRoid's brow morphs are symmetric, so browDownLeft and browDownRight drive
 * the same shape. ASL fires the pair together for both WH and YN, so the result is
 * linguistically correct. True one-brow-up asymmetry would need new morph geometry (Blender).
 */

const fs = require("fs");
const path = require("path");

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

// morphs VRoid ships that we repurpose. Down = furrow (WH), up = raise (YN).
const MORPH_DOWN = "Fcl_BRW_Angry";
const MORPH_UP = "Fcl_BRW_Surprised";

// Exactly the names SignAvatar.js probes. Do NOT add browInnerUp: the probe would find it and
// fire three "up" expressions instead of two, breaking the bind-weight sum below.
const EXPRESSIONS = [
  ["browDownLeft", "down"],
  ["browDownRight", "down"],
  ["browOuterUpLeft", "up"],
  ["browOuterUpRight", "up"],
];

/**
 * Each L/R pair drives one symmetric morph and SignAvatar.js sets BOTH to the same value.
 * three-vrm accumulates: morphTargetInfluences[i] += bindWeight * value, with no clamp.
 * At bindWeight 1.0 a pair fired at 0.80 yields influence 1.60 — a 60% overdriven,
 * visibly distorted brow. 0.5 per bind makes the pair sum back to the intended 0.80.
 */
const BIND_WEIGHT = 0.5;

function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== GLB_MAGIC) throw new Error("Not a GLB/VRM file");
  const chunks = [];
  let off = 12;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    chunks.push({ type, data: buf.subarray(off + 8, off + 8 + len) });
    off += 8 + len;
  }
  return chunks;
}

function serializeGlb(json, binData) {
  let jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
  while (jsonBuf.length % 4 !== 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.from(" ")]);

  // BIN chunk must also be 4-byte aligned; pad with zeros per the glTF spec.
  let binBuf = binData || Buffer.alloc(0);
  if (binBuf.length % 4 !== 0) {
    binBuf = Buffer.concat([binBuf, Buffer.alloc(4 - (binBuf.length % 4))]);
  }

  const total = 12 + 8 + jsonBuf.length + (binData ? 8 + binBuf.length : 0);
  const out = Buffer.alloc(total);
  let o = 0;
  out.writeUInt32LE(GLB_MAGIC, o); o += 4;
  out.writeUInt32LE(2, o); o += 4;
  out.writeUInt32LE(total, o); o += 4;
  out.writeUInt32LE(jsonBuf.length, o); o += 4;
  out.writeUInt32LE(CHUNK_JSON, o); o += 4;
  jsonBuf.copy(out, o); o += jsonBuf.length;
  if (binData) {
    out.writeUInt32LE(binBuf.length, o); o += 4;
    out.writeUInt32LE(CHUNK_BIN, o); o += 4;
    binBuf.copy(out, o);
  }
  return out;
}

function targetNamesOf(mesh) {
  if (mesh.extras?.targetNames) return mesh.extras.targetNames;
  for (const p of mesh.primitives || []) if (p.extras?.targetNames) return p.extras.targetNames;
  return null;
}

function main() {
  const inPath = process.argv[2];
  if (!inPath) {
    console.error("Usage: node scripts/add-brows.js <path/to/model.vrm>");
    process.exit(2);
  }

  const buf = fs.readFileSync(inPath);
  const chunks = parseGlb(buf);
  const jsonChunk = chunks.find((c) => c.type === CHUNK_JSON);
  const binChunk = chunks.find((c) => c.type === CHUNK_BIN);
  const json = JSON.parse(jsonChunk.data.toString("utf8"));

  const vrm = json.extensions?.VRMC_vrm;
  if (!vrm) throw new Error("Not a VRM 1.0 file (no VRMC_vrm extension)");

  // Locate the mesh carrying the brow morphs.
  let faceMeshIndex = -1;
  let names = null;
  json.meshes.forEach((mesh, i) => {
    const n = targetNamesOf(mesh);
    if (n && n.some((x) => x.startsWith("Fcl_BRW"))) {
      faceMeshIndex = i;
      names = n;
    }
  });
  if (faceMeshIndex < 0) {
    console.error("No mesh with Fcl_BRW morphs found. Morph targets per mesh:");
    json.meshes.forEach((m, i) => console.error(`  mesh[${i}] "${m.name}":`, targetNamesOf(m)));
    process.exit(1);
  }

  const idxDown = names.indexOf(MORPH_DOWN);
  const idxUp = names.indexOf(MORPH_UP);
  if (idxDown < 0 || idxUp < 0) {
    console.error(`Expected ${MORPH_DOWN} / ${MORPH_UP}. Available: ${names.filter((n) => /BRW/.test(n)).join(", ")}`);
    process.exit(1);
  }

  const nodeIndex = json.nodes.findIndex((n) => n.mesh === faceMeshIndex);
  if (nodeIndex < 0) throw new Error("No node references the face mesh");

  vrm.expressions = vrm.expressions || {};
  const already = Object.keys(vrm.expressions.custom || {});
  vrm.expressions.custom = vrm.expressions.custom || {};

  for (const [name, dir] of EXPRESSIONS) {
    vrm.expressions.custom[name] = {
      isBinary: false,
      morphTargetBinds: [{
        node: nodeIndex,
        index: dir === "down" ? idxDown : idxUp,
        weight: BIND_WEIGHT,
      }],
      overrideBlink: "none",
      overrideLookAt: "none",
      overrideMouth: "none",
    };
  }

  // Back up once — never clobber an existing backup on a re-run, so the original VRoid export
  // stays recoverable even if this script is run twice.
  const backup = inPath.replace(/\.vrm$/i, "") + ".original.vrm";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(inPath, backup);
    console.log(`Backed up original -> ${path.basename(backup)}`);
  } else {
    console.log(`Backup already exists, left untouched -> ${path.basename(backup)}`);
  }

  fs.writeFileSync(inPath, serializeGlb(json, binChunk ? binChunk.data : null));

  const verb = EXPRESSIONS.every(([n]) => already.includes(n)) ? "Updated" : "Added";
  console.log(`${verb} 4 brow expressions in ${path.basename(inPath)}:`);
  console.log(`  browDownLeft, browDownRight     -> ${MORPH_DOWN} (morph ${idxDown})  [WH-question furrow]`);
  console.log(`  browOuterUpLeft, browOuterUpRight -> ${MORPH_UP} (morph ${idxUp})  [YN-question raise]`);
  console.log(`  bind weight ${BIND_WEIGHT} each — the pair sums to 1.0 so firing both does not overdrive the morph.`);
  console.log("\nNext: npm run vrm:verify");
}

if (require.main === module) main();
module.exports = { parseGlb, serializeGlb, BIND_WEIGHT, EXPRESSIONS };
