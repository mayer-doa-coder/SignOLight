# CURRENT_STATE.md
*Last updated: 2026-06-29 — post Week 1 + Week 2 + sync-fix sprint + NLP pipeline sprint + PART F Bangla sprint*

---

## What Is Actually Built

### Architecture Summary

A YouTube → captions → LLM simplification → LLM gloss → VRM avatar pipeline with timeline-locked sync. Phase A (English) complete. Phase B1 Bangla code-switching implemented (prompt engineering). Python NLP microservice includes WhisperX (auto-detects Bengali audio) and Bengali NLP fallback. WhisperX code complete; deployment on HF Space needed.

```
YouTube URL
  → GET /api/video/info        (routes/video.js)       oEmbed metadata
  → GET /api/captions          (routes/captions.js)    4-method caption extraction
  → POST /api/sign/batch       (routes/sign.js)        simplifyBatch → batchTextToSignGloss (Groq)
                                                        + enrichConceptCards (Groq)
                                                        + recordVocabularyGaps
  → PlayerPage.js              (frontend)              timeline-locked sync + drift telemetry
  → SignAvatar.js              (frontend)              Three.js + VRM avatar + fingerspell ticker
                                                        + enriched concept card overlay

Phase B (scaffolded, not yet active):
  → GET/POST /api/nlp/*        (server.js proxy)       → backend_nlp/ FastAPI + spaCy microservice
```

---

## Backend (`backend/`)

### `server.js`
- Express on port 5000
- `express-rate-limit`: 100 req / 15 min on all `/api/` routes
- CORS: `FRONTEND_URL` env var or `*`

**Two-layer persistent cache:**
- Hot layer: `videoCache` Map (in-memory, O(1) lookup)
- Cold layer: `backend/cache/{videoId}.json` files (persist across restarts)
- `readFileCache(videoId)` / `writeFileCache(videoId, data)` — safe file I/O with error swallow
- `GET /api/cache/:videoId`: checks hot → cold → 404; promotes cold hits to hot
- `app.locals.writeFileCache` exposed so routes can write cache without circular require
- `prefetchDemoLecture()`: fires 3s after startup; loads from file cache if it exists (warm restart), otherwise fetches + writes to both layers

**NLP service proxy (Phase B):**
- `GET|POST /api/nlp/*` — proxies to `NLP_SERVICE_URL` env var (Python FastAPI)
- Falls back to 503 with clear message when `NLP_SERVICE_URL` is unset — Phase A Groq gloss continues working without it

**Vocabulary gap tracker:**
- `gapCounts` Map (hot layer) + `backend/cache/vocabulary_gaps.json` (cold layer)
- `recordVocabularyGaps(results)` — called by sign.js after each batch; counts every `[CONCEPT:X]` word
- `app.locals.recordVocabularyGaps` exposed to sign.js
- `GET /api/admin/gaps` — returns gap list sorted by frequency; tells you exactly which words to add to SIGN_MOTIONS next

### `routes/captions.js`
Four-method extraction, attempted in order:
1. `getCaptionTracksFromWatchPage` — scrapes `ytInitialPlayerResponse` JSON from YouTube watch page
2. `getCaptionTracksFromTimedText` — timedtext API XML track listing
3. `fetchDirectCaptionText` — 4 direct VTT/SRV3 URL variants
4. `fetchCaptionsFromLibrary` — `youtube-transcript` npm package fallback

Parses both VTT and timedtext XML. Outputs `{ start, end, text }` segments (milliseconds).
Language preference: en (manual) > en (ASR) > en-* > translatable.

### `routes/sign.js`
- Groq SDK with `llama-3.1-8b-instant` model

**Two-step batch pipeline:**
1. `simplifyBatch(captions)`: academic English → secondary-school reading level via Groq JSON call; result stored as `caption.simplified`
2. `batchTextToSignGloss(captions)`: simplified text → BdSL gloss via `buildGlossPrompt()`

**`detectBangla(text)`:** Detects Bangla/Bengali script (Unicode block U+0980–U+09FF). Used for Phase B1 code-switching — returns `true` if caption contains any Bengali characters.

