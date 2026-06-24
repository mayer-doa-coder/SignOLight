# SignOLight — Gap Analysis Report

> **Date:** June 13, 2026  
> **Scope:** Actual codebase vs. `/docs/` requirements and PDF research directives  
> **Deadline:** July 1, 2026 (SciBlitz AI Challenge 2026)

---

## How to Read This Report

Three sections, ordered by severity:

1. **Alignments** — code correctly matches the documentation
2. **Gaps** — features required by docs that are absent from code
3. **Contradictions** — code actively does something different from what docs specify

Gaps and contradictions are each assigned a priority:
- **P0** — blocks the core value proposition; fix first
- **P1** — degrades quality enough to fail the Quandt benchmark or the demo
- **P2** — required for completeness but survivable for July 1 with a workaround

---

## Part 1 — Alignments

These areas are correctly implemented and should not be touched.

| # | What | Evidence |
|---|------|----------|
| 1 | **Dictionary clip playback** | `SignAvatar.js` loads `/signs/WORD.json` keyframe clips with fallback to `SIGN_MOTIONS` — matches the PDF's mandate of "dictionary playback only" as the sole responsible BdSL approach |
| 2 | **VRM/three-vrm avatar** | `@pixiv/three-vrm` with `GLTFLoader` + `VRMLoaderPlugin`; matches PDF's verdict: "Stay with VRM/three-vrm — it is the only option meeting all your constraints" |
| 3 | **Server-side Groq key** | API key in `backend/.env`, never exposed to frontend — matches the security requirement |
| 4 | **LLM gloss generation** | `sign.js` calls Groq `llama-3.1-8b-instant`; matches the prescribed architecture |
| 5 | **simpleGloss() fallback** | If Groq key is absent, code strips stop words and uppercases — docs accept this as degraded-but-functional |
| 6 | **Rate limiting** | 100 req / 15 min in `server.js` via `express-rate-limit` |
| 7 | **Multi-source caption extraction** | `captions.js` tries 4 methods with sequential fallback — matches the docs' emphasis on robustness |
| 8 | **No live microphone** | Feature is entirely absent — matches CTO's explicit instruction: exclude until recorded-video mode is robust |
| 9 | **Caption + avatar displayed together** | `PlayerPage.js` always renders both — matches risk-mitigation requirement to let users cross-reference |
| 10 | **YouTube as primary source** | Focuses on pre-recorded YouTube video — matches "recorded YouTube first" recommendation |
| 11 | **VRM procedural fallback** | `createFallbackAvatar()` builds avatar from Three.js primitives when VRM fails — docs accept graceful degradation |
| 12 | **Batched Groq calls** | Configurable `GROQ_BATCH_SIZE` (default 10) in `sign.js` — avoids rate limit spikes |
| 13 | **Sign clip caching** | `signClipCache` Map in `SignAvatar.js` — clips fetched once per session |

---

## Part 2 — Gaps

Features required by the documentation that do not exist in the code.

---

### GAP-01 · WhisperX word-level timestamps — **P0**

**What docs say:** The PDF (Sections B and C) prescribes WhisperX (Bain et al., Interspeech 2023) as the sync engine, delivering sub-100ms word-level timestamp boundaries for each spoken word. The CTO roadmap lists "WhisperX validation on real lecture audio" as a Sprint 0 deliverable before any avatar work begins.

**What code does:** Uses YouTube's own caption timestamps, which are sentence-level chunks (3–8 seconds per segment). There is no WhisperX integration anywhere in the codebase.

**Impact:** Without word-level timestamps, sign timing is uniformly distributed across the caption chunk (see GAP-03 below). The avatar will always be visibly mis-synchronized.

---

### GAP-02 · Timeline-locked clip scheduling with binary search — **P0**

**What docs say:** The PDF ranks three sync strategies and names timeline-locked scheduling ("production-ready") as the correct approach. CTO mandates: sorted array of `{startTime, endTime, gloss, animationKey}` entries; binary search O(log n) every frame against `video.currentTime`.

