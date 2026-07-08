# GAP_ANALYSIS-v2.md
*Roadmap PDF vs. Current Implementation — updated 2026-06-30 (post Week 1 + Week 2 + sync fix sprint + NLP pipeline sprint + PART F Bangla sprint + accuracy audit)*

Status key: ✅ Implemented | 🟡 Partial | ❌ Missing

---

## PART A — Sign Language Avatar Research

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| Avatar architecture family | "Dictionary playback + timeline-locked — the only responsible hackathon choice" | Dictionary playback + Three.js/VRM + cross-sign blending | ✅ Implemented | None | Low | — | Correct choice |
| Avatar quality expectation | "2.62/5 comprehension — do not over-invest in realism" | Disclaimer in LandingPage + SignDemoPage footer AND PlayerPage avatar panel (subtitle strip: "Educational prototype · Comprehension 2.5–3.5/5 (Quandt et al. 2022)") | ✅ Implemented | None | — | — | Added to PlayerPage in sync-fix sprint |
| Value proposition framing | "Educational scaffolding (captions + simplified text + avatar)" | Landing page shows value chain; `simplifyBatch()` added; CaptionBar shows simplified row | ✅ Implemented | None | — | — | Correctly implemented |
| Neural generation avoidance | "Do NOT pursue neural gloss-to-motion" | Not present | ✅ Implemented | None | — | — | Correct |
| Co-design with Deaf community | "Recruit at least one Deaf BdSL signer NOW." | No Deaf collaborator documented anywhere | ❌ Missing | Full gap | Critical | P0 | Recruit immediately — single biggest external risk |
| Research framing | "Honest prototype, not a replacement" | Caveat visible on LandingPage, SignDemoPage, AND PlayerPage (disclaimer strip below avatar panel header) | ✅ Implemented | None | — | — | Completed in sync-fix sprint |

---

## PART B — Gloss-to-Avatar Research

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| Notation-driven approach | HamNoSys→SiGML path is production-best; clip dictionary also valid | Clip dictionary + procedural fallback + `notation.js` articulatory space | ✅ Implemented | No HamNoSys (acceptable) | Low | — | Correct for scope |
| Clip dictionary | "Expand dictionary for one lecture domain" | 27 clips total (17 social + 10 domain) — NETWORK, TRAIN, DATA, INPUT, OUTPUT, NEURON, LAYER, FUNCTION, CONNECT, SIGNAL | 🟡 Partial | 26 of 36 domain words still have no JSON clip files — procedural motion only | Medium | P1 | Words without clips now route: procedural motion → fingerspell (if tagged by LLM) → enriched concept card with Groq definition. Clip creation remains the only fix. |
| Within-clip blending | "implement cross-fade/IK blending" | `applyVrmClip` lerps between keyframes (smoothstep) | ✅ Implemented | None | — | — | Correct |
| Cross-sign transition | "transition smoothness" | 100ms smoothstep bone lerp between signs via closure vars in animate loop | ✅ Implemented | None | — | — | Implemented Week 2.2 |
| Neural generation | "Methods 3 and 4 are research problems — NOT feasible for BdSL" | Not present | ✅ Correctly absent | None | — | — | Correct |
| Missing motions in applyVrmMotion | `spread-hands` (NETWORK, MATRIX) and `flat-hand` (LAYER, IMAGE) not implemented | Both cases added to VRM path (line 463, 473) and fallback path (line 877, 887) | ✅ Implemented | None | — | — | Fixed Week 1.2 |
| Fingerspelling (proper nouns, abbreviations) | "Fingerspell the word" per doc 10 fallback hierarchy | `[FINGERSPELL:X]` bracket notation parsed in `getSignInfo`; letter ticker overlay + 26-letter `FINGERSPELL_HANDSHAPES` pose map; LLM prompt instructs `[FINGERSPELL:X]` for proper nouns | ✅ Implemented | BdSL manual alphabet not validated by Deaf signer (placeholder poses) | Low | P2 | NLP pipeline sprint |
| Unknown-word concept card | "Show concept card with brief text explanation" per doc 10 | `[CONCEPT:X]` bracket notation routed to concept card; `enrichConceptCards()` makes one Groq call per batch to pre-generate 5–10 word definitions stored as `caption.conceptExplanations` | ✅ Implemented | None | — | — | NLP pipeline sprint |

---