**`buildGlossPrompt(text)`:**
- BdSL grammar rules (SOV, topic-comment, remove articles/aux/prepositions)
- `SIGN_VOCAB` constant (58 SIGN_MOTIONS words) — LLM instructed to prefer these
- Rule: proper nouns, names, abbreviations → `[FINGERSPELL:WORD]`
- Rule: concepts with no available sign → `[CONCEPT:word]`
- 8 Bangla-SGP grounded example pairs (arXiv:2511.08507)
- **Phase B1 code-switching section** (appended when `detectBangla(text)` is true): instructs LLM to translate Bengali words to English conceptual equivalents, use `[FINGERSPELL:X]` for Bengali proper nouns, use `[CONCEPT:X]` for Bengali concepts with no SIGN_VOCAB match; includes 3 mixed Bangla-English example pairs
- No "ASL" string anywhere

**`enrichConceptCards(results)`:**
- After glossing, scans all results for `[CONCEPT:X]` words
- Makes one Groq call per batch to get brief 5–10 word definitions for all concept words
- Returns `{ WORD: "definition" }` map; attached as `result.conceptExplanations`

**`simpleGloss(text)`:** stop-word stripping fallback with SOV heuristic reorder (35-verb set); `confidence: 0.5`. Bangla-aware: punctuation-strip regex is `[^\w\sঀ-৿]` (preserves Bengali Unicode block); token filter keeps Bangla tokens regardless of stop-word list.

**`recordVocabularyGaps`:** called before enrichment; persists gap counts via `app.locals.recordVocabularyGaps`

**`normalizeGloss()`:** strips quotes, BdSL prefix, uppercases

Batch size: `GROQ_BATCH_SIZE` env var (default 10). `module.exports._test` exports for unit tests.

### `routes/video.js`
- `GET /api/video/info?url=...` — YouTube oEmbed API (no key needed)

---

## Python NLP Microservice (`backend_nlp/`)
*Phase B scaffold — not yet deployed. Falls back gracefully when `NLP_SERVICE_URL` is unset.*

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app; `GET /health`, `POST /nlp/gloss`, `POST /nlp/gloss/batch`, `POST /nlp/timestamps`. Startup: loads `en_core_web_md` + attempts `bn_core_news_sm` (optional; logs graceful failure). `/nlp/timestamps` response now includes `language` field (e.g. `"bn"` or `"en"`). |
| `pipeline.py` | Full NLP pipeline: POS → lemma → NER → dependency parse → SOV reorder. `gloss_caption(nlp, text)` returns `{ gloss, words, wordMeta, sovOrder }`. **Bengali path**: `_has_bangla(text)` detected via `_BANGLA_RE = re.compile(r"[ঀ-৿]")`; routes to `_gloss_mixed_bangla(nlp, text)` — Bengali tokens → concept card, ASCII tokens → `route_token()`. Prevents English spaCy from mangling Bengali script. |
| `semantic_map.py` | Pre-computes spaCy vectors for all 58 SIGN_VOCAB words at startup. `nearest_sign(word)` returns `(key, cosine_score)`. APPROX_THRESHOLD=0.82, LOW_THRESHOLD=0.62 |
| `timestamps.py` | **Phase B2 — code complete, deployment pending.** `extract_word_timestamps(videoId)` downloads audio via `yt-dlp`, runs WhisperX, **auto-detects language** via `result.get("language","en")` — Bengali audio automatically uses `language_code="bn"` forced alignment. Returns `{"words": [{word, startMs, endMs, score}], "language": "en"/"bn"}`. Lazy-imports whisperx. Falls back to `{"words": [], "language": "en"}` on any error. Configurable via `WHISPER_MODEL` env var (default `tiny`). |
| `requirements.txt` | fastapi, uvicorn, spacy, numpy, whisperx, faster-whisper, yt-dlp |
| `Dockerfile` | Python 3.11-slim + ffmpeg + yt-dlp binary + torch CPU wheel + spaCy `en_core_web_md` (required) + `bn_core_news_sm` (optional — non-fatal if unavailable) |
| `tests/test_pipeline.py` | 7 unit tests covering routing decisions (exact match, SOV, NER fingerspell, concept card, empty text, 8-word cap) |

---

## Frontend (`frontend/src/`)

### `utils/sync.js`
- `findCaption(captions, timeMs)`: binary search O(log n)
- `computeNMM(gloss, originalText)`: returns structured `{ type, wordIndex, headY }`:
  - `type`: `"wh-question"` | `"yn-question"` | `"negation"` | `"neutral"`
  - `wordIndex`: index of triggering word in gloss array (–1 for neutral, 0 for YN)
  - `headY`: head rotation amplitude (0.22 for negation, 0 otherwise)