**What code does:** `PlayerPage.js` line 35–39 uses `signedCaptions.find()` — a linear O(n) scan — called every time `currentTime` updates via a 250ms poll. This is the PDF's lowest-rated strategy ("simplest but drifts and breaks on seek").

**Impact:** Grows slower as caption count increases; breaks on seek without explicit state reset.

---

### GAP-03 · Word-level timing vs. uniform distribution — **P0**

**What docs say:** Each word should be signed at the timestamp of that word's onset (from WhisperX). A 4-second caption containing 3 words should sign each word at its actual spoken time, not split the 4 seconds into three equal 1.33-second slots.

**What code does:** `SignAvatar.js` lines 1002–1007:
```js
const progress = Math.max(0, Math.min(0.999, localMs / duration));
return Math.min(words.length - 1, Math.floor(progress * words.length));
```
This divides caption duration equally among words regardless of actual speech rhythm. A speaker who says a long word followed by three short words will have all four words animated as if equal length.

**Impact:** Avatar signs the wrong word during the wrong speech moment — the core synchronization promise is broken.

---

### GAP-04 · Seek/pause state management — **P0**

**What docs say:** The CTO doc explicitly flags seek/pause as "underestimated — budget 2–3 weeks of careful engineering." Required behaviors:
- **Pause** → freeze avatar at last signed position
- **Resume** → resume from correct position
- **Seek forward/backward** → state reset + re-evaluate within ~2 seconds

**What code does:** `PlayerPage.js` has no seek/pause handler other than CaptionBar's `onSeek` passthrough to `playerRef.current?.seekTo()`. The avatar simply picks up whatever `currentCaption` the next 250ms poll finds. No state reset, no buffer drain, no guaranteed recovery time.

**Impact:** Seeking to minute 15 of a 30-minute video may leave the avatar signing the wrong caption for up to several seconds with no recovery guarantee.

---

### GAP-05 · Catch-up / skip buffer — **P1**

**What docs say:** The PDF (Part C) requires a buffer + catch-up/skip rule. Signvrse's stated principle: "show a slightly simpler sign immediately than a perfect one after a long delay." When signing falls behind speech, the system must skip non-essential content to realign.

**What code does:** No such mechanism. The avatar signs whatever word the uniform-distribution formula points to. If processing is slow, it silently falls behind with no recovery.

---

### GAP-06 · Non-Manual Markers (NMMs) — **P1**

**What docs say:** The PDF (Part D) identifies NMMs as "grammatically obligatory, not decorative." Three required rules:
1. Eyebrows raised → yes/no questions
2. Eyebrows furrowed → WH-questions (WHAT, WHERE, WHEN, HOW, WHY)
3. Head-shake → negation (grammatical core, not just emphasis)

The Wasserroth 2025 study cited in the PDF attributed <50% sentence comprehension to absence of facial grammar. CTO: "rule-based NMMs achievable in 3–5 days and disproportionately increase linguistic credibility."

**What code does:** `SIGN_MOTIONS` assigns `expression: "question"` to WH-words, which is a step toward NMMs, but:
1. The `expression` field applies to the procedural motion only — VRM clip playback (`applyVrmClip`) reads expression from the clip file, not from a grammatical rule
2. Yes/no question detection (raised eyebrows for sentences ending in "?") is not implemented
3. Head-shake for negation is a `shake` motion in `SIGN_MOTIONS["NO"]` but is not triggered by grammatical context — only when the word is literally "NO"
4. No rule evaluates the sentence structure; NMMs are word-lookup only, not grammar-driven

---

### GAP-07 · Concept card fallback UI — **P1**

**What docs say:** When no sign exists for a word, the fallback hierarchy is: (1) established BdSL sign → (2) concept card (brief text explanation of the term) → (3) fingerspelling as last resort. The CTO cites Hand Talk as a cautionary example where fingerspelling-as-fallback destroyed user trust.

**What code does:** When a word has no JSON clip and no `SIGN_MOTIONS` entry, `getSignInfo()` returns `{ motion: "fingerspell", color: "#94a3b8", expression: "neutral" }` — a generic procedural fingerspell gesture. There is no concept card UI, no explanation text, and the fallback conveys zero semantic content for unknown academic vocabulary.

