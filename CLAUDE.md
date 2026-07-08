# SignOLight — Developer Context

> Read this before touching any file. Every decision in this project has a reason documented here.

---

## Vision

> **"We want to make sure that a Deaf student in Bangladesh never has to miss what the teacher said."**

This is not an avatar project. It is a **synchronization + educational scaffolding engine**. The avatar is the output modality, not the product. Every feature decision must answer: *"Does this make it more likely that Riya understands her lecture today?"*

---

## The Three Users

| Persona | Profile | Primary Need | Avatar Relevance |
|---------|---------|-------------|-----------------|
| **Riya** | Deaf since birth, BdSL is her first language, catches ~40% of lectures | Signed BdSL content | Primary interface |
| **Anik** | Acquired deafness at 14, oral communication, fluent reader | Accurate captions | Irrelevant — must be hideable |
| **Nadia** | Moderate hearing loss, partial BdSL, anxious about visibility | Captions + key signs, discreet mode | Secondary reinforcement |

---

## Product Priority Order (CTO Mandate)

1. **Accurate real-time captions** — foundation of everything
2. **Simplified language** — educational scaffolding
3. **Synchronized BdSL signing** — avatar is third, not first

A broken avatar with perfect captions > beautiful avatar with wrong captions.

---

## CTO Axioms (Non-Negotiable Technical Constraints)

| # | Axiom | Implication |
|---|-------|-------------|
| 1 | Dictionary playback only — no neural sign generation | Pre-animated JSON clips only; no GPT → animation |
| 2 | Avatars score 2.5–3.5/5 comprehension (Quandt 2022) | Captions must always be visible; never hide them |
| 3 | NMMs are grammatically obligatory, not decorative | 3 grammar rules must be implemented (WH, YN, negation) |
| 4 | BdSL has no motion corpus, no standardized gloss notation | Honest "curated dictionary" framing; concept cards for unknowns |
| 5 | Synchronization is the real differentiator | Sprint 1 is always sync engine — never avatar polish first |

---

## Five Success Metrics (CTO-Defined)

| Metric | Target |
|--------|--------|
| Sync drift at 5-minute intervals | ≤ 2 seconds |
| Sign recognition rate (BdSL user test) | ≥ 70% |
| Gloss comprehension score (1–5 scale) | ≥ 3.0 / 5 |
| Caption WER on target lecture | ≤ 10% |
| User comprehension delta | Any positive delta |

---

## Language Phasing

- **Phase A (current):** English pipeline — YouTube CC → BdSL-grammar gloss → avatar
- **Phase B1:** Code-switching support for Bangla-English mixed CC text (prompt engineering only)
- **Phase B2:** Full WhisperX ASR microservice for lectures with no YouTube CC

Do not start Phase B until Phase A passes all 5 success metrics.

---

## Architecture Overview

```
YouTube URL
    → GET /api/video/info          (routes/video.js)    — oEmbed metadata
    → GET /api/captions            (routes/captions.js) — 4-method extraction
    → POST /api/sign/batch         (routes/sign.js)     — Groq AI → BdSL gloss
    → PlayerPage.js                                     — timeline-locked sync
    → SignAvatar.js                                     — Three.js + VRM avatar
```

**Key sync architecture (post-fix):**
- `findCaption(captions, timeMs)` — binary search O(log n), not `Array.find()` O(n)
- `playerState` ∈ `{idle, playing, paused, seeking}` — drives avatar freeze/snap
- 250ms poll via `YouTubePlayer.js` → `setCurrentTime` → `findCaption`
- NMMs computed from gloss analysis via `computeNMM(gloss, text)` in PlayerPage.js

**Fallback hierarchy for unknown words:**
1. JSON clip from `/signs/WORD.json` (cached in `signClipCache`)
2. `SIGN_MOTIONS[word]` procedural motion
3. **Concept card overlay** (text explanation, no gesture)
4. `[FINGERSPELL:X]` tagged words only (proper nouns, explicitly AI-tagged)

