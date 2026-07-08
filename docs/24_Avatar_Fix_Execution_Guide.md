# 24 — Avatar Fix: Execution Guide
*Goal: replace `/frontend/public/models/sign.vrm` with a VRM 1.0 model that has all 30 finger bones AND `browDownLeft/Right/OuterUpLeft/Right` expressions. Model-only fix, no renderer migration. | Written: 2026-06-30*

---

# SECTION 1 — The best solution, justified

## Verdict: your plan is 90% right. One step is wrong and must change.

| Gap | Your plan | Correct? |
|---|---|---|
| **Missing pinky bones** | Rebuild fresh in VRoid Studio, export VRM 1.0, don't reduce bones | ✅ **Confirmed — only viable path** |
| **Missing brow expressions** | HANA_Tool + Unity to add ARKit blendshapes | ❌ **Wrong tool for your version — replace with a Node script** |

### Why the rebuild is correct (and the only way) for the pinkies
Pinky joints are **bones**, not blendshapes. Nothing that edits expressions (HANA_Tool, scripts) can add missing skeleton. A correct VRoid Studio export *always* rigs all 10 fingers (30 finger bones), so building fresh and **not reducing bones on export** guarantees the pinkies. There is no faster path that satisfies "free, browser-only, no Blender." Confirmed.

### Why HANA_Tool + Unity is the wrong brow tool *for you*
HANA_Tool is built for **VRM 0.x** and older VRoid mesh topology. Its official distribution states it is **not compatible with VRoid Studio v1.20.0 and newer**. You are on **VRoid Studio 2.13.0 / VRM 1.0**. It would not import your model correctly, after a heavy Unity + UniVRM version-matching setup. Eliminate it.

### The better brow path (no Unity, no Blender)
VRM 1.0 expressions are plain JSON inside the `.vrm` (which is a `.glb`). Your VRoid model already contains the brow **morph targets** — your own audit found `Fcl_BRW_Angry` (furrow/down) and `Fcl_BRW_Surprised` (raise/up). The fix is to add four **custom expressions** that point at those existing morphs, under the exact names your code probes:

```
browDownLeft   → Fcl_BRW_Angry      (furrow, for WH-question)
browDownRight  → Fcl_BRW_Angry
browOuterUpLeft  → Fcl_BRW_Surprised (raise, for YN-question)
browOuterUpRight → Fcl_BRW_Surprised
```

A ~60-line Node script (provided in Phase 2) does this in one pass. No GUI tool, no version-matching, no paid account.

**Honest tradeoff — symmetric vs. asymmetric:** VRoid's brow morphs are symmetric (they move both brows together). So `browDownLeft` and `browDownRight` will both drive the same furrow shape. For BdSL WH-question (furrow both) and YN-question (raise both), you fire them together anyway, so the result is linguistically correct. You only lose the ability to raise one brow independently of the other — which BdSL NMM grammar does not require. If you ever need true one-brow-up asymmetry, that needs new morph geometry (Blender) — out of scope and unnecessary here.

### Two ways to apply the brow fix — pick one
- **Path A (model-only, matches your stated preference):** run the Node injection script → the `.vrm` itself gains the four expressions → `getExpression('browDownLeft')` returns them with zero code change. **Recommended for you.**
- **Path B (code-only alternative):** register the four expressions at VRM load time in three-vrm (~30 lines). Most robust against future model swaps, but it is a small code addition. Provided as a fallback in Phase 2.

Both produce identical runtime behaviour. Path A keeps your "no code rewrite" constraint.

---

# SECTION 2 — Complete step-by-step execution

> **⚠️ Verify-before-you-start checklist** (things that may have shifted since this guide):
> - **VRoid Studio version:** download whatever is current at vroid.com (you have 2.13.0; any 2.x is fine). The export UI labels below are stable across 2.x but confirm wording.
> - **`@pixiv/three-vrm` version:** check `frontend/package.json`. Path B (code registration) uses the v2/v3 API; if you're on v1, the class names differ — Path A avoids this entirely.
> - **The Node scripts** use only Node core (`fs`) — no dependencies, no version risk. They print what they find, so they self-verify.

---

## PHASE 1 — VRoid Studio: build the avatar

**1. Download VRoid Studio (free).**
Canonical source only: **https://vroid.com/en/studio** (or the Steam listing linked from that page). Install the current stable Windows build. Do not use third-party mirrors.

**2. Start from a female base model (not from scratch).**
Launch VRoid Studio → **Create New** → choose a **Female** base type. This gives you a fully-rigged humanoid (all 10 fingers) immediately; you only customize appearance on top.