---

### GAP-08 · Bangla-SGP few-shot prompting — **P1**

**What docs say:** The PDF explicitly prescribes using the Bangla-SGP dataset (arXiv 2511.08507) as few-shot examples in the LLM system prompt, specifically for BdSL grammar conventions. BdSL uses topic-comment structure (SOV/topic-first), which differs structurally from ASL.

**What code does:** `sign.js` `buildGlossPrompt()` contains generic ASL-style rules only:
```
- Remove articles (a, an, the) unless essential
- Use topic-comment structure where natural
- Capitalize all words
- Max 8 words per gloss
- Use [FINGERSPELL:X] for proper nouns
```
No Bangla-SGP sentence→gloss pair examples. No BdSL-specific grammar rules. The CTO lists "English-order gloss for Bangla input" as failure mode #6: "grammatically wrong and visible to any BdSL user."

---

### GAP-09 · Domain-specific sign dictionary — **P1**

**What docs say:** CTO mandate: "pick ONE lecture video for your demo before building the dictionary. Extract the top 100 content words from that lecture. Build signs for those 100 words first."

**What code does:** 22 entries in `SIGN_MOTIONS` + 17 JSON clip files. Vocabulary: HELLO, THANK, YOU, ME, YES, NO, LEARN, KNOW, UNDERSTAND, GOOD, BAD, HELP, PLEASE, SORRY, WHAT, WHERE, WHEN, HOW, WHY, BECAUSE, SIGN, ASL. This is generic social vocabulary with zero coverage of any academic domain (CS, math, biology, etc.). A lecture on neural networks would use: NETWORK, NEURON, LAYER, TRAIN, MODEL, WEIGHT, GRADIENT, LOSS — none are present.

**Impact:** CTO's failure mode #4: "sign dictionary covers wrong vocabulary." At demo time, the vast majority of academic words will fall through to the fingerspell/generic-gesture fallback.

---

### GAP-10 · Confidence signaling — **P2**

**What docs say:** System should never display uncertain output with full visual confidence. Lower-confidence captions appear dimmer; approximate signs carry a visual uncertainty indicator.

**What code does:** All captions and signs are rendered with identical visual treatment. CaptionBar dims "past" captions but not "uncertain" ones. No confidence score is returned by the Groq API call or stored in the `signedCaptions` array.

---

### GAP-11 · Pre-processing / caching for demo lecture — **P2**

**What docs say:** CTO risk #6: "12MB VRM + JSON clips + WhisperX + LLM call must all complete before avatar appears. On slow conference WiFi this can take 30–60 seconds. Pre-process and cache the demo lecture URL."

**What code does:** All processing is on-demand per session. `processVideo()` fetches captions and sends to Groq every time a user loads a video. No server-side cache, no pre-processed result stored for the demo URL.

---

### GAP-12 · Discreet / minimal mode — **P2**

**What docs say:** Nadia persona and adoption risk section (doc 07) require a minimal mode showing only captions without a visible avatar, for users who do not want a conspicuous assistive tool visible to classmates.

**What code does:** `signEnabled` toggle hides/shows the avatar panel, which is functionally equivalent, but the feature is not surfaced as "discreet mode" in the UI. There is no design intention or accessibility copy around this use case.

---

### GAP-13 · BdSL community collaborator — **P2**

**What docs say:** Every doc, the CTO analysis, and the PDF state: recruit at least one Deaf BdSL signer as collaborator/evaluator. "Every system that succeeded did co-design (SignON, Signapse, Signvrse); every one that failed skipped it."

**What code does:** No evidence of community involvement in the codebase, UI, or any docs outside `/docs/`.

---

### GAP-14 · Test infrastructure — **P2**

**What docs say:** Testing strategy (doc 17) requires: testing log with 10+ entries, WER measurement on real Bengali lecture recordings, comprehension comparison tests, and explicit edge case documentation.