## PART C — Real-Time Synchronization Research

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| Timeline-locked scheduling | "Most practical; production-ready. Recommended." | Binary search `findCaption()` every **100ms** (reduced from 250ms) via `timelineScheduler.js`; clips preloaded per-caption to eliminate first-load lag; syllable-weighted word timing | ✅ Implemented | None | Low | — | Sync-fix sprint: poll 250→100ms, caption preload, syllable weighting |
| Word-level timestamps | "WhisperX: sub-100ms accuracy word timestamps" | `POST /nlp/timestamps` on NLP service downloads audio via yt-dlp, runs WhisperX + phoneme alignment, returns per-word `{ startMs, endMs, score }`. Node backend calls this in parallel with Groq; attaches as `caption.spokenTimings`. `computeWordTimings()` uses `spokenTimings[0].startMs` → `spokenTimings[last].endMs` as speech boundaries instead of caption metadata span. | 🟡 Code done — needs deployment | Code complete; free deployment on **Hugging Face Spaces** (16 GB RAM, Docker). Requires `NLP_SERVICE_URL` set in Render backend env. See `docs/WHISPERX_DEPLOYMENT.md`. Gloss-to-spoken word alignment remains approximate (SOV reorder means 1:1 mapping is impossible without BdSL ASR corpus) | Medium | Phase B2 | Deploy `backend_nlp/` as HF Space, set `NLP_SERVICE_URL` in Render backend |
| Seek handling | "Seek → state reset + re-evaluate within ~500ms" | `seekingRef.current = true` BEFORE `setPlayerState("seeking")`; binary search snaps immediately | ✅ Implemented | None | Low | — | Correct |
| Pause/resume handling | "Pause → freeze; Resume → correct position" | `if (playerState === "paused") return` guard; resume triggers `findCaption` | ✅ Implemented | None | Low | — | Correct |
| Catch-up / skip buffer | "Implement a catch-up/skip buffer" | `resolveSignState` returns `isCatchingUp = wordProgress ≥ 0.65`; `SignAvatar3D` reads `snapRef` and skips the 100ms bone blend when catching up — avatar snaps directly to target pose instead of animating through a sign that is almost over | ✅ Implemented | None | — | — | PART C sprint |
| Sync drift measurement | "≤2s at 5-minute intervals" | `driftRef` + `debugDriftMs` — measures caption-midpoint deviation every 2s; shown in debug panel | ✅ Implemented | Metric can now be verified | — | — | Implemented Week 2.4 |
| Streaming buffer (live mic) | "Out of scope for hackathon" | Not present | ✅ Correctly absent | None | — | — | Phase B only |

---

## PART D — Facial Expressions and Non-Manual Markers

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| WH-question eyebrow furrow | "Furrowed brows; highest grammatical load" | `"wh-question"` → `applyVrmExpression(vrm, "firm", time, intensity, "ou", customBrow)` — brow probe at load auto-wires isolated brow blendshapes if model exposes them; falls back to angry=0.55 if not | 🟡 Partial | Brow isolation requires model to have `browDownLeft/Right` custom blendshapes — standard VRM preset does not. Runtime probe confirms at startup. Cannot reach ✅ without a different VRM model file. | Medium | P2 (model constraint) | Probe logs result to console. Expressiveness significantly enhanced by gaze (thinking down-right) + mouth (ou pursed lips) alongside the brow approximation. |
| YN-question eyebrow raise | "Raised eyebrows held throughout" | `"yn-question"` → `applyVrmExpression(vrm, "question", time, intensity, "aa", customBrow)` — brow probe at load; falls back to surprised=0.55 | 🟡 Partial | Same model constraint as WH. Cannot reach ✅ without custom blendshapes in the VRM file. | Low | P2 (model constraint) | Enhanced by gaze (direct at camera) + mouth (aa open lips). |
| Negation head-shake | "Head-shake is the grammatical core" | `"negation"` → `applyVrmExpression(vrm, "sad", time, intensity, "ih", customBrow)` + head oscillation + assertive left gaze | ✅ Implemented | Visually distinct from WH (sad vs firm, ih vs ou, left vs right gaze) | — | — | All three NMM types fully differentiated |
| NMM timing onset/offset | "Synchronize NMM onset with correct sign" | `effectiveNMM` word-onset gating + 200ms `nmmActiveSince` fade-in ramp | ✅ Implemented | None | — | — | |
| NMM visual differentiation | WH ≠ YN ≠ negation | WH: firm+ou+thinking-gaze; YN: surprised+aa+camera-gaze; NEG: sad+ih+head-shake+left-gaze | ✅ Implemented | None | — | — | All three distinguishable across 3 channels |
| Mouth morphemes | "Disambiguate otherwise-identical manual signs" | NMM-context mouth shapes via VRM vowel presets: WH→"ou" (0.30, pursed); YN→"aa" (0.20, open); NEG→"ih" (0.25, tight) | ✅ Implemented (approximation) | Not BdSL-linguistically accurate — uses generic vowel shapes as visual proxies. True BdSL mouth morphemes require custom blendshapes. | Low | — | Implemented via `mouthShape` param in `applyVrmExpression`. Labeled approximation in code. |
| Eye gaze directionality | "Marks role shift, agreement" | `vrm.lookAt.target = gazeTarget` wired at VRM load. Per-frame: YN→camera (0,0.62,4.3); WH→thinking down-right (0.18,0.28,3.0); NEG→assertive left (−0.3,0.5,3.5); idle→slow drift; signing→audience (0,0.5,3.5). Lerped at α=0.05 | ✅ Implemented | `vrm.lookAt` is null if model has no lookAt section — guard in place, silently degrades. Eye gaze marks discourse position, not full role-shift (that requires gloss annotation). | Low | — | Implemented via `gazeTarget` Object3D + per-frame lerp in animation loop |
| NMM on fallback avatar | "Fallback avatar should also show NMM" | WH: "firm"; YN: "question"; NEG: "sad" + head-shake | ✅ Implemented | None | — | — | |