### `services/timelineScheduler.js`
Pure-function deterministic scheduling service. No React state. Single source of truth for all word timing.
- `computeWordTimings(caption)` — **Phase B2 active when `caption.spokenTimings` is set**: uses WhisperX speech boundaries (`spokenTimings[0].startMs` → `spokenTimings[last].endMs`) as the actual speech span, then distributes gloss words by syllable weight within that span. Eliminates up to 400ms of leading/trailing silence from YouTube caption metadata. **Phase A fallback** (no `spokenTimings`): syllable-weighted over raw caption start/end (unchanged behavior).
- `resolveSignState(caption, currentTimeMs, speedFactor?)` — seek-safe word index resolver. Returns `{ wordIndex, wordProgress, wordTiming, isActive, isCatchingUp }`. `isCatchingUp = wordProgress ≥ 0.65`: arrived in last 35% of word window → avatar snaps rather than blends
- `buildSignQueue(caption)` — sign queue entries
- `shouldAvatarAnimate(playerState, caption)`
- `effectiveNMM(nmm, currentWordIndex)` — gates NMM until avatar reaches triggering word
- `applySlowPlayback(timings, speedFactor)` — stretches timing windows for learning mode

### `utils/notation.js`
Articulatory parameter space (lightweight HamNoSys-inspired):
- `Handshape`, `Location`, `Movement` enums
- `createSignMetadata(params)` — structured sign descriptor
- `SIGN_METADATA` — 23 social sign entries (confidence: 0, awaiting community validation)
- `computeDictionaryCoverage(signedCaptions)` → `{ covered, total, percentage, validated, unvalidated }`

### `pages/PlayerPage.js`
- `playerState` ∈ `{idle, playing, paused, seeking}` driven by `YT_PLAYING=1, YT_PAUSED=2, YT_BUFFERING=3`
- `handleSeek(time)`: sets `seekingRef.current = true` BEFORE `setPlayerState("seeking")` — prevents network-stall false snaps
- `processVideo()`: checks `/api/cache/:videoId` first; falls back to live API calls
- `sentenceNMM` — structured `{ type, wordIndex, headY }` from `computeNMM`
- `coverage` — `computeDictionaryCoverage(signedCaptions)` via `useMemo`; displayed in status bar
- **Sync drift telemetry**: `driftRef` tracks `maxDrift`; `debugDriftMs` state updates every 2s with caption-midpoint deviation; debug panel shows live vs ≤2000ms target
- `playbackSpeed` passed to `<SignAvatar>` when `learningMode` is active
- Three layout modes: side-by-side, picture-in-picture, fullscreen-sign

### `components/YouTubePlayer.js`
- `forwardRef` with `seekTo`, `getCurrentTime`, `pause`, `play` imperative handles
- **100ms** `setInterval` poll → `onTimeUpdate` (cuts max avatar lag to 100ms)
- `ytApiLoaded` module-level flag prevents double-script-injection

### `components/SignAvatar.js`

**SIGN_MOTIONS dictionary** (58 entries total):
- 22 social vocabulary: HELLO, THANK, YOU, ME, YES, NO, LEARN, KNOW, UNDERSTAND, GOOD, BAD, HELP, PLEASE, SORRY, WHAT, WHERE, WHEN, HOW, WHY, BECAUSE, SIGN, BDSL
- 36 domain vocabulary: NETWORK, NEURON, LAYER, TRAIN, MODEL, WEIGHT, GRADIENT, LOSS, FUNCTION, ACTIVATE, DATA, INPUT, OUTPUT, ERROR, PREDICT, CALCULATE, MATRIX, VECTOR, PATTERN, IMAGE, CLASSIFY, ACCURACY, PROBABILITY, DEEP, CONNECT, NODE, SIGNAL, PIXEL, EXAMPLE, PROCESS, STEP, RESULT, PROBLEM, SOLUTION, COMPUTER, PROGRAM

