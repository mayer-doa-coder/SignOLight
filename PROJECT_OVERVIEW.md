# SignOLight — How It Works (5-Minute Overview)

## What it does
A Deaf student pastes a YouTube lecture URL. The app fetches captions, converts them into BdSL (Bangla Sign Language) gloss, and plays a synced 3D avatar signing alongside the captions. Captions come first — the avatar is a reinforcement layer, never a replacement.

## Data flow (end to end)

```
YouTube URL
  → GET /api/video/info      → title/thumbnail via oEmbed
  → GET /api/captions        → 4-method extraction cascade (below)
  → POST /api/sign/batch     → Groq LLM turns captions into BdSL gloss
  → PlayerPage.js            → binary-search sync loop, drives everything
  → SignAvatar.js            → 3D VRM avatar plays the current word's sign
  → CaptionBar.js            → captions + gloss + confidence, always visible
```

## Backend logic

**Captions (`backend/routes/captions.js`)** — tries 4 methods in order until one works: scrape the watch page's `ytInitialPlayerResponse`, then the `timedtext?type=list` XML endpoint, then 4 direct `timedtext` URL variants, then the `youtube-transcript` npm library as last resort.

**Gloss (`backend/routes/sign.js`)** — sends captions to Groq (`llama-3.1-8b-instant`) with a prompt enforcing BdSL grammar: topic-comment order, SOV (subject-object-verb), no articles/auxiliaries, WH-words moved to sentence-end, negation at sentence-end. Handles Bangla-English code-switched text. If no API key or Groq fails, falls back to `simpleGloss()` — a rule-based reordering using a hardcoded verb list. Also generates plain-language "concept card" definitions for words with no sign (`[CONCEPT:X]` tags).

## Frontend logic

**Sync engine (`PlayerPage.js` + `utils/sync.js`)** — polls the YouTube player every 100ms. `findCaption()` is a **binary search** (O(log n)) against sorted caption timestamps — this is the core "differentiator" the CTO axioms call out. A `playerState` machine (`idle/playing/paused/seeking`) freezes the avatar on pause and snaps it to the right spot after a seek instead of racing to catch up.

**Grammar-driven facial expressions (`computeNMM` in `utils/sync.js`)** — 3 rules, matching real BdSL/ASL linguistics:
- WH-question (gloss has WHAT/WHERE/WHEN/HOW/WHY) → eyebrows furrow
- Yes/No question (sentence ends in `?`, no WH-word) → eyebrows raise
- Negation (NO/NOT/NEVER/CANNOT/etc.) → head-shake

## The 3D avatar (`SignAvatar.js`)

- **Stack**: Three.js + `@pixiv/three-vrm`, loading `frontend/public/models/sign.vrm`. If the VRM fails to load, falls back to a simple procedural avatar built from Three.js primitives (never a blank screen).
- **Playing a sign, in priority order**:
  1. Pre-animated JSON clip from `/signs/WORD.json` (27 words currently have real keyframe clips, cached in `signClipCache`)
  2. Procedural motion — a hardcoded switch-statement animation (58 words total have *some* motion, JSON or procedural)
  3. **Concept card** — no gesture, just a 2D text overlay explaining the word (for anything outside the dictionary — this is intentional, per Axiom 1: no neural sign generation, ever)
  4. **Fingerspelling** — only for words explicitly tagged `[FINGERSPELL:X]` by the LLM (proper nouns etc.)
- **Facial expressions (NMMs)** are applied via VRM blendshapes (brows, mouth, eye gaze) on top of whatever body motion is playing, fading in over 200ms.

## UI controls (`ControlPanel.js` / `CaptionBar.js`)
- Layout switcher (side-by-side / picture-in-picture / focus-on-sign)
- Signing speed (1×/¾×/½×) for learning mode
- **Discreet mode** — hides the avatar entirely, captions stay (for Anik/Nadia personas)
- Confidence dimming — low-confidence gloss/captions render at reduced opacity with a `~` marker
- Debug panel — raw text, simplified text, gloss, per-word timing, NMM state

## Current known limits
- Only 27/58 dictionary words have hand-authored JSON clips; the rest use simpler procedural motion.
- BdSL gloss rules and hand shapes are prototype-level, based on academic sources (Bangla-SGP dataset), **not yet validated by the BdSL community**.
- WhisperX-based ASR (for lectures with no YouTube captions) exists as an optional microservice hook but isn't required to run the app.