**What code does:** Zero test files in the repository. No `*.test.js`, no `*.spec.js`, no `__tests__` directory, no evaluation scripts.

---

### GAP-15 · Pre-recorded demo backup — **P2**

**What docs say:** CTO: "always have a pre-recorded demonstration video showing the application working perfectly. If something breaks during the live demo, show the video instead."

**What code does:** No such video exists anywhere in the repository.

---

## Part 3 — Contradictions

These are not missing features — they are places where the code actively does something the docs explicitly reject.

---

### CON-01 · render.yaml uses wrong API key name — **P0 (breaks deployment)**

**File:** `render.yaml` line 16  
**Code:** `key: ANTHROPIC_API_KEY`  
**Docs/backend expects:** `GROQ_API_KEY` (used in `backend/server.js` line 13 and `backend/routes/sign.js` line 6)

**Effect:** Every Render.com blueprint deployment will start without a Groq client. The AI gloss system silently falls back to `simpleGloss()` (strip stop words, uppercase). This is a breaking production bug.

**Fix:**
```yaml
# render.yaml line 16 — change:
- key: ANTHROPIC_API_KEY
# to:
- key: GROQ_API_KEY
```

---

### CON-02 · Sync strategy: event-driven vs. timeline-locked — **P0**

**Docs say:** The PDF explicitly ranks the three sync approaches and labels event-driven ("play whenever text arrives") the worst: "simplest but drifts and breaks on seek."

**Code does:** `PlayerPage.js` is exactly this pattern — 250ms poll, `Array.find()` for matching caption, pass to avatar. The PDF's recommended approach (timeline-locked sorted array + binary search against `video.currentTime`) is not implemented.

---

### CON-03 · The product is branded as ASL, not BdSL — **P1**

**Docs say:** The PDF and every user-facing doc identify the target language as BdSL (Bangla Sign Language). The Riya persona speaks BdSL, not ASL. The CTO warns: "producing ASL gloss for Bangla input is grammatically wrong and visible to any BdSL user."

**Code does:**
- `PlayerPage.js` line 92: `<span className="title-icon">ASL</span>`
- `PlayerPage.js` line 155: `<span className="sign-badge">ASL Sign Interpreter</span>`
- `LandingPage.js` feature card: "Groq AI converts subtitles to ASL gloss notation"
- `sign.js` system prompt: "You convert English captions into concise ASL gloss"
- `SIGN_MOTIONS` includes `ASL: { label: "ASL", motion: "fingerspell" }` as a known sign

The entire product claims to do ASL. The documentation requires BdSL. These are different languages with different vocabularies, grammar, and cultural contexts.

---

### CON-04 · Fallback for unknown words: generic gesture vs. specified hierarchy — **P1**

**Docs say:** Fallback hierarchy is explicit — concept card first, fingerspelling last. Hand Talk is cited as the example that destroyed user trust by falling back to fingerspelling for everything.

**Code does:** For unknown words, `getSignInfo()` returns `{ motion: "fingerspell" }` (a generic procedural gesture, not actual fingerspelling or a concept card). This is a third option — generic gesture — that the docs neither prescribe nor accept.

---

### CON-05 · Avatar framed as the product, not the delivery mechanism — **P1**

**Docs say:** PDF's central reframe: "The avatar is not the product. The product is a synchronized, simplified, accessible version of what the professor just said." Priority order: (1) accurate captions, (2) simplified language, (3) synchronized signing.

**Code/UI does:** The landing page leads with "watch it side-by-side with a real-time AI sign language avatar." The status bar calls it "ASL Sign Interpreter." The animated 3D avatar is the first thing a user sees. Captions are an afterthought at the bottom. The UI hierarchy inverts the documented value proposition.

---

### CON-06 · Gloss prompt uses ASL rules without BdSL grammar — **P1**

**Docs say:** Use Bangla-SGP examples in the prompt. BdSL follows topic-comment structure (different from both English SVO and ASL conventions in several specifics).