**Bracket notation parsing (NLP pipeline sprint):**
- `getSignInfo(word)`: parses `[FINGERSPELL:X]`, `[CONCEPT:X]`, `[NUMBER:X]` BEFORE falling to SIGN_MOTIONS lookup or concept-card default
- `normalizeGlossWord(word)`: returns `""` for any bracket-tagged word → `loadSignClip` skips the network fetch entirely
- `displayGlossWord(word)`: human-readable display form — `~RNA` (fingerspell), `?UBIQUITOUS` (concept), `#42` (number) — used throughout the sign display UI

**Fingerspelling:**
- `FINGERSPELL_HANDSHAPES` — 26-letter map with distinct pose + wrist rotation per letter
- `case "fingerspell"` in both `applyMotion()` (fallback) and `applyVrmMotion()` (VRM) — cycles handshapes at 3 letters/second based on elapsed time
- Fingerspell ticker overlay: letter row with current letter enlarged and highlighted in cyan

**Concept card:**
- Avatar idles naturally while concept card overlay carries the meaning
- Shows `caption.conceptExplanations?.[signInfo.label]` — Groq-generated plain-English definition
- Falls back to "No established BdSL sign" when no definition available

**Sign clip loading:** `loadSignClip(word)` → fetches `/signs/{WORD}.json` → validates (≥2 frames + `duration` field) → cached in `signClipCache` Map. Bracket-tagged words return `""` from `normalizeGlossWord`, so fetch is skipped.

**`applyVrmMotion()` motion cases** (24 named + fingerspell + concept-card + default):
- All previously implemented cases
- `spread-hands` (NETWORK, MATRIX) — both arms wide, flat fingers
- `flat-hand` (LAYER, IMAGE) — right flat hand held out
- `fingerspell` — cycles FINGERSPELL_HANDSHAPES at 3 letters/second
- `concept-card` — avatar idles (overlay carries meaning)

**Cross-sign transition blending:** 100ms smoothstep bone lerp on sign change via closure snapshot vars.

**NMM overrides** (in animation loop, AFTER per-sign motion, with 200ms fade-in ramp):
- WH-question: `applyVrmExpression(vrm, "firm", time, nmmIntensity, "ou", customBrow)` → angry=0.55 + ou=0.30 (pursed lips) + thinking gaze (down-right)
- YN-question: `applyVrmExpression(vrm, "question", time, nmmIntensity, "aa", customBrow)` → surprised=0.55 + aa=0.20 (open mouth) + engaging gaze (at camera)
- Negation: `applyVrmExpression(vrm, "sad", time, nmmIntensity, "ih", customBrow)` → sad=0.50 + ih=0.25 (tight lips) + head-shake + assertive gaze (left)
- Three channels of differentiation per NMM: brow preset + mouth shape + gaze direction
- `customBrow` probed at model load — auto-wires isolated `browDownLeft/Right` or `browOuterUpLeft/Right` if present in model
- `nmmActiveSince` closure var → `nmmIntensity = Math.min(1, elapsed / NMM_FADE_DURATION)` (200ms ramp)

**Eye gaze (vrm.lookAt):** `gazeTarget` Object3D set as `vrm.lookAt.target` at VRM load. Position lerped (α=0.05) each frame:
- YN-question → (0, 0.62, 4.3): camera — direct viewer engagement
- WH-question → (0.18, 0.28, 3.0): down-right — thinking/searching
- Negation → (−0.3, 0.50, 3.5): left — assertive away-gaze
- Idle → slow sin-wave drift; signing → audience position (0, 0.50, 3.5)

**Word-onset NMM gating:** `effectiveNMM(sentenceNMM, wordIndex)` from timelineScheduler

**Caption-level clip preload:** `useEffect([caption])` calls `loadSignClip(word)` for all words immediately on caption change — eliminates 50–200ms first-word clip-load lag.

**Dual avatar system:**
- Primary: VRM via `@pixiv/three-vrm` + GLTFLoader + VRMLoaderPlugin; model `/public/models/sign.vrm`
- Fallback: `createFallbackAvatar()` — Three.js primitives (capsule body, sphere head, limbs, per-finger joints)

### `components/CaptionBar.js`
- Scrollable timeline of caption chips with auto-scroll to active
- Click → `onSeek(cap.start / 1000)`
- Confidence dim: `opacity: 0.55` when `caption.confidence < 0.7`; `~` indicator on low-confidence items
- **Simplified text row**: shows `caption.simplified` (from `simplifyBatch`)
- **NMM badge**: shows WH? / YN? / NEG tag with tooltip
- **Coverage badge**: "BdSL coverage: X%" from `computeDictionaryCoverage`
- **BdSL order label**: `(BdSL order)` annotation on gloss row explains SOV word order

