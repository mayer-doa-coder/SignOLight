# Testing Log — SignLearn / SignOLight
*Last updated: 2026-06-29 (PART H audit — all counts corrected to match actual Jest output)*

---

## Automated Test Results

### Backend unit tests — `backend/__tests__/sign.test.js` (30 tests)
All 30 passing. Covers `simpleGloss`, `buildGlossPrompt`, `normalizeGloss`, verb lemmatization, and Bangla code-switching (Phase B1).

| Suite | Tests | Status |
|-------|-------|--------|
| simpleGloss | 8 | ✅ All passing |
| simpleGloss verb lemmatization | 5 | ✅ All passing — inflected → base-form, SOV end-position |
| buildGlossPrompt | 6 | ✅ All passing |
| normalizeGloss | 5 | ✅ All passing |
| Bangla code-switching | 6 | ✅ All passing — `detectBangla`, mixed prompt section, Bangla token preservation |

---

### Backend integration tests — `backend/__tests__/integration.test.js` (13 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| GET /health | 1 | ✅ Passing |
| GET /api/cache/:videoId | 4 | ✅ Passing — 404 on miss, file cache hit, different-videoId 404, path sanitization |
| POST /api/sign/batch | 8 | ✅ Passing — 400 missing array, 400 non-array, result length, field shape, cache write, cache hit round-trip, no-videoId guard, empty array |

---

### Comprehension verification tests — `backend/__tests__/comprehension.test.js` (29 tests)

These are automated proxies for the CTO success metrics, tested without human participants.

| Suite | Tests | Status | Metric Proxied |
|-------|-------|--------|----------------|
| BdSL SOV word-order (simpleGloss) | 7 | ✅ Passing | Gloss comprehension score ≥3.0/5 |
| BdSL prompt grammar rules | 8 | ✅ Passing | LLM gloss quality |
| Domain vocabulary coverage | 3 | ✅ Passing | Sign recognition rate ≥70% |
| Gloss normalization quality | 6 | ✅ Passing | Caption WER ≤10% proxy |
| Caption timing structure | 5 | ✅ Passing | Sync drift ≤2s proxy |

**Key automated findings:**
- Domain vocabulary: 10/36 domain words have clip JSON files (28%) — procedural fallback covers all 36 (100%)
- SIGN_MOTIONS total: 58/58 words covered by procedural motion (100% procedural coverage)
- SOV heuristic: verbs correctly moved to end for all tested base-form predicates
- Prompt cites arXiv:2511.08507 and includes ≥6 BdSL example pairs with WH-final + NEG-final rules

---

### Frontend utility tests — `frontend/src/__tests__/sync.test.js` (23 tests)

All 23 passing. Covers `findCaption` (binary search) and `computeNMM` (NMM grammar rules).

| Suite | Tests | Status |
|-------|-------|--------|
| findCaption | 7 | ✅ Passing — null on empty, boundary hits, gap detection, 20-min seek |
| computeNMM | 16 | ✅ Passing — WH/YN/NEG/neutral types, wordIndex precision, headY values, edge cases |

---

### Frontend scheduler tests — `frontend/src/__tests__/timelineScheduler.test.js` (32 tests)

All 32 passing. Covers the deterministic sign scheduling service.

| Suite | Tests | Status |
|-------|-------|--------|
| computeWordTimings | 5 | ✅ Passing — per-word entries, continuous windows, null/empty |
| resolveSignState | 8 | ✅ Passing — null caption, correct word index, isCatchingUp flag, past-end hold, pre-first-word guard |
| effectiveNMM | 5 | ✅ Passing — NMM gating by word index |
| shouldAvatarAnimate | 5 | ✅ Passing — playing/paused/idle/seeking/null caption |
| computeWordTimings with spokenTimings (Phase B) | 6 | ✅ Passing — speech-span boundaries, fallback to caption bounds |
| applySlowPlayback | 3 | ✅ Passing — doubled duration, contiguous windows |

---

## CTO Success Metric Verification

| Metric | Target | Automated Proxy Result | Human Verification Required |
|--------|--------|------------------------|------------------------------|
| Sync drift at 5-min intervals | ≤2s | Drift telemetry implemented in PlayerPage.js; measures every 2s | ✅ Run demo lecture for 5 min, check debug panel |
| Sign recognition rate (BdSL user test) | ≥70% | 100% procedural coverage; 28% clip coverage | ❌ Requires BdSL-fluent participant |
| Gloss comprehension score (1–5 scale) | ≥3.0/5 | SOV heuristic + LLM grammar rules verified automatically | ❌ Requires DHH participant rating |
| Caption WER on target lecture | ≤10% | 4-method extraction verified; WER not directly measurable without ASR | ❌ Requires manual comparison vs. ground truth |
| User comprehension delta | Any positive | NMMs verified, simplification pipeline verified | ❌ Requires pre/post comprehension test with participant |

---

## Human Participant Test Protocol (Pending)

**Minimum viable test — 1 participant, ~30 minutes:**

### Setup
1. Open the app with the 3Blue1Brown Neural Networks video (`aircAruvnKk`)
2. Click "Process full video" and wait for captions to load
3. Enable debug panel (click "Debug" toggle in ControlPanel)

### Pre-test (comprehension baseline)
Ask participant to watch the first 2 minutes of the video **without** SignOLight. Then ask:
- Q1: "What is a neural network trying to do?"
- Q2: "What happens when the network makes an error?"
- Q3: "What is gradient descent?"
Record answers as baseline score (0–3 correct).

### Main test (with SignOLight)
Re-watch the same 2 minutes **with** avatar + captions active. Repeat the 3 questions.
Record answers as intervention score (0–3 correct).

### Qualitative follow-up
- "Which part of the sign avatar was most confusing?"
- "Did the simplified captions help?"
- "Was there any sign you recognized clearly?"
- "What would you change first?"

### Metrics to record
| Item | Value |
|------|-------|
| Participant profile | DHH / BdSL fluent / hard-of-hearing / hearing |
| Baseline comprehension score | / 3 |
| Intervention comprehension score | / 3 |
| Comprehension delta | ± |
| Signs recognized (ask directly) | / 5 asked |
| Gloss rating (ask: "How clear was the signing?", 1–5) | / 5 |
| Sync drift observed in debug panel | ms |
| Main confusion point | free text |

### Interpretation
- Positive comprehension delta → any positive = success metric met
- Gloss rating ≥3.0 → comprehension score metric met
- Sync drift ≤2000ms in debug panel → sync metric met

---

## Known Limitations (Honest Prototype)

Per CLAUDE.md CTO Axiom 2: synthetic avatars score 2.5–3.5/5 comprehension (Quandt 2022).

- Sign representations are **not validated** by the BdSL Deaf community
- Dictionary covers ~28% of domain words with clip files; remainder uses procedural motion
- Word-level timestamps are character-weighted approximations (WhisperX needed for Phase B)