---

## Do Not Touch — Confirmed Correct (GAP_ANALYSIS.md §Part 1)

- `backend/routes/captions.js` — 4-method caption extraction is correct, don't change the strategy
- `sign.js` `simpleGloss()` fallback — keep as-is, it's the no-key safety net
- `server.js` rate limiting — 100 req/15 min via `express-rate-limit`
- `@pixiv/three-vrm` + `GLTFLoader` + `VRMLoaderPlugin` — correct avatar stack per CTO
- `createFallbackAvatar()` — Three.js primitives fallback when VRM fails
- `signClipCache` Map in `SignAvatar.js` — correct caching strategy
- `frontend/vercel.json` — SPA rewrites correct
- `frontend/public/models/sign.vrm` — do not replace or move

---

## What NOT to Build

Per CTO explicit list:
- **Live microphone mode** — destabilizes demo; wait until recorded-video is solid
- **Neural sign generation** — no BdSL corpus; violates Axiom 1
- **Photorealistic avatar** — 4/10 importance in CTO matrix, uncanny valley risk
- **Multi-domain support** — one lecture domain done right > ten domains done poorly

---

## BdSL Grammar Rules (Mandatory in Gloss Prompt)

BdSL is NOT translated Bengali or translated ASL. It is a distinct language:
- **Topic-comment structure** — state topic FIRST, always
- **SOV word order** — Subject → Object → Verb (not English SVO)
- **No articles** (a, an, the) — remove always
- **No auxiliary verbs** (is, are, was, were) — remove unless negated
- **Example:** "The neural network learns patterns" → `NEURAL NETWORK PATTERN LEARN`

---

## Non-Manual Markers (NMM Grammar Rules)

| Rule | Trigger | Expression |
|------|---------|-----------|
| WH-question | Gloss contains WHAT/WHERE/WHEN/HOW/WHY | Furrow eyebrows throughout sentence |
| Yes/No question | Original text ends with `?` AND no WH-word | Raise eyebrows throughout sentence |
| Negation | Gloss contains NO/NOT/NEVER/CANNOT/CANT | Head-shake overlay + `firm` expression |

Computed via `computeNMM(gloss, text)` in `PlayerPage.js`.
Passed as `sentenceNMM` prop to `SignAvatar`.
Applied in SignAvatar AFTER `applyVrmClip()` — NMMs override per-clip expression.

---

## Gap Status Tracker

Update `✅` as items are completed.

### P0 — Fix First
- [ ] CON-01: `render.yaml` — ANTHROPIC_API_KEY → GROQ_API_KEY
- [ ] CON-02: Binary search in PlayerPage.js (replace `Array.find()`)
- [ ] CON-03: Replace all "ASL" → "BdSL" in UI and code
- [ ] GAP-02: Linear scan → binary search (same as CON-02)
- [ ] GAP-03: Uniform word timing → character-weighted in SignAvatar.js
- [ ] GAP-04: Seek/pause state machine in PlayerPage.js

### P1 — Sprint 2
- [ ] CON-04: Unknown-word fallback → concept card (not generic gesture)
- [ ] CON-05: LandingPage hero copy → lead with captions, not avatar
- [ ] CON-06: Gloss prompt → BdSL grammar + Bangla-SGP examples
- [ ] GAP-05: Catch-up/skip buffer
- [ ] GAP-06: NMM grammar rules (3 rules)
- [ ] GAP-07: Concept card overlay UI
- [ ] GAP-08: BdSL gloss prompt with Bangla-SGP examples (same as CON-06)
- [ ] GAP-09: 36 domain words added to SIGN_MOTIONS

### P2 — Polish
- [ ] GAP-10: Confidence signaling in sign.js + CaptionBar.js
- [ ] GAP-11: Pre-processing cache in server.js
- [ ] GAP-12: Discreet mode label in ControlPanel.js
- [ ] GAP-13: BdSL community collaborator outreach
- [ ] GAP-14: Unit test files (binary search, computeNMM)
- [ ] GAP-15: Record 4-minute demo backup video

