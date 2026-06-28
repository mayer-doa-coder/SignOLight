# GAP_ANALYSIS-v2.md
*Roadmap PDF vs. Current Implementation — updated 2026-06-29 (post Week 1 + Week 2 + sync fix sprint + NLP pipeline sprint)*

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
| Word-level timestamps | "WhisperX: sub-100ms accuracy word timestamps" | Syllable-weighted via `computeWordTimings()` in timelineScheduler | 🟡 Partial | Still approximation — real timestamps need WhisperX (Phase B2) | Medium | Phase B | WhisperX Python microservice in Phase B2 |
| Seek handling | "Seek → state reset + re-evaluate within ~500ms" | `seekingRef.current = true` BEFORE `setPlayerState("seeking")`; binary search snaps immediately | ✅ Implemented | None | Low | — | Correct |
| Pause/resume handling | "Pause → freeze; Resume → correct position" | `if (playerState === "paused") return` guard; resume triggers `findCaption` | ✅ Implemented | None | Low | — | Correct |
| Catch-up / skip buffer | "Implement a catch-up/skip buffer" | Binary search provides natural catch-up; drift tracker + debug panel shows live drift vs ≤2s metric | 🟡 Partial | No explicit skip-sign policy | Low | P3 | Good enough for Phase A demo |
| Sync drift measurement | "≤2s at 5-minute intervals" | `driftRef` + `debugDriftMs` — measures caption-midpoint deviation every 2s; shown in debug panel | ✅ Implemented | Metric can now be verified | — | — | Implemented Week 2.4 |
| Streaming buffer (live mic) | "Out of scope for hackathon" | Not present | ✅ Correctly absent | None | — | — | Phase B only |

---

## PART D — Facial Expressions and Non-Manual Markers