**3. Minimum adjustments for South Asian appearance.**
- **Face → Skin:** open the **Skin** sub-tab, select the **base skin color** swatch, and set a warm brown tone (mid-brown). This single slider is the highest-impact change.
- **Hair:** **Hair** tab → pick a preset long/tied dark style; set color to near-black.
- **Outfit:** **Outfit** tab → choose modest attire (the default tops/bottoms are fine for a hackathon; a kurta-like top reads as South Asian if available in presets).
- Skip anything else — appearance is "nice-to-have," not a hard requirement. Don't sink time here.

**4. Protect the finger bones at export (critical).**
The export screen has an **optimization / "Reduce"** section (polygon reduction, material reduction, **bone reduction**, "delete transparent meshes"). **Leave bone reduction OFF / at default and do not enable any "reduce bones" option.** Aggressive reduction is the most likely way fingers get stripped. Also **do not** delete or decimate the hand mesh. Polygon/material reduction on the *body/hair* is fine for file size; just never touch hands or bones.

**5. Configure and confirm expression presets before export.**
Open **Face → Expression Editor**. Confirm these exist and look reasonable (VRoid provides them by default; just verify in the preview):
- Emotions: **Neutral, Joy (→happy), Angry, Sorrow (→sad), Surprised, Relaxed**
- Visemes: **A, I, U, E, O** (mouth shapes → exported as `aa, ih, ou, ee, oh`)

Your code uses `happy, angry, sad, surprised, relaxed, aa, ih, ou` — all of these come **free** from a VRoid VRM 1.0 export. You do **not** need to touch the brows here; that's Phase 2.

**6. Export as VRM 1.0.**
Top-right **Export** icon → **Export as VRM**.
- On the format screen choose **VRM 1.0** (matches `@pixiv/three-vrm`'s canonical bone naming).
- **Required fields:** *Avatar name* and *Creator name* (enter anything, e.g. "Riya" / your name).
- **License:** set usage to allow your demo — enable the equivalent of *"Allow use by everyone"* and at minimum *personal/non-profit*; credit-required is fine. This satisfies "public educational demo."
- Leave all other options at default **except** confirm no bone/hand reduction (Step 4).
- Save as `sign-new.vrm` somewhere easy, e.g. `C:\Users\<you>\Desktop\`.
- **Filename tag tip:** keep `VRM1` in your working filename so you never confuse versions.

**7. Verify all 30 finger bones WITHOUT Unity (free, offline).**
Save this as `verify-vrm.js` and run `node verify-vrm.js "C:\path\to\sign-new.vrm"`:

```js
// verify-vrm.js — lists finger bones, expressions, and lookAt. Node core only.
const fs = require('fs');
const buf = fs.readFileSync(process.argv[2]);
let off = 12; const chunks = [];
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
  chunks.push({ type, data: buf.subarray(off + 8, off + 8 + len) });
  off += 8 + len;
}
const json = JSON.parse(chunks.find(c => c.type === 0x4E4F534A).data.toString('utf8'));
const vrm = json.extensions.VRMC_vrm;
const bones = Object.keys(vrm.humanoid.humanBones);
const required = [];
for (const side of ['left', 'right'])
  for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) {
    const joints = f === 'Thumb'
      ? ['Metacarpal', 'Proximal', 'Distal']
      : ['Proximal', 'Intermediate', 'Distal'];
    for (const j of joints) required.push(side + f + j);
  }
const missing = required.filter(b => !bones.includes(b));
console.log(`Finger bones: ${required.length - missing.length}/${required.length} present`);
if (missing.length) console.log('  MISSING:', missing.join(', '));
else console.log('  ✅ all 30 finger bones present');
const presets = vrm.expressions?.preset ? Object.keys(vrm.expressions.preset) : [];
const customs = vrm.expressions?.custom ? Object.keys(vrm.expressions.custom) : [];
console.log('Preset expressions:', presets.join(', ') || '(none)');
console.log('Custom expressions:', customs.join(', ') || '(none — brows not added yet)');
console.log('lookAt present:', !!vrm.lookAt);
```

**Expected at this stage:** `✅ all 30 finger bones present`, presets listed, custom = none, lookAt = true.
**If pinkies are missing here:** you reduced bones on export. Redo Step 6 with bone reduction OFF. Do not proceed until this prints all 30.

---

## PHASE 2 — Add the four ARKit brow expressions (no Unity)

**8. Run the injection script (Path A — recommended).**
Save as `add-brows.js`, run `node add-brows.js "C:\path\to\sign-new.vrm"`. It writes `sign-new.brows.vrm` next to the input.

```js
// add-brows.js — adds 4 custom VRM 1.0 brow expressions bound to existing VRoid morphs.
// Node core only. Produces <input>.brows.vrm
const fs = require('fs');
const inPath = process.argv[2];
if (!inPath) { console.error('Usage: node add-brows.js path/to/model.vrm'); process.exit(1); }
const buf = fs.readFileSync(inPath);
if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('Not a GLB/VRM file');

