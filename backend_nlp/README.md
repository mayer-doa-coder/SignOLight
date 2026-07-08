---
title: SignOLight NLP
emoji: 🤟
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# SignOLight NLP Microservice

FastAPI service for the [SignOLight](https://github.com/mayer-doa-coder/SignOLight) BdSL avatar pipeline.

**Endpoints:**

| Endpoint | Purpose |
|---|---|
| `GET /health` | Readiness probe |
| `POST /nlp/gloss` | Single caption → BdSL gloss (spaCy NLP) |
| `POST /nlp/gloss/batch` | Batch captions → BdSL gloss |
| `POST /nlp/timestamps` | YouTube video → word-level timestamps (WhisperX) |

**Phase B2 — WhisperX timestamps:**
Downloads YouTube audio via `yt-dlp`, runs WhisperX ASR + phoneme alignment,
returns `{ word, startMs, endMs, score }` per word for the full video.
The Node backend attaches these as `caption.spokenTimings` so the avatar
word windows use real speech boundaries instead of syllable estimates.

Configure `WHISPER_MODEL` env var: `tiny` (default) | `base` | `small`
