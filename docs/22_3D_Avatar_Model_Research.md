# 22 — 3D Avatar Model Research
*Researched: 2026-06-30 | Current model: VRoid Studio 2.13.0 export, VRM 1.0, 12.25 MB, author: arka*

---

## Current Model Audit (sign.vrm)

| Property | Value |
|---|---|
| Format | VRM 1.0 (VRMC_vrm) |
| Generator | VRoid Studio 2.13.0 |
| File size | 12.25 MB |
| Nodes | 91 |
| Meshes | 2 · Materials: 12 · Animations: 0 |
| Blendshapes | 57 unique (Fcl_* VRoid convention) — full vowel set A/I/U/E/O present |
| Brow shapes | Emotion presets only (Fcl_BRW_Angry/Fun/Joy/Sorrow/Surprised) — **no isolated brow control** |
| Finger bones | **Pinky MISSING on both hands** — only 8 fingers rigged (Index/Middle/Ring/Thumb) |
| License | personalNonProfit only · credit required · no redistribution · no modification |

### Known gaps in current model
1. **Missing pinkies** — `leftLittleProximal/Intermediate/Distal` and `rightLittle*` do not exist. Letters I, J, Y, D, F, W, X fingerspell incorrectly (pinky target bones silently absent).
2. **No isolated brow blendshapes** — `browDownLeft`, `browDownRight`, `browOuterUpLeft`, `browOuterUpRight` absent. WH-question and YN-question NMMs fall back to symmetric emotion presets (🟡 Partial in GAP_ANALYSIS-v2.md).

---

## The Two Decisive Realities for a Sign-Language Avatar

**Reality 1 — Finger bones are essentially solved by the VRM spec.** Any properly authored VRM has a standardized finger skeleton. Each hand: thumb is Metacarpal → Proximal → Distal; Index/Middle/Ring/Little are Proximal → Intermediate → Distal (3 bones each = 30 finger bones total). VRoid Studio emits all of these automatically.

**Reality 2 — Isolated, asymmetric brow control is the hard part, not the hands.** VRM's standard expression system is built around whole-face emotions. `browDownLeft/Right/browOuterUpLeft/Right` (ARKit naming) are not present in a vanilla VRoid export. This requires a post-processing step (HANA_Tool or equivalent) — doable but non-trivial.

---

## Platform Research

### 1. VRoid Studio (Pixiv) — free desktop/iPad

**Verdict: Primary recommended path.**

- **Per-finger bones:** Yes, automatic. Full humanoid including all 10 fingers.
- **South Asian appearance:** Skin tone fully adjustable via slider. Face is anime-stylized — not photorealistic.
- **Hand mesh quality:** Good topology, clean deformation, slightly tapered anime fingers. Sufficient for fingerspelling legibility since bones matter more than mesh.
- **Custom brow blendshapes:** Brow morphs (Fcl_BRW_*) are symmetric by default. True left/right isolation requires HANA_Tool post-processing step (see Gotchas).
- **Time to usable model:** 1–3 hours from first open, faster starting from a sample model.
- **License:** Free; broad commercial + educational use.
- **Format:** VRM 0.0 or VRM 1.0 (select on export).

---

### 2. VRoid Hub (hub.vroid.com) — model sharing platform