| Requirement | Roadmap Says | Current Implementation | Status | Gap | Risk | Priority | Recommendation |
|---|---|---|---|---|---|---|---|
| WH-question eyebrow furrow | "Furrowed brows; highest grammatical load" | `computeNMM` → `"wh-question"` → `applyVrmExpression(vrm, "angry", time)` — word-onset gated | 🟡 Partial | "angry" approximates furrow but not isolated brow control | Medium | P2 | Acceptable; note limitation in disclaimer |
| YN-question eyebrow raise | "Raised eyebrows held throughout" | `"yn-question"` → `applyVrmExpression(vrm, "surprised", time)` — word-onset gated | 🟡 Partial | "surprised" approximates raise but not isolated | Low | P2 | Acceptable approximation |
| Negation head-shake | "Head-shake is the grammatical core — often without a NOT sign" | `"negation"` → `"firm"` expression + `setBone(head, 0, Math.sin(time * 9) * headY, 0)` — word-onset gated | ✅ Implemented | None | — | — | Fixed Week 1.1 |
| NMM timing onset/offset | "Synchronize NMM onset with correct sign" | `computeNMM` returns `{ wordIndex }`, `effectiveNMM(nmm, currentWordIndex)` gates until avatar reaches that word | ✅ Implemented | None | — | — | Implemented Week 2.3 |
| Mouth morphemes | "Disambiguate otherwise-identical manual signs" | Not present | ❌ Missing | Full gap | Medium | P2 | Phase B; requires specific VRM blendshapes |
| Eye gaze directionality | "Marks role shift, agreement" | Not present | ❌ Missing | Full gap | Low | P3 | Post-hackathon only |
| NMM on fallback avatar | "Fallback avatar should also show NMM" | NMM expression + negation head-shake applied in fallback path | ✅ Implemented | None | — | — | Fixed Week 1.1 |

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
| Bangla-SGP dataset usage | "The most relevant resource for your gloss step" | 8 grounded example pairs from arXiv:2511.08507 in `buildGlossPrompt()` | ✅ Implemented | None | — | — | Week 3.2 |
| BdSL grammar in gloss prompt | "SOV, topic-comment — mandatory" | Full BdSL grammar rules in both single and batch prompts; SIGN_VOCAB list (58 words) instructs LLM to prefer known signs; `[FINGERSPELL:X]` and `[CONCEPT:X]` bracket syntax for unknowns; no "ASL" string | ✅ Implemented | — | — | — | NLP pipeline sprint: vocabulary-constrained prompt |
| Honest dictionary framing | "Curated dictionary covers N signs — be honest" | `computeDictionaryCoverage` displayed in CaptionBar as "BdSL coverage: X%" | ✅ Implemented | — | — | — | Implemented Week 2.6 |
| Text simplification pipeline | "captions → simplified → gloss" | `simplifyBatch()` runs before `batchTextToSignGloss()`; `caption.simplified` shown in CaptionBar | ✅ Implemented | — | — | — | Implemented Week 1.3 |
| simpleGloss BdSL grammar | "Fallback must not be plain English order" | SOV heuristic: 35-verb set moves predicates to end | ✅ Implemented | Heuristic only; not validated | Low | — | Implemented Week 2.5 |
| No neural BdSL generation | "Cannot train — no corpus" | Not attempted | ✅ Implemented | — | — | — | Correct |
| Bangla audio / code-switching | "Phase B1 — prompt engineering first" | English-only pipeline | ❌ Missing | Full gap (Phase B) | Medium | Phase B | Prompt extensions in Phase B1 |
| WhisperX Bengali ASR | "Phase B2" | Python microservice scaffolded (`backend_nlp/`); WhisperX not yet integrated | 🟡 Partial | WhisperX not wired; spaCy NLP pipeline wired | Medium | Phase B2 | Add WhisperX to `backend_nlp/` in Phase B2 |
| BdSL community collaborator | "Every system that succeeded did co-design." | Not present | ❌ Missing | Full gap | **CRITICAL** | **P0** | Single most important non-code task |

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
| 1. Real-time sync architecture | ✅ Done | `PlayerPage.js`, `YouTubePlayer.js`, `utils/sync.js`, `services/timelineScheduler.js` | Skip-sign policy (minor) |
| 2. Gloss-to-clip dictionary + blending | 🟡 Partial | `SignAvatar.js` — 27 clips, 100ms transition, fingerspell + concept card fallback | 26 domain words still no JSON clips |
| 3. LLM gloss tuned to BdSL | ✅ Done | `routes/sign.js` — SIGN_VOCAB constraints, BdSL grammar, 8 arXiv examples, bracket notation, concept enrichment | No Deaf signer validation (P0 non-code gap) |
| 4. Basic rule-based NMMs | ✅ Done | `utils/sync.js`, `SignAvatar.js`, `services/timelineScheduler.js` | Brow isolation (P2) |
| 5. BdSL gloss notation standard | ❌ Post-hackathon | — | Phase 1 |
| 6. Ham2Pose notation→motion | ❌ Post-hackathon | — | Phase 2 |
| 7. Motion capture BdSL signers | ❌ Post-hackathon | — | Phase 2 |
| 8. Educational effectiveness study | 🟡 Partial | `docs/testing_log.md` — 85-test automated suite (66 backend + 19 frontend); human participant protocol defined | Needs 1+ DHH participant session |

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
| 9 | **Comprehension testing** — automated 85 tests done; human protocol defined | `backend/__tests__/`, `frontend/src/__tests__/` | Automated ✅; Human ⏳ | — | ✅ Auto done; human pending |
| 10 | **No demo backup video** | `docs/demo_backup.mp4` | Medium: WiFi/API fail scenario | 2 hours | **P2** |
| 11 | **Syllable timing still approximate** | `timelineScheduler.js` | Medium: word windows off by ±30% | Phase B2 | Phase B (WhisperX) |
| 12 | **Bangla code-switching** | Prompt engineering | Full gap (Phase B1) | Low | Phase B |
| 13 | **WhisperX word-level timestamps** | `backend_nlp/` scaffolded; WhisperX not yet integrated | Full gap (Phase B2) | High | Phase B |
