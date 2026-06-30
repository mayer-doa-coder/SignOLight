# 23 — Rendering Stack Evaluation
*Researched: 2026-06-30 | Evaluated against SignOLight's caption-locked, timeline-synced BdSL signing pipeline*

---

## The Critical Reframe

**Your pain points are model problems, not renderer problems.**

| Pain point | Root cause | Fix |
|---|---|---|
| Missing pinky bones | Property of the VRM *file* | Rebuild/replace model |
| Brow blendshapes are presets, not isolated | Property of model's authored expressions | HANA_Tool post-processing |
| expressionManager only exposes standard names | Half API limitation, half model issue — three-vrm *does* surface custom expressions if the VRM defines them | Add `setMorph()` abstraction (see below) |

No renderer switch adds bones that aren't in the mesh. Migrating frameworks to fix these problems spends 20+ hours to solve what a 4-hour model rebuild solves.

**Second reframe:** Options E/F/G (MediaPipe, Kalidokit, WebXR) are live-puppetry tools. SignOLight is deterministic timeline-locked playback binary-searched against YouTube captions. These belong in an *offline authoring* pipeline (capture reference clips once), never in the runtime path.

---

## Option-by-Option Evaluation

### A. Three.js + @pixiv/three-vrm (current) — baseline is correct

**Capabilities — document and accept:**

1. **Finger control:** Full. Set `vrm.humanoid.getNormalizedBoneNode('leftLittleProximal').quaternion` for all 30 bones, every frame, sub-frame precision. The pinky gap is the model, not this.
2. **Blendshapes:** `expressionManager` for registered expressions *plus* direct `mesh.morphTargetInfluences[mesh.morphTargetDictionary['Fcl_BRW_Angry']]` for anything not registered. Two code paths, both available now.
3. **lookAt, head rotation, pose lerp:** Native and already built.
4. **WebGPU path:** three-vrm v3 adds `WebGPURenderer` compatibility via `MToonNodeMaterial` (Three.js r167+) — forward path to WebGPU without leaving the library.

**Ceiling:** High. **Risk:** Lowest — it's what has already been debugged.

---

### B. React Three Fiber + @pixiv/three-vrm — same engine, won't fix the bottleneck

R3F is a React reconciler over the same Three.js. It does not change VRM loading, blendshape access, or bone control — under the hood they are identical objects.

**What R3F gives:** declarative scene graph, `useFrame` hook for the per-frame lerp loop, `useLoader` for VRM.

**What it does not give:** easier bone control — finger work is imperative quaternion math inside `useFrame`, identical to the current `rAF` loop.

**Migration cost for a 1200-line imperative `SignAvatar.js`:** 8–16 hours to re-express as components, for near-zero functional gain.

**Pragmatic move:** don't rewrite SignAvatar — mount the existing imperative Three.js canvas alongside R3F, or wrap it in a thin component. Wholesale migration is not justified.

---

### C. Three.js + raw glTF/GLB (drop VRM) — a downgrade

**What you lose:**
- `expressionManager` → manage all morph targets by hand for everything
- `lookAt` → reimplement eye-bone aiming from a target Object3D manually
- Humanoid bone normalization → hardcode raw skeleton names, which differ by source:

| Source | Index finger proximal | Thumb middle |
|---|---|---|
| VRM 1.0 humanoid | `leftIndexProximal` | `leftThumbProximal` (Metacarpal is separate) |
| Mixamo | `mixamorig:LeftHandIndex1` | `mixamorig:LeftHandThumb2` |
| RPM (defunct) | Mixamo-compatible | OpenXR-compliant (different axis orientation) |

- Spring bones (hair/cloth)

**What you gain:** marginally larger model pool — illusory, because well-rigged free humanoids tend to *be* VRM.

**Verdict:** More code, less structure, no accuracy gain. Skip.

---

### D. Babylon.js + glTF/VRM — capable engine, blocked by loader

Babylon itself is capable: `Skeleton`/`Bone` for runtime rotation, `MorphTargetManager` for blendshapes (arbitrary named targets), WebGPU support. The community loader API: `vrmManager.humanoidBone.leftUpperArm.addRotation(...)` and `vrmManager.morphing('Joy', 1.0)`.