---

## PART E — 3D Avatar Models

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| VRM / three-vrm | "Stay with VRM — only option meeting all constraints" | `@pixiv/three-vrm` + GLTFLoader + VRMLoaderPlugin | ✅ Implemented | None | — | — | Correct |
| Per-finger joints | "Verify hand rig has per-finger joints" | 124-bone BONE_ALIASES including all 3 phalanges × 10 fingers | ✅ Implemented | — | — | — | Correct |
| Face blendshapes | "VRM supports ARKit-style 52-blendshape sets" | `applyVrmExpression` uses expressionManager (happy/sad/angry/surprised/relaxed/aa) | 🟡 Partial | Only 6 of ~52 blendshapes wired; no eyebrow-isolated control | Medium | P2 | Wire `brow_down_left/right` if model has them |
| Fallback avatar | Graceful degradation | `createFallbackAvatar()` with NMMs applied | ✅ Implemented | None | — | — | Fixed Week 1.1 |
| Model size / performance | "12MB/36k-poly model is ideal" | 12MB sign.vrm at `/public/models/sign.vrm` | ✅ Implemented | — | — | — | Correct |
| Cross-sign blending (IK) | "Implement cross-fade/IK blending" | 100ms smoothstep bone lerp on sign transitions | ✅ Implemented | No full IK system (bone-delta lerp only) | Low | — | Sufficient for Phase A |
| MetaHuman / Unreal | "Not browser-deployable; irrelevant" | Not present | ✅ Correctly absent | — | — | — | Correct |

---