---

## Demo Lecture

**Target:** 3Blue1Brown "Neural Networks" (existing sample button in LandingPage.js)

**Domain vocabulary covered** (in SIGN_MOTIONS after GAP-09): NETWORK, NEURON, LAYER, TRAIN, MODEL, WEIGHT, GRADIENT, LOSS, FUNCTION, ACTIVATE, DATA, INPUT, OUTPUT, ERROR, PREDICT, CALCULATE, MATRIX, VECTOR, PATTERN, IMAGE, CLASSIFY, ACCURACY, PROBABILITY, DEEP, CONNECT, NODE, SIGNAL, PIXEL, EXAMPLE, PROCESS, STEP, RESULT, PROBLEM, SOLUTION, COMPUTER, PROGRAM

---

## Demo Video Structure (4 minutes)

1. **30s — Problem moment:** Riya's Tuesday. No tech yet.
2. **90s — Core in action:** App on demo lecture. Captions + BdSL avatar + sync.
3. **60s — Thoughtful interaction:** Concept card, seek recovery, WH-question eyebrows.
4. **30s — Limitations (honest):** "Dictionary covers neural network vocabulary — advanced math terms show explanations."
5. **30s — Vision:** Return to Riya. "Next Tuesday, she doesn't go home guessing."

---

## Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/pages/PlayerPage.js` | 35–38 | Caption scan → replace with binary search |
| `frontend/src/pages/PlayerPage.js` | 169 | CaptionBar `onSeek` passthrough |
| `frontend/src/pages/PlayerPage.js` | 42–78 | `processVideo()` function |
| `frontend/src/pages/PlayerPage.js` | 91,108,134,153 | "ASL" strings → replace with "BdSL" |
| `frontend/src/pages/LandingPage.js` | 168 | "ASL gloss notation" → "BdSL gloss notation" |
| `frontend/src/components/SignAvatar.js` | 10–33 | `SIGN_MOTIONS` object |
| `frontend/src/components/SignAvatar.js` | 22 | "ASL" key → rename to "BDSL" |
| `frontend/src/components/SignAvatar.js` | 37–44 | `getSignInfo()` → add concept card return |
| `frontend/src/components/SignAvatar.js` | 670–680 | `applyVrmClip()` → add NMM override after |
| `frontend/src/components/SignAvatar.js` | 1001–1017 | Uniform word timing → character-weighted |
| `frontend/src/components/CaptionBar.js` | 1–57 | Add confidence opacity dim |
| `frontend/src/components/ControlPanel.js` | toggle button | Add "Discreet" label |
| `backend/routes/sign.js` | 10–25 | `buildGlossPrompt()` → rewrite for BdSL |
| `backend/routes/sign.js` | 11,30,57,88 | "ASL" references → "BdSL" |
| `backend/server.js` | startup | Add pre-processing cache |
| `render.yaml` | 16 | ANTHROPIC_API_KEY → GROQ_API_KEY |

---

## Research References

- **CTO_Strategic_Analysis.md** — authoritative sprint plan, axioms, failure modes
- **GAP_ANALYSIS.md** — 15 gaps, 6 contradictions, all with P0/P1/P2 priorities
- **docs/09_Synchronization_Challenge_Deep_Dive.md** — why sync matters, tolerance thresholds
- **docs/10_Gloss_Challenge_Deep_Dive.md** — BdSL grammar, concept card rationale
- **docs/11_Avatar_Challenge_Deep_Dive.md** — NMMs, readability vs. beauty
- **docs/13_Bangla_Sign_Language_Challenge.md** — BdSL community, fallback hierarchy
- **Bangla-SGP dataset** — arXiv 2511.08507 — few-shot examples for gloss prompt

---

*Last updated: 2026-06-27 — based on full codebase exploration and all 21 /docs/ markdown files.*