- **License filters:** Filter by "Free" + "Available for Commercial Use". Check the per-model detail page. No true CC0 available (Pixiv policy prevents it to avoid VRM license conflicts).
- **Exception — CC0 sample models:** Pixiv's own `AvatarSample_A/B/C` are CC0. Also mirrored at GitHub: `madjin/vrm-samples`.
- **Per-finger bones:** Guaranteed on any VRoid-origin model. Hand-built customs need verification.
- **Verifying finger bones before download:** Cannot fully introspect from the web page. Download and inspect with the [opensourceavatars.com VRM Inspector](https://opensourceavatars.com) or load in a VRM tool.
- **South Asian appearance:** Very limited — VRoid Hub skews heavily anime. Better to recolor skin yourself in VRoid Studio.
- **Search terms that help:** Filter by license first; "South Asian" / "Indian" / "Bengali" yield very little useful.

---

### 3. Ready Player Me — **DISCONTINUED** (January 31, 2026)

RPM shut down its public avatar creation services on 2026-01-31 after Netflix acquisition. The online avatar creation tool, PlayerZero, and developer APIs no longer function. **Off the table for new projects.**

*For the record:* RPM's rig had full finger bones (Mixamo-compatible skeleton) and the newer XR variant had an OpenXR-compliant hand rig. Format was **GLB only, never VRM** — conversion always required Blender+Unity. Moot now.

---

### 4. Mixamo (Adobe) — auto-rigger, not an avatar source

- **Finger bones:** Present when auto-rig works correctly. Fragile — Mixamo sometimes produces only 2–3 finger bones when source fingers are too close together in the mesh. For sign language, an unreliable finger rig is disqualifying.
- **Facial blendshapes:** **None** — Mixamo strips/ignores facial morphs. Zero expressions. Dealbreaker for NMM requirements.
- **VRM conversion:** Possible but multi-step (Blender → Unity + UniVRM, or Blender VRM add-on). Mixamo bone naming (`mixamorig:LeftHandIndex1`) must be remapped to VRM humanoid names.
- **Verdict:** Use Mixamo for *body animation clips* if ever needed — not as an avatar source.
- **License:** Free for educational/personal use.

---

### 5. avaturn.me — realistic, GLB-only

Best option **if photorealistic South Asian appearance outranks integration simplicity.**

- **Appearance:** Generated from a selfie. Best realism of any free option.
- **Facial blendshapes:** ARKit set natively on T2-type avatars — includes `browDownLeft/Right` and `browOuterUpLeft/Right`. T1 avatars have static faces with no usable blendshapes — use T2 only.
- **Finger rig:** Present but quality unverified for sign language use — verify per-finger phalanges before committing.
- **Format:** GLB only — requires Blender/UniVRM conversion to VRM.
- **License:** Free tier; check ToS for public demo / commercial use.

---

### 6. Sketchfab — parts bin, not a source

Many CC-licensed rigged humans exist, but almost none combine all three of: finger bones + facial blendshapes + VRM format. Meaningful Blender work required to add blendshapes and convert. Use as a last resort or for reference meshes.

---

### 7. Open-Source Sign Language Avatar Projects

**JASigning / CWASA (University of East Anglia)**
- Reference academic signing system driven by SiGML/HamNoSys notation.
- Avatars (Anna, Marc) are tied to its own WebGL runtime — not drop-in VRM/glTF assets.
- **Not usable as a model source** for a three-vrm app. Valuable as a *linguistic/notation* reference.
- Known limitation: scarce support for Non-Manual Features (brow/NMM) — exactly the gap this project faces.

**SignON Project (EU)**
- Documents a pipeline generating high-quality characters across gender, race, age, size — exporting as GLB from Blender's glTF 2.0 export.
- A recent WebMedia paper on automatic sign-language animation uses a humanoid VRM-format model, validating the three-vrm stack choice.

**opensourceavatars.com**
- 300+ free CC0-licensed VRM avatars.
- Includes a browser-based **VRM Inspector** — view metadata, textures, 3D model, and bone map. Use this to verify finger bones on any candidate before committing.
- Limited South Asian representation but cleanest license possible.

---

## Evaluation Matrix

| Option | Finger rig | Brow isolation | License (public demo) | South Asian/female | Load perf | Integration effort | lookAt |
|---|---|---|---|---|---|---|---|
| **VRoid Studio** | ✅ Automatic, all 10 | 🟡 Needs HANA_Tool | ✅ Free, broad | Skin yes; anime face | ✅ Controllable | **Drop-in VRM** | ✅ Native |
| **avaturn (T2)** | 🟡 Present — verify | ✅ ARKit native | 🟡 Check ToS | ✅ Best realism | ✅ 5–15 MB | GLB→VRM conversion | Via setup |
| **VRoid Hub (CC0 samples)** | ✅ If VRoid-origin | 🟡 Needs HANA_Tool | ✅ CC0 (sample models) | ❌ Limited | Varies | **Drop-in VRM** | ✅ Native |
| **opensourceavatars.com** | 🟡 Verify per model | 🟡 Varies | ✅ CC0 | ❌ Limited | Varies | **Drop-in VRM** | Usually |
| **Mixamo** | ❌ Unreliable | ❌ None | ✅ Free educational | Depends on input | ✅ Good | Heavy (rig+blendshapes+VRM) | ❌ No |
| **Sketchfab** | 🟡 Varies | ❌ Rarely | CC varies | Some options | Varies | Heavy (Blender+convert) | ❌ No |
| **JASigning avatars** | N/A (own runtime) | ❌ Limited NMM | Free with JASigning | Anna/Marc presets | N/A | ❌ Not VRM-compatible | N/A |

---

## Final Recommendation — Ranked Top 3

### #1 — VRoid Studio (build custom "Riya")

Only option simultaneously free, sustainable, VRM-native, drop-in for `@pixiv/three-vrm`, and guaranteed complete finger rig. Full skin-tone and attire control. One weakness — anime-stylized face and symmetric default brows — is fixable via HANA_Tool.

### #2 — avaturn (T2 type)

Best if photorealistic South Asian appearance outranks integration simplicity. Trade: GLB→VRM conversion + finger-rig verification. Gain: genuine realism and native ARKit brow blendshapes (eliminates the NMM gap without HANA_Tool).

### #3 — CC0 VRM from opensourceavatars.com

Fastest fallback or prototype base while building the VRoid model. Cleanest license. Limited South Asian representation; verify rig per-model.

---

## Exact Steps — VRoid Studio → SignOLight Pipeline

1. **Install VRoid Studio** — free from vroid.com or Steam. iPad version also available.

2. **Build Riya:** start from a female sample model. Set South-Asian skin tone via slider. Style hair and attire. Keep hands at default detail.

3. **Tune expressions** in the Face/Expression editor. Confirm at minimum: Neutral, Joy, Angry, Sorrow, Surprised, and vowel visemes A/I/U/E/O.

4. **Export as VRM 1.0** — matches `@pixiv/three-vrm`'s canonical bone naming.
   - Required fields: Avatar name, Creator name.
   - **Do not aggressively decimate the hand mesh or reduce bones** — keep all finger bones intact.

5. **Add isolated brow blendshapes** (critical for WH/YN NMMs):
   - Import the VRM into Unity with **UniVRM** plugin.
   - Run **HANA_Tool** — adds the full ARKit "Perfect Sync" set including `browDownLeft`, `browDownRight`, `browInnerUp`, `browOuterUpLeft`, `browOuterUpRight`.
   - Re-export the VRM from Unity.
   - *Lighter alternative:* VSeeFace supports adding two custom VRM blendshape clips ("Brows up" / "Brows down") but gives symmetric-only control — insufficient for true left/right WH/YN distinction.

6. **Verify** in the [opensourceavatars.com VRM Inspector](https://opensourceavatars.com):
   - Confirm all 30 finger bones present (including `leftLittleProximal/Intermediate/Distal` and right equivalents).
   - Confirm `browDownLeft/Right` exist as expressions.

7. **Drop into pipeline** — replace `frontend/public/models/sign.vrm`. The existing `vrm.humanoid` bone alias calls and `vrm.expressionManager` probe pick everything up automatically.

---

## Gotchas

### The thumb-naming version trap (most common breakage)

Finger bone names differ between VRM 0.0 and VRM 1.0 **for the thumb only:**

| Joint | VRM 0.0 | VRM 1.0 |
|---|---|---|
| Thumb base | `leftThumbProximal` | `leftThumbMetacarpal` |
| Thumb middle | `leftThumbIntermediate` | `leftThumbProximal` |
| Thumb tip | `leftThumbDistal` | `leftThumbDistal` |

`leftThumbIntermediate` **exists in VRM 0.0 but not in VRM 1.0**. If code addresses the thumb's middle joint by the 0.0 name, it silently fails against a 1.0 model (and vice versa). `@pixiv/three-vrm` normalizes 0.0 models internally, but hardcoded bone-name strings in your JavaScript will break.

**Recommendation:** Standardize on VRM 1.0 and audit any hardcoded thumb joint strings in [SignAvatar.js](../frontend/src/components/SignAvatar.js).

### "Intermediate" ≠ "Middle" — finger naming

The middle joint of each non-thumb finger is `...Intermediate` (e.g., `rightIndexIntermediate`). "Middle" is a *finger name* (`rightMiddleProximal`). Easy to conflate in code.

### VRoid default expressions are whole-face, not atomic

VRoid expressions affect the whole face — "Fun" triggers mouth and eyebrows together. The HANA_Tool step in item 5 above is mandatory for isolated WH/YN brow NMMs. Do not expect `browDownLeft` on a vanilla VRoid export.

### Probe defensively at load time

Keep the existing `expressionManager` probe for `browDownLeft/Right` and maintain graceful fallback (symmetric `Fcl_BRW_Angry` or Angry preset) when ARKit clips are absent. This protects against swapping in a model that skipped the HANA_Tool step.

### Version-tag your exports

Convention worth adopting: add `[VRM0]` or `[VRM1]` to the filename. Loading the wrong version into a tool silently produces wrong-looking results.

---

## Bone Alias Reference — Full Finger Map (VRM 1.0)

```
Left hand:
  leftThumbMetacarpal · leftThumbProximal · leftThumbDistal
  leftIndexProximal · leftIndexIntermediate · leftIndexDistal
  leftMiddleProximal · leftMiddleIntermediate · leftMiddleDistal
  leftRingProximal · leftRingIntermediate · leftRingDistal
  leftLittleProximal · leftLittleIntermediate · leftLittleDistal   ← currently MISSING in sign.vrm

Right hand: same pattern with "right" prefix
```

Letters broken by missing pinkies in current model: **I, J, Y, D, F, W, X**

---

*Sources: VRoid Studio documentation, VRoid Hub license FAQ, avaturn.me product pages, Adobe Mixamo help, opensourceavatars.com, JASigning/CWASA project pages, SignON EU project documentation, @pixiv/three-vrm VRM humanoid bone spec.*