## PART F — Bangla Sign Language

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| Bangla-SGP dataset usage | "The most relevant resource for your gloss step" | 10 grounded example pairs from arXiv:2511.08507 in `buildGlossPrompt()` | ✅ Implemented | None | — | — | Week 3.2 |
| BdSL grammar in gloss prompt | "SOV, topic-comment — mandatory" | Full BdSL grammar rules in both single and batch prompts; SIGN_VOCAB list (58 words) instructs LLM to prefer known signs; `[FINGERSPELL:X]` and `[CONCEPT:X]` bracket syntax for unknowns; no "ASL" string | ✅ Implemented | — | — | — | NLP pipeline sprint: vocabulary-constrained prompt |
| Honest dictionary framing | "Curated dictionary covers N signs — be honest" | `computeDictionaryCoverage` displayed in CaptionBar as "BdSL coverage: X%" | ✅ Implemented | — | — | — | Implemented Week 2.6 |
| Text simplification pipeline | "captions → simplified → gloss" | `simplifyBatch()` runs before `batchTextToSignGloss()`; `caption.simplified` shown in CaptionBar | ✅ Implemented | — | — | — | Implemented Week 1.3 |
| simpleGloss BdSL grammar | "Fallback must not be plain English order" | SOV heuristic: 35-verb set moves predicates to end | ✅ Implemented | Heuristic only; not validated | Low | — | Implemented Week 2.5 |
| No neural BdSL generation | "Cannot train — no corpus" | Not attempted | ✅ Implemented | — | — | — | Correct |
| Bangla audio / code-switching | "Phase B1 — prompt engineering first" | `detectBangla()` in `routes/sign.js` detects Unicode U+0980–U+09FF; `buildGlossPrompt()` appends MIXED BANGLA-ENGLISH instructions + 3 mixed example pairs when Bangla detected; `simpleGloss()` preserves Bangla tokens through stop-word filter (regex updated to `[^\w\sঀ-৿]`); `_gloss_mixed_bangla()` in `pipeline.py` routes Bengali tokens to concept cards | ✅ Implemented | Phase B1 prompt engineering complete. Gloss accuracy depends on Groq's Bengali understanding — validated output requires BdSL community collaborator. | Medium | Phase B1 ✅ | Prompt engineering done. To improve: recruit BdSL signer to validate code-switching output. |
| WhisperX Bengali ASR | "Phase B2" | `timestamps.py` already auto-detects language via `result.get("language","en")` — Bengali audio triggers `language_code="bn"` alignment automatically. Return type updated to `{"words": [...], "language": "bn"}`. Dockerfile now installs `bn_core_news_sm` (graceful failure if unavailable). `_gloss_mixed_bangla()` in `pipeline.py` handles Bengali/mixed NLP input without English spaCy. | 🟡 Partial — code complete | WhisperX Bengali alignment auto-detects language at code level. Real gaps: (1) deployment needed to verify `bn` forced alignment model works on lecture audio; (2) `bn_core_news_sm` spaCy has limited vocabulary — Bengali tokens still route to concept cards. | Medium | Phase B2 | Code complete. Deploy `backend_nlp/` as HF Space, test with Bengali YouTube URL, check logs for `[timestamps] language detected: bn`. |
| BdSL community collaborator | "Every system that succeeded did co-design." | Not present in code. Outreach document created: `docs/BdSL_COLLABORATOR_OUTREACH.md` — lists contacts (DISS Dhaka, BRAC ICED, Bangla-SGP team), ready-to-send email template, 5 validation tasks with acceptance criteria. | ❌ Missing | Human outreach required — cannot be implemented in code | **CRITICAL** | **P0** | Send email from `docs/BdSL_COLLABORATOR_OUTREACH.md` immediately. Every week without a collaborator is a week of unvalidated signs. |

---

## PART G — Problem Maturity (Assessment vs. Implementation)

| Challenge | PDF Maturity | Implementation Status | Delta |
|---|---|---|---|
| Caption extraction | Mature | 4-method extraction ✅ | On target |
| Text simplification | Low-Medium difficulty, LLMs do well | `simplifyBatch()` implemented ✅ | On target |
| Gloss generation via LLM | Emerging, Medium-High risk | Groq + BdSL prompt + SIGN_VOCAB constraints + few-shot + `[FINGERSPELL:X]`/`[CONCEPT:X]` typed output + concept card enrichment ✅ | On target |
| Sign dictionary lookup | Mature, Low difficulty | 58 SIGN_MOTIONS + 27 clips (10 domain); unknown words routed: bracket-parse → fingerspell/concept card | Partial — 26 domain words no clips (fallback improved) |
| Pre-baked clip playback | Solved | `applyVrmClip` + `signClipCache` + validation ✅ | On target |
| Smooth animation blending | Medium (transition artifacts) | 100ms cross-sign smoothstep lerp ✅ | On target |
| Non-manual markers | High difficulty | 3 rules, expressions + head-shake, word-onset gated ✅ | On target |
| Real-time sync (recorded) | Medium, solvable | Binary search + state machine + drift telemetry ✅ | On target |
| Seek/pause handling | Medium, engineering | Fully implemented ✅ | On target |
| BdSL linguistic correctness | Nascent, High risk | Grammar prompt + SOV fallback + vocabulary constraints; no community validation | Partial |
| Educational effectiveness | Medium | No study, no measurement | Behind |
| Open vocabulary / unknown words | High difficulty | Vocabulary-constrained LLM → `[FINGERSPELL:X]`/`[CONCEPT:X]` tags → enriched concept card (Groq definitions) + fingerspell letter ticker ✅ | NLP pipeline sprint |

---

## PART H — Research Roadmap Alignment