**Dealbreaker: `babylon-vrm-loader` supports VRM 0.x only.** Its own documentation reads "Supports .vrm v0.x file loading" with "TODO VRM v1.0 file loading." Support table tops out around babylon.js ^6.0.0.

SignOLight has a **VRM 1.0** model. Babylon would force a downgrade to VRM 0.0, reintroducing the thumb-bone naming shift (0.0: ThumbProximal/Intermediate/Distal; 1.0: Metacarpal/Proximal/Distal), while adopting a loader that trails current Babylon releases.

**Verdict:** Migrating a working Three.js app to a less-maintained VRM path on a competing engine for the wrong spec version is negative expected value. Eliminate.

---

### E. MediaPipe Holistic + custom WebGL renderer — wrong paradigm, deprecated API

**Two independent problems:**

1. **Paradigm mismatch:** retargeting noisy real-time landmarks at runtime is the opposite of caption-locked, repeatable demo playback. Adding webcam inference latency and frame-to-frame jitter replaces a deterministic JSON dictionary that always plays the same. Belongs in offline authoring only.

2. **Legacy API deprecated:** Google moved from `@mediapipe/holistic` to **MediaPipe Tasks "Holistic Landmarker"** (combines pose, face, and hand landmarkers). Output shape differs from what older retargeting code expects.

3. **Accuracy ceiling too low for signing:** MediaPipe hand tracking degrades badly under self-occlusion endemic to handshapes (fingers behind fingers, hand-over-hand). Cannot reliably recover what it cannot see.

**Verdict:** Eliminate.

---

### F. Kalidokit + Three.js/VRM — hand solver cannot represent BdSL handshapes

**Critical technical finding:** Kalidokit's hand solver, per its own documentation: *"only wrist and thumb have 3 degrees of freedom; all other finger joints move in the Z axis only."*

Z-axis-only means **finger curl but no finger spread (abduction)** for index/middle/ring/little. Sign languages distinguish handshapes precisely by spread: flat-B vs. spread-5, V (spread) vs. U (together), and countless BdSL handshapes. Kalidokit cannot represent those differences.

Built for VTuber expressiveness (curl-only reads fine for general movement); never built for phonetic handshape fidelity. Additionally: low-maintenance, coupled to the deprecated legacy Holistic API.

**Verdict:** Would make handshapes *worse*, not better. Eliminate.

---

### G. WebXR hand tracking (XRHand) — not available in flat browser

`XRHand` only exists inside an active `XRSession` with the `hand-tracking` feature, which requires an immersive (`immersive-vr` / `immersive-ar`) session on actual XR hardware. No flat-browser path exists, and no meaningful "polyfill from pre-recorded video" path either.

**Verdict:** Not applicable to a web page. Eliminate.

---

### H. Pre-rendered video signing — viable fallback, real tradeoffs

Worth considering as a *hackathon de-risking* option:

| Dimension | Assessment |
|---|---|
| File size | JSON bone data = kilobytes total; 27+ video clips = **20–80 MB+** depending on length/resolution/codec |
| Transitions | Video does NOT transition more smoothly than bone lerp — clip switches give hard cuts unless cross-faded; continuous co-articulation between signs is lost |
| Authenticity | If clips recorded from a real BdSL signer: **higher** than any avatar. If rendered from the same avatar: zero gain. |
| Flexibility | Loses runtime control — no dynamic gaze, no adjustable speed, no recombination, no isolated NMM overlay |

**Verdict:** Use as a safety net fallback, not primary architecture.

---

## Evaluation Matrix