### `components/ControlPanel.js`
- Layout toggle: side-by-side / picture-in-picture / focus-sign
- Sign toggle: "Sign + Caption" ↔ "Caption Only (Discreet)"

### `pages/LandingPage.js`
- Hero: "Never Miss What Was Said." with value chain `Accurate Captions → Simplified Language → BdSL Signs`
- 3 sample video buttons (3Blue1Brown: Neural Networks, Calculus, Vectors)
- 4 feature cards with honest descriptions

---

## Data

| Resource | Count | Location |
|----------|-------|----------|
| Sign clip JSON files | 27 | `/frontend/public/signs/*.json` |
| — Social clips | 17 | HELLO, THANK, YOU, ME, YES, NO, HELP, HOW, LEARN, PLEASE, SIGN, SORRY, WHAT, WHERE, WHY, BAD, GOOD |
| — Domain clips | 10 | NETWORK, TRAIN, DATA, INPUT, OUTPUT, NEURON, LAYER, FUNCTION, CONNECT, SIGNAL |
| VRM model | 1 | `/frontend/public/models/sign.vrm` |
| SIGN_MOTIONS entries | 58 | `SignAvatar.js` |
| Domain words with clips | 10 of 36 | 26 domain words use procedural motion; unknown words now route to fingerspell or enriched concept card |

---

## Tests

| File | Count | Status | Notes |
|------|-------|--------|-------|
| `backend/__tests__/sign.test.js` | 30 cases | ✅ All passing | Unit: simpleGloss (8), verb lemmatization (5), buildGlossPrompt (6), normalizeGloss (5), Bangla code-switching/detectBangla (6) |
| `backend/__tests__/integration.test.js` | 13 cases | ✅ All passing | HTTP: /health, /api/cache (4 variants), /api/sign/batch (8 variants incl. cache round-trip) |
| `backend/__tests__/comprehension.test.js` | 29 cases | ✅ All passing | Automated proxy: SOV order, domain coverage, NMM grammar, vocabulary-constrained prompt, NEURAL example |
| `frontend/src/__tests__/sync.test.js` | 23 cases | ✅ All passing | findCaption binary search (7), computeNMM all 3 types + WHEN/WHY/CANT/NOTHING edge cases (16) |
| `frontend/src/__tests__/timelineScheduler.test.js` | 32 cases | ✅ All passing | computeWordTimings (Phase A + Phase B spokenTimings), resolveSignState (incl. isCatchingUp + pre-first-word guard), effectiveNMM, shouldAvatarAnimate, applySlowPlayback |
| `backend_nlp/tests/test_pipeline.py` | 7 cases | Python only | Requires spaCy; run `cd backend_nlp && python -m pytest` |
| Human participant test | ⏳ Pending | — | Protocol defined in `docs/testing_log.md` |

**Total automated (JS):** 127 tests passing (72 backend + 55 frontend)

---

## Deployment

- `render.yaml`: **two services** on Render.com free tier
  - `signlearn-api` — Node.js Express backend
  - `signlearn-frontend` — Static React build with SPA rewrite (`/*` → `/index.html`)
- **NLP microservice** (`backend_nlp/`) — deployed separately on **Hugging Face Spaces** (free, 16 GB RAM). See `docs/WHISPERX_DEPLOYMENT.md` for step-by-step setup.
- `GROQ_API_KEY` set manually in Render dashboard
- `NLP_SERVICE_URL` set to HF Space URL (e.g. `https://username-signlight-nlp.hf.space`) when Phase B is active; leave blank for Phase A syllable timing.
- `FRONTEND_URL` set to frontend URL for CORS

---

## What Is Correctly NOT Built

Per PDF/CTO guidance, these are correctly absent:
- Live microphone ASR
- Neural sign generation
- Photorealistic avatar
- Multi-language simultaneous support
- Live microphone mode (destabilises demo; wait until recorded-video Phase A is solid)
- Full Bengali NLP pipeline (Phase B2 — `bn_core_news_sm` has limited vocabulary; Bengali tokens currently route to concept cards via `_gloss_mixed_bangla()`. WhisperX Bengali ASR IS code-complete — deployment on HF Space + real-audio validation still needed)