| Roadmap Priority | Status | Implementation File(s) | Remaining Gap |
|---|---|---|---|
| 1. Real-time sync architecture | ✅ Done | `PlayerPage.js`, `YouTubePlayer.js`, `utils/sync.js`, `services/timelineScheduler.js` | None — pre-first-word guard added (PART H sprint): `resolveSignState` now correctly returns first word at progress 0 when spokenTimings push effectiveStart past captionStart, instead of incorrectly showing the last word |
| 2. Gloss-to-clip dictionary + blending | 🟡 Partial | `SignAvatar.js` — 27 clips, 100ms transition, fingerspell + concept card fallback | 26 domain words still no JSON clips |
| 3. LLM gloss tuned to BdSL | ✅ Done | `routes/sign.js` — SIGN_VOCAB constraints, BdSL grammar, 8 arXiv examples, bracket notation, concept enrichment | No Deaf signer validation (P0 non-code gap) |
| 4. Basic rule-based NMMs | ✅ Done | `utils/sync.js`, `SignAvatar.js`, `services/timelineScheduler.js` | Brow isolation (P2) |
| 5. BdSL gloss notation standard | ❌ Post-hackathon | — | Phase 1 |
| 6. Ham2Pose notation→motion | ❌ Post-hackathon | — | Phase 2 |
| 7. Motion capture BdSL signers | ❌ Post-hackathon | — | Phase 2 |
| 8. Educational effectiveness study | 🟡 Partial | `docs/testing_log.md` — 129-test automated suite (74 backend + 55 frontend); human participant protocol defined | Needs 1+ DHH participant session |

---

## Remaining Gaps Summary (Ranked by Impact)

| # | Gap | File | Impact | Effort | Priority |
|---|---|---|---|---|---|
| 1 | **No Deaf BdSL signer/collaborator** — every system that failed skipped this | Non-code | Critical: legitimacy + correctness risk | Outreach | **P0** |
| 2 | **26 of 36 domain words still have no clip files** — fall to procedural motion or concept card | `/frontend/public/signs/` | Medium: domain demo still mostly procedural (fallback now shows Groq definitions or fingerspells proper nouns) | High effort | **P1** |
| 3 | ~~**Cache is volatile**~~ — **RESOLVED**: two-layer cache (hot Map + `backend/cache/*.json` files) | `server.js` | — | — | ✅ Done (Week 3.3) |
| 4 | ~~**No honest prototype disclaimer**~~ — **RESOLVED**: Quandt 2022 citation on LandingPage, SignDemoPage, **and PlayerPage** avatar panel | `LandingPage.js`, `SignDemoPage.js`, `PlayerPage.js` | — | — | ✅ Done |
| 5 | ~~**Custom Bangla-SGP examples**~~ — **RESOLVED**: 8 pairs grounded in arXiv:2511.08507 | `routes/sign.js` | — | — | ✅ Done (Week 3.2) |
| 6 | ~~**Sync latency (250ms poll)**~~ — **RESOLVED**: poll reduced to 100ms; clips preloaded on caption change; syllable-weighted timing | `YouTubePlayer.js`, `SignAvatar.js`, `timelineScheduler.js` | — | — | ✅ Done (sync-fix sprint) |
| 7 | ~~**SOV order confusing users**~~ — **RESOLVED**: "(BdSL order)" label added to gloss row in CaptionBar | `CaptionBar.js` | — | — | ✅ Done (sync-fix sprint) |
| 8 | ~~**Open vocabulary — unknown words crash silently to concept card**~~ — **RESOLVED**: vocabulary-constrained LLM, `[FINGERSPELL:X]`/`[CONCEPT:X]` bracket routing, enriched concept cards (Groq definitions), fingerspell letter ticker | `SignAvatar.js`, `routes/sign.js`, `server.js` | — | — | ✅ Done (NLP pipeline sprint) |
| 9 | **Comprehension testing** — automated 129 tests done (74 backend + 55 frontend); human protocol defined | `backend/__tests__/`, `frontend/src/__tests__/` | Automated ✅; Human ⏳ | — | ✅ Auto done; human pending |
| 10 | **No demo backup video** | `docs/demo_backup.mp4` | Medium: WiFi/API fail scenario | 2 hours | **P2** |
| 11 | **Syllable timing still approximate** | `timelineScheduler.js` | Medium: word windows off by ±30% | Phase B2 | Phase B (WhisperX) |
| 12 | ~~**Bangla code-switching**~~ — **RESOLVED**: `detectBangla()` + code-switching prompt section + simpleGloss Bangla guard + `_gloss_mixed_bangla()` pipeline fallback | `routes/sign.js`, `pipeline.py` | — | — | ✅ Done (PART F sprint) |
| 13 | **WhisperX Bengali ASR** | `backend_nlp/timestamps.py` auto-detects language; Dockerfile installs `bn_core_news_sm`; `_gloss_mixed_bangla()` handles Bengali NLP input. Deployment + real-audio validation still needed. | Code complete; deployment pending | Medium | Phase B2 — deploy HF Space + test with Bengali lecture URL |