// --- parse chunks ---
let off = 12; const chunks = [];
while (off < buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
  chunks.push({ type, data: buf.subarray(off + 8, off + 8 + len) });
  off += 8 + len;
}
const jsonChunk = chunks.find(c => c.type === 0x4E4F534A);
const binChunk  = chunks.find(c => c.type === 0x004E4942);
const json = JSON.parse(jsonChunk.data.toString('utf8'));

// --- find the face mesh + its morph target names (check mesh.extras and primitive.extras) ---
function targetNamesOf(mesh) {
  if (mesh.extras?.targetNames) return mesh.extras.targetNames;
  for (const p of mesh.primitives || []) if (p.extras?.targetNames) return p.extras.targetNames;
  return null;
}
let faceMeshIndex = -1, names = null;
json.meshes.forEach((m, i) => {
  const n = targetNamesOf(m);
  if (n && n.some(x => x.startsWith('Fcl_BRW'))) { faceMeshIndex = i; names = n; }
});
if (faceMeshIndex < 0) {
  console.error('No mesh with Fcl_BRW morphs found. All meshes/morphs:');
  json.meshes.forEach((m, i) => console.error(`  mesh[${i}]`, targetNamesOf(m)));
  process.exit(1);
}
const idxDown = names.indexOf('Fcl_BRW_Angry');     // furrow / down
const idxUp   = names.indexOf('Fcl_BRW_Surprised'); // raise / up
if (idxDown < 0 || idxUp < 0) {
  console.error('Expected Fcl_BRW_Angry / Fcl_BRW_Surprised not found. Available:', names.join(', '));
  process.exit(1);
}
const nodeIndex = json.nodes.findIndex(n => n.mesh === faceMeshIndex);
if (nodeIndex < 0) throw new Error('No node references the face mesh');

// --- inject custom expressions ---
const vrm = json.extensions?.VRMC_vrm;
if (!vrm) throw new Error('Not a VRM 1.0 file (no VRMC_vrm extension)');
vrm.expressions = vrm.expressions || {};
vrm.expressions.custom = vrm.expressions.custom || {};
const mk = (morphIndex) => ({
  isBinary: false,
  morphTargetBinds: [{ node: nodeIndex, index: morphIndex, weight: 1.0 }],
  overrideBlink: 'none', overrideLookAt: 'none', overrideMouth: 'none'
});
vrm.expressions.custom.browDownLeft    = mk(idxDown);
vrm.expressions.custom.browDownRight   = mk(idxDown);
vrm.expressions.custom.browOuterUpLeft  = mk(idxUp);
vrm.expressions.custom.browOuterUpRight = mk(idxUp);

// --- re-serialize GLB (re-pad JSON chunk, keep BIN as-is) ---
let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
while (jsonBuf.length % 4 !== 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.from(' ')]);
const binBuf = binChunk ? binChunk.data : Buffer.alloc(0);
const total = 12 + 8 + jsonBuf.length + (binChunk ? 8 + binBuf.length : 0);
const out = Buffer.alloc(total); let o = 0;
out.writeUInt32LE(0x46546C67, o); o += 4;
out.writeUInt32LE(2, o); o += 4;
out.writeUInt32LE(total, o); o += 4;
out.writeUInt32LE(jsonBuf.length, o); o += 4;
out.writeUInt32LE(0x4E4F534A, o); o += 4;
jsonBuf.copy(out, o); o += jsonBuf.length;
if (binChunk) {
  out.writeUInt32LE(binBuf.length, o); o += 4;
  out.writeUInt32LE(0x004E4942, o); o += 4;
  binBuf.copy(out, o);
}
const outPath = inPath.replace(/\.vrm$/i, '') + '.brows.vrm';
fs.writeFileSync(outPath, out);
console.log('✅ wrote', outPath);
console.log(`   browDown*  -> Fcl_BRW_Angry (morph ${idxDown})`);
console.log(`   browOuterUp* -> Fcl_BRW_Surprised (morph ${idxUp})`);
```

**Known failure mode:** if it prints "No mesh with Fcl_BRW morphs found," it also dumps every mesh's morph names. VRoid 2.x sometimes labels the raise morph differently — if you don't see `Fcl_BRW_Surprised`, substitute the closest brow-up name shown (e.g. `Fcl_BRW_Fun`) into the `idxUp` line and re-run.

**8b. Path B (code alternative — only if you prefer not to ship a modified file).**
Add this to your VRM load code (after the VRM is parsed) instead of running the script. Verify the class names against your installed `@pixiv/three-vrm` version first:

```js
import { VRMExpression, VRMExpressionMorphTargetBind } from '@pixiv/three-vrm';