**Code does:** `buildGlossPrompt()` instructs the LLM with "topic-comment structure where natural" — which sounds correct but is sourced from ASL conventions, not BdSL. The batch prompt does not even include the topic-comment rule. Neither prompt includes a single Bangla-SGP example pair to calibrate the model on BdSL-specific grammar. The model will default to ASL-style output for English input.

---

## Summary Table

| ID | Category | Priority | One-Line Description |
|----|----------|----------|---------------------|
| GAP-01 | Gap | P0 | WhisperX word-level timestamps not integrated |
| GAP-02 | Gap | P0 | Linear O(n) caption scan instead of binary-search timeline lock |
| GAP-03 | Gap | P0 | Word timing is uniform distribution, not actual word onsets |
| GAP-04 | Gap | P0 | No seek/pause state machine |
| GAP-05 | Gap | P1 | No catch-up/skip buffer |
| GAP-06 | Gap | P1 | NMMs absent (eyebrow/head grammar only partially word-triggered) |
| GAP-07 | Gap | P1 | No concept card fallback UI |
| GAP-08 | Gap | P1 | Gloss prompt has no Bangla-SGP few-shot examples |
| GAP-09 | Gap | P1 | Dictionary has generic social vocab, not domain-specific lecture vocab |
| GAP-10 | Gap | P2 | No confidence signaling in captions or avatar |
| GAP-11 | Gap | P2 | No pre-processing / caching for demo lecture |
| GAP-12 | Gap | P2 | signEnabled toggle exists but not surfaced as discreet mode |
| GAP-13 | Gap | P2 | No BdSL community collaborator |
| GAP-14 | Gap | P2 | Zero test infrastructure |
| GAP-15 | Gap | P2 | No pre-recorded demo backup video |
| CON-01 | Contradiction | P0 | render.yaml uses ANTHROPIC_API_KEY instead of GROQ_API_KEY |
| CON-02 | Contradiction | P0 | Event-driven sync instead of timeline-locked |
| CON-03 | Contradiction | P1 | Product branded as ASL throughout; docs require BdSL |
| CON-04 | Contradiction | P1 | Unknown-word fallback is generic gesture, not concept card |
| CON-05 | Contradiction | P1 | Avatar framed as product; docs say avatar is delivery mechanism |
| CON-06 | Contradiction | P1 | ASL-convention gloss prompt with no BdSL grammar calibration |

---

## Recommended Fix Order (July 1 deadline)

These are sequenced by the CTO's sprint plan, not by gap number.

### Fix immediately (blocking all demo prep)

1. **CON-01** — Fix `render.yaml` GROQ key name (5 minutes)
2. **CON-03** — Replace "ASL" with "BdSL" throughout the UI and prompts (2 hours)

### Sprint 1 focus — synchronization engine

3. **GAP-02** — Replace `Array.find()` with binary search on sorted caption array
4. **GAP-04** — Implement pause/resume/seek state machine in `PlayerPage.js`
5. **GAP-05** — Add catch-up/skip buffer logic
6. **CON-02** — Restructure sync to timeline-locked pattern

> Note: **GAP-01** and **GAP-03** (WhisperX) are the ideal path but require a Python service. If that is out of scope for July 1, accept caption-level timing as the constraint and document it honestly. The binary search and seek state machine (items 3–5) still improve the current approach significantly.

### Sprint 3 focus — linguistic credibility

7. **GAP-06** — Implement 3 NMM rules (yes/no eyebrows, WH furrowed, negation head-shake)
8. **GAP-07** — Build concept card UI component for unknown vocabulary
9. **GAP-08** — Add 3–5 Bangla-SGP example pairs to the Groq system prompt
10. **GAP-09** — Choose the demo lecture, extract top 50 content words, build/record clips

### Sprint 4 / polish

11. **GAP-11** — Pre-process and cache the demo lecture URL response
12. **GAP-15** — Record the demo backup video
13. **CON-04 / CON-05** — Rewrite landing page copy to lead with captions, not avatar
14. **GAP-10** — Add confidence dim to CaptionBar

---

*Generated June 13, 2026 — based on full codebase read + synthesis of 21 /docs/ markdown files + PDF research landscape document.*