| Option | Finger bone control | Blendshape flexibility | Model availability | Migration cost | Visual quality ceiling | Demo risk |
|---|---|---|---|---|---|---|
| **A — Three.js + three-vrm (current)** | ✅ Full, all 30 bones | ✅ expressionManager + raw morph fallback | ✅ VRM ecosystem | Zero | High | Low — already debugged |
| **B — R3F + three-vrm** | ✅ Same as A | ✅ Same as A | ✅ Same as A | 8–16 hrs (avoid wholesale) | High | Low if wrapped, medium if rewritten |
| **C — Three.js + raw glTF** | ✅ Manual but possible | 🟡 Manual only, no expressionManager | 🟡 Slightly broader | 10–20 hrs | High | Medium — more manual code |
| **D — Babylon.js + VRM** | ✅ Via Skeleton API | ✅ Via MorphTargetManager | 🟡 VRM 0.x only via loader | 30–50 hrs | High | High — loader doesn't support VRM 1.0 |
| **E — MediaPipe runtime** | ❌ Occlusion-limited | N/A | N/A | 20+ hrs | Low for signing | High — real-time inference |
| **F — Kalidokit** | ❌ Curl-only, no spread | N/A | N/A | 15+ hrs | ❌ Worse than current | High |
| **G — WebXR XRHand** | N/A | N/A | N/A | N/A | N/A | N/A — hardware required |
| **H — Pre-rendered video** | N/A (no runtime control) | N/A | N/A | 2–5 hrs | Best if real signer records | Low (video is reliable) |

---

## Final Recommendation — Ranked

### #1 — Stay on Three.js + @pixiv/three-vrm, fix the model and blendshape layer

Highest accuracy ceiling, lowest risk, keeps all working infrastructure. All problems are solvable without migration.

### #2 — A mounted inside R3F (only if rest of app is React-heavy)

Same engine, nicer React integration. Zero accuracy change. Wrap `SignAvatar.js` rather than rewriting it — do not do a wholesale migration.

### #3 — Pre-rendered real-signer video as parallel fallback track

Decouples demo reliability from rig quality. Best authenticity if a BdSL signer can be recorded. Keep as a safety layer behind the 3D avatar.

### Don't bother — eliminate immediately

| Option | Reason to eliminate |
|---|---|
| D — Babylon.js | `babylon-vrm-loader` is VRM 0.x only; our model is VRM 1.0 |
| C — raw glTF | Strictly loses expressionManager / lookAt / bone normalization for marginal model-pool upside |
| E — MediaPipe runtime | Paradigm mismatch for caption-locked playback; legacy API deprecated; occlusion kills signing accuracy |
| F — Kalidokit | Hand solver is curl-only for all non-thumb fingers — cannot express spread-dependent handshapes |
| G — WebXR XRHand | Requires immersive XR session on hardware; no flat-browser path |

---

## #1 Fix-in-Place Plan (~10–16 hrs total)

### Step 1 — Rebuild/replace avatar with complete rig (4–7 hrs)
Get a VRM with all 30 finger bones including both pinkies (`leftLittleProximal/Intermediate/Distal` and right equivalents) and isolated ARKit brow morphs.

Path: VRoid Studio export → add ARKit blendshapes (`browDownLeft`, `browDownRight`, `browOuterUpLeft`, `browOuterUpRight`, `browInnerUp`) via HANA_Tool in Unity → re-export VRM 1.0.

Verify in VRM inspector before touching code. See [22_3D_Avatar_Model_Research.md](22_3D_Avatar_Model_Research.md) for full model sourcing details.

### Step 2 — Add `setMorph()` abstraction to SignAvatar.js (2–3 hrs)

Replace scattered `expressionManager` calls with a single helper that tries the registered expression first and falls back to raw morph target access:

```js
// In SignAvatar.js — replaces all direct expressionManager calls
function setMorph(vrm, name, weight) {
  if (!vrm) return;
  // Path 1: registered VRM expression (standard + custom ARKit names)
  const em = vrm.expressionManager;
  if (em && em.getExpression(name)) {
    em.setValue(name, weight);
    return;
  }
  // Path 2: raw morph target on face mesh (Fcl_* VRoid names, etc.)
  vrm.scene.traverse((obj) => {
    if (!obj.isMesh || !obj.morphTargetDictionary) return;
    const idx = obj.morphTargetDictionary[name];
    if (idx !== undefined) obj.morphTargetInfluences[idx] = weight;
  });
}
```

This kills the "only standard names" limitation permanently and is renderer-agnostic.