function registerBrowExpressions(vrm) {
  const faceMeshes = [];
  vrm.scene.traverse(o => {
    if (o.isMesh && o.morphTargetDictionary && 'Fcl_BRW_Angry' in o.morphTargetDictionary)
      faceMeshes.push(o);
  });
  if (!faceMeshes.length) { console.warn('[brows] no Fcl_BRW morphs found'); return; }
  const add = (name, morphName) => {
    const expr = new VRMExpression(name);
    for (const mesh of faceMeshes) {
      const index = mesh.morphTargetDictionary[morphName];
      if (index === undefined) continue;
      expr.addBind(new VRMExpressionMorphTargetBind({ primitives: [mesh], index, weight: 1.0 }));
    }
    vrm.expressionManager.registerExpression(expr);
  };
  add('browDownLeft', 'Fcl_BRW_Angry');
  add('browDownRight', 'Fcl_BRW_Angry');
  add('browOuterUpLeft', 'Fcl_BRW_Surprised');
  add('browOuterUpRight', 'Fcl_BRW_Surprised');
  console.log('[brows] registered 4 custom expressions');
}
```
**Caveat:** if you call `VRMUtils.combineMorphs`, raw `Fcl_*` morphs get consolidated and this lookup fails — register brows **before** any morph-combining step, or use Path A.

**9. Confirm the brows are in the file.**
Re-run the Phase 1 verifier on the new file:
```
node verify-vrm.js "C:\path\to\sign-new.brows.vrm"
```
**Expected:** `✅ all 30 finger bones present` **and** `Custom expressions: browDownLeft, browDownRight, browOuterUpLeft, browOuterUpRight`. If both lines are right, the model is correct. (Path B users: skip this; verify in-app at Step 13.)

---

## PHASE 3 — Integration and verification

**10. Replace the file.**
- Back up the current model first: rename `frontend/public/models/sign.vrm` → `sign.vrm.bak` (keep it — this is your demo-day safety net, Step 17).
- Copy `sign-new.brows.vrm` → `frontend/public/models/sign.vrm` (exact same filename and path the app already loads).

**11. Run the app and confirm load.**
`npm start` in `frontend/`. Open the browser console.
- **Success looks like:** no VRM loader errors; your existing load-time probe logs (the brow probe should now report the four expressions *found* instead of falling back).
- **Failure looks like:** red errors from `GLTFLoader`/`VRMLoaderPlugin` (malformed file), or your probe logging the `angry=0.55` fallback (brows not detected → the file you copied wasn't the `.brows.vrm`, or Path B ran after combineMorphs).

**12. Confirm all 30 finger bones drive correctly.**
- **Quick console test** (paste in DevTools once the VRM is in scope, adjust the variable name to your app's VRM ref):
  ```js
  ['leftLittleProximal','leftLittleIntermediate','leftLittleDistal',
   'rightLittleProximal','rightLittleIntermediate','rightLittleDistal']
    .forEach(b => console.log(b, !!vrm.humanoid.getNormalizedBoneNode(b)));
  ```
  All six must print `true`.
- **Visual fingerspelling test — the pinky tells:** the BdSL/ASL-style letters that *require* the pinky are **I, J, Y, W** (and your list's D, F, X). Play the sign for **"I"** (pinky extended, others curled) and **"Y"** (thumb + pinky out). On the old model these did nothing on the pinky; now the pinky must visibly move. If "I" and "Y" render correctly, the pinky rig is live.

**13. Confirm brow expressions fire.**
- **Console test:**
  ```js
  vrm.expressionManager.setValue('browDownLeft', 1.0);
  vrm.expressionManager.setValue('browDownRight', 1.0);
  vrm.update(0); // or wait one frame
  ```
  The brows should visibly furrow. Reset to 0, then test `browOuterUpLeft/Right` → brows raise.
- **In-app NMM test:** trigger a **WH-question** sign in your timeline (the caption/gloss that your sync engine maps to the WH-furrow NMM — use whichever YouTube timestamp/caption in your test deck contains a WH-question gloss). The interpreter's brows should furrow during that sign instead of showing the symmetric angry-emotion fallback. A **YN-question** gloss should raise the brows.

**14. If the VRM loads but looks wrong — one fix per failure mode:**
| Symptom | Cause | Fix |
|---|---|---|
| Stuck in T-pose, no signing | App's bone targets ran before VRM finished loading, or wrong VRM ref | Ensure your signing loop starts only after the loader's `onLoad`; confirm the VRM object is the one being driven |
| No expressions at all (face frozen) | `expressionManager` null or wrong file copied | Re-check Step 10 copied the `.brows.vrm`; confirm `vrm.expressionManager` is not null in console |
| Brows fall back to angry-emotion | Custom expressions absent | You copied `sign-new.vrm` (pre-brows) not `sign-new.brows.vrm`; re-do Step 10 |
| Model huge / tiny / floating | Scale or origin mismatch between old and new model | Apply the same scale/position your app set for the old model; VRoid exports ~1.0 unit = 1 m, so set scale to match `sign.vrm.bak`'s |
| Whole model dark/untextured | MToon material + lighting | Ensure your scene has the same lights as before; new model uses MToon like the old one — no code change needed, just lighting parity |
| Fingers move but mesh doesn't deform | You decimated/reduced the hand mesh on export | Re-export from VRoid with no hand-mesh reduction (Phase 1 Step 4) |

---

## PHASE 4 — Handshape re-tuning (only if needed)

**15. How to know if your JSON clips need re-tuning.**
The new model is a *different* VRoid avatar, so its **rest pose** and finger proportions differ slightly from "arka"'s. After Step 12:
- Spot-check 5–6 fingerspelling letters across the hand (one per finger): e.g. **A** (thumb), **D** (index), **W** (index+middle+ring), **I** (pinky), **B** (flat), **C** (curl).
- If letters look correct → **no re-tuning needed**, you're done. Likely outcome, since you drive bones by absolute rotations and VRoid rest poses are consistent.
- If a letter is subtly off (a finger over/under-curled) → light re-tuning of that letter's clip.

**16. If re-tuning IS needed — method.**
- Your clips store per-bone Euler/quaternion rotations. Build a tiny **pose tuner**: a dev-only screen with sliders bound to the active sign's finger-bone rotations, writing back to a JSON object you can copy out. (You already have all the bone-driving code; the tuner is just sliders → `getNormalizedBoneNode(b).rotation`.)
- Tune visually until the handshape reads correctly, copy the values into the clip JSON, reload.
- **Do not** hand-edit raw numbers blind — always tune against the live render. Re-tune only the letters that looked wrong; leave the rest.
- The pinky letters (**I, J, Y, W**) are brand-new behaviour (the bones didn't exist before), so expect to author those clips fresh rather than tweak.

---

## PHASE 5 — Demo-day safety net

**17. Fallbacks to have ready (do all three — they're cheap):**
1. **Keep `sign.vrm.bak`.** If the new model misbehaves live, swap the filename back in 10 seconds and you're on the known-good (pinky-less) model — degraded but stable.
2. **Pre-record 5 key signs as short screen-capture clips** (the most-demoed glosses, including one WH- and one YN-question so the brows show). If 3D rendering glitches on the venue machine, you can show the clips as proof of the feature. ~1 hour of work, total insurance.
3. **Pin your dependency versions** (`@pixiv/three-vrm`, `three`) in `package.json` and do a clean `npm ci` build on the actual demo machine the night before — most live failures are environment drift, not your code.

---

## Appendix — what the app tests at load (your acceptance criteria)
```js
vrm.humanoid.getNormalizedBoneNode('leftLittleProximal') // must NOT be null  → fixed by Phase 1
vrm.expressionManager.getExpression('browDownLeft')       // must NOT be undefined → fixed by Phase 2
vrm.lookAt !== null                                       // true → VRoid VRM 1.0 always includes lookAt
```
All three pass once Phases 1–2 are done and verified by `verify-vrm.js`.

## Appendix — tools used (all free, canonical sources)
- VRoid Studio — https://vroid.com/en/studio
- Node.js (you already have it via Create React App) — scripts use core `fs` only
- VRM 1.0 expression spec (reference) — https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/expressions.md
- **Not used / avoided:** Unity, UniVRM, HANA_Tool (incompatible with VRoid 1.20.0+ / VRM 1.0), Blender, any paid account.