### Step 3 — Add load-time bone and blendshape validator (1–2 hrs)

Probe all 30 finger bones (handling both VRM 0.0 and 1.0 thumb naming) and the four brow morphs at model load. Log warnings and degrade gracefully so a bad model cannot silently break a live demo:

```js
// Call immediately after VRM loads, before first frame
function validateVRMRig(vrm) {
  const h = vrm.humanoid;
  const missing = [];

  // Fingers — VRM 1.0 bone names
  const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
  const thumbJoints = ['Metacarpal', 'Proximal', 'Distal'];       // VRM 1.0 thumb
  const fingerJoints = ['Proximal', 'Intermediate', 'Distal'];

  ['left', 'right'].forEach(side => {
    const S = side.charAt(0).toUpperCase() + side.slice(1);
    fingers.forEach(finger => {
      const joints = finger === 'Thumb' ? thumbJoints : fingerJoints;
      joints.forEach(joint => {
        const name = `${side}${finger}${joint}`;
        if (!h.getNormalizedBoneNode(name)) {
          // VRM 0.0 fallback check for thumb
          if (finger === 'Thumb' && joint === 'Metacarpal') {
            const v0name = `${side}ThumbProximal`;
            if (!h.getNormalizedBoneNode(v0name)) missing.push(name);
          } else {
            missing.push(name);
          }
        }
      });
    });
  });

  if (missing.length > 0) {
    console.warn('[SignAvatar] Missing bones — fingerspelling degraded:', missing);
  }

  // Brow blendshapes
  const browMorphs = ['browDownLeft', 'browDownRight', 'browOuterUpLeft', 'browOuterUpRight'];
  const missingBrows = browMorphs.filter(name => {
    const em = vrm.expressionManager;
    if (em && em.getExpression(name)) return false;
    let found = false;
    vrm.scene.traverse(obj => {
      if (obj.isMesh && obj.morphTargetDictionary?.[name] !== undefined) found = true;
    });
    return !found;
  });

  if (missingBrows.length > 0) {
    console.warn('[SignAvatar] Missing brow blendshapes — NMM brow isolation degraded:', missingBrows);
  }

  return { missingBones: missing, missingBrows };
}
```

### Step 4 — Re-tune handshape JSONs against new rig (2–3 hrs)

New mesh = slightly different rest pose. Re-verify fingerspelling letters, especially all letters using the pinky: **I, J, Y, D, F, W, X**.

### Step 5 (Optional) — Record 3–5 hardest signs as video fallback (1 hr)

Have option H ready if the rig misbehaves on demo day.

---

## Bone Naming Reference

### VRM 1.0 thumb vs VRM 0.0 thumb (the common breakage point)

| Joint | VRM 0.0 name | VRM 1.0 name |
|---|---|---|
| Thumb base | `leftThumbProximal` | `leftThumbMetacarpal` |
| Thumb middle | `leftThumbIntermediate` | `leftThumbProximal` |
| Thumb tip | `leftThumbDistal` | `leftThumbDistal` |

`leftThumbIntermediate` exists in 0.0 but not in 1.0. `@pixiv/three-vrm` normalizes 0.0 models internally, but hardcoded strings in JavaScript will break against the wrong spec version.

### Non-thumb finger joints (same in both versions)

```
{side}{Finger}Proximal       ← base joint (knuckle)
{side}{Finger}Intermediate   ← middle joint  ← "Intermediate" NOT "Middle"
{side}{Finger}Distal         ← tip joint
```

"Middle" is a *finger name* (`rightMiddleProximal`), not a joint name.

### Finger letters broken by missing pinkies (current model)

Letters **I, J, Y, D, F, W, X** all require `leftLittleProximal/Intermediate/Distal` or `rightLittle*` — currently absent in `sign.vrm`.

---

*Sources: @pixiv/three-vrm v3 release notes, babylon-vrm-loader feature table, MediaPipe Tasks migration guide, Kalidokit hand solver documentation, WebXR Device API spec (hand-tracking feature requirement), SignON EU project GLB pipeline documentation.*
