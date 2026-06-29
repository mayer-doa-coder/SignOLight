# WhisperX Word-Level Timestamps — Deployment Guide (Hugging Face Spaces)

> **Context:** The code is fully written. This guide covers the ~15 minutes of
> infrastructure setup needed to activate the WhisperX feature in production.
>
> Without this setup: the app works normally using syllable-weighted timing (Phase A). Free, no config.
> With this setup: word windows use actual speech boundaries from WhisperX (~30% more accurate). Also free.

---

## Why Hugging Face Spaces

| Platform | RAM | Cost | WhisperX? |
|---|---|---|---|
| Render free | 512 MB | $0 | ❌ OOM crash (`base` model alone needs ~900 MB) |
| Render Starter | 512 MB | $7/mo | ❌ Same |
| Render Standard | 2 GB | $25/mo | ✅ But costs money |
| **HF Spaces free** | **16 GB** | **$0** | **✅ All models fit with room to spare** |

HF Spaces free CPU tier gives 2 vCPUs and 16 GB RAM. The `base` WhisperX model uses ~900 MB —
the Space has 17× more RAM than it needs. No plan upgrade required.

---

## What You're Deploying

`backend_nlp/` as a Docker-based Hugging Face Space.

The Space exposes `POST /nlp/timestamps`: the Node backend (`signlearn-api`) calls it in
parallel with Groq during `POST /api/sign/batch`, then attaches per-word timestamps as
`caption.spokenTimings`. The frontend's `computeWordTimings()` uses these automatically.

When `NLP_SERVICE_URL` is not set → fallback to Phase A syllable timing. No errors. No broken UI.

---

## Prerequisites

- [ ] A free [huggingface.co](https://huggingface.co) account
- [ ] Git installed locally
- [ ] The `signlearn-api` Render service already deployed (the Node backend)

---

## Step 1 — Push Your Code to GitHub

If not already pushed:

```bash
git add .
git commit -m "feat: WhisperX word-level timestamps (Phase B2)"
git push origin main
```

---

## Step 2 — Create a Hugging Face Space

1. Log in to [huggingface.co](https://huggingface.co)
2. Click your profile icon → **New Space**
3. Fill in the form:
   - **Space name:** `signlight-nlp` (or any name you like)
   - **License:** MIT
   - **SDK:** **Docker** ← important, not Gradio or Streamlit
   - **Visibility:** Public (required for free hardware)
4. Click **Create Space**

HF creates an empty repo at `https://huggingface.co/spaces/YOUR_USERNAME/signlight-nlp`.

---

## Step 3 — Push `backend_nlp/` to the Space

HF Spaces are Git repos. You push just the `backend_nlp/` folder — not the whole SignOLight repo.

```bash
# Clone the empty Space repo (replace YOUR_USERNAME with your HF username)
git clone https://huggingface.co/spaces/YOUR_USERNAME/signlight-nlp hf-nlp-space

# Copy the backend_nlp contents into it
cp -r backend_nlp/. hf-nlp-space/

# Push to HF
cd hf-nlp-space
git add .
git commit -m "Initial deploy: SignOLight NLP + WhisperX"
git push
```

> **Windows:** Replace `cp -r backend_nlp/. hf-nlp-space/` with:
> ```
> xcopy /E /I /Y backend_nlp hf-nlp-space
> ```

HF detects the `Dockerfile` (sdk: docker from `README.md`) and starts building.
The first build takes **8–15 minutes** (PyTorch CPU wheel is ~800 MB to download).
Subsequent builds are faster (Docker layer cache).

---

## Step 4 — Watch the Build

On the Space page, click the **Build logs** tab. You should see:

```
Building Docker image...
Step 1/10 : FROM python:3.11-slim
Step 2/10 : RUN apt-get install ffmpeg curl
...
Step 9/10 : RUN pip install whisperx faster-whisper yt-dlp
Step 10/10 : CMD uvicorn main:app --port 7860
Successfully built.
Starting application...
INFO: Loading spaCy en_core_web_md...
INFO: NLP ready — 58 sign vectors pre-computed
INFO: Application startup complete.
```

Once the Space shows **"Running"** (green badge) → it's live.

---

## Step 5 — Set Environment Variables on the Space

In your Space → **Settings** → **Repository secrets** (scroll down):

| Key | Value | Notes |
|---|---|---|
| `WHISPER_MODEL` | `base` | `tiny` for fastest; `base` recommended; `small` for highest accuracy |
| `WHISPER_DEVICE` | `cpu` | HF Spaces free tier is CPU only |

Click **Save** after adding each secret. The Space restarts automatically.

---

## Step 6 — Copy Your Space URL

Your Space is live at:
```
https://YOUR_USERNAME-signlight-nlp.hf.space
```

Verify it's working:
```bash
curl https://YOUR_USERNAME-signlight-nlp.hf.space/health
# Expected: { "status": "ok", "model": "en_core_web_md", "signs": 58 }
```

---

## Step 7 — Set NLP_SERVICE_URL in the Render Backend

In the **Render dashboard** → `signlearn-api` service → **Environment** tab:

| Key | Value |
|---|---|
| `NLP_SERVICE_URL` | `https://YOUR_USERNAME-signlight-nlp.hf.space` |

Click **Save** — the Node backend redeploys in ~30 seconds.

That's it. WhisperX is now active.

---

## Step 8 — Test End-to-End

### Quick health check
```bash
curl https://YOUR_USERNAME-signlight-nlp.hf.space/health
```

### Test the timestamps endpoint directly
```bash
curl -X POST https://YOUR_USERNAME-signlight-nlp.hf.space/nlp/timestamps \
  -H "Content-Type: application/json" \
  -d '{"videoId": "aircAruvnKk"}' \
  --max-time 180
```

Expected (after ~60–90s on first call — model warms up):
```json
{
  "videoId": "aircAruvnKk",
  "words": [
    { "word": "OKAY", "startMs": 3420, "endMs": 3680, "score": 0.97 },
    { "word": "SO", "startMs": 3720, "endMs": 3890, "score": 0.95 }
  ],
  "count": 1847
}
```

### Test via the app
1. Open the app → submit the Neural Networks video
2. Open browser DevTools → Network → find the `/api/sign/batch` response
3. Look for `spokenTimings` on any caption:

```json
{
  "start": 3420, "end": 6800,
  "gloss": "NETWORK PATTERN LEARN",
  "spokenTimings": [
    { "word": "SO", "startMs": 3720, "endMs": 3890, "score": 0.95 },
    { "word": "NEURAL", "startMs": 4010, "endMs": 4380, "score": 0.97 }
  ]
}
```

`spokenTimings` present → Phase B2 active. Avatar word windows now use real speech boundaries.

---

## Keeping the Space Updated

When you change Python code in `backend_nlp/`, redeploy by copying and pushing again:

```bash
cp -r backend_nlp/. hf-nlp-space/
cd hf-nlp-space
git add .
git commit -m "update NLP service"
git push
```

HF rebuilds automatically (layer cache makes it faster — only changed layers rebuild).

---

## Space Sleep Behaviour

HF free Spaces sleep after **~48 hours** of no incoming requests (not 15 minutes like Render free).
When a request arrives, the Space wakes in **~30 seconds** (container restart — model reloads).

The Node backend's `fetchWordTimestamps()` has a 180-second timeout and gracefully degrades
to null (syllable timing) if the Space is waking up. The next `/api/sign/batch` call will
usually get real timestamps once the Space is warm.

To prevent sleep entirely: go to Space Settings → enable **"Always on"** (requires HF Pro, $9/mo).
For a demo, the 30-second wake-up is acceptable.

---

## Troubleshooting

**Build fails at torch install**
→ The PyTorch CPU wheel is large (~800 MB). HF Spaces has a build timeout.
Try using a lighter base:
```dockerfile
FROM pytorch/pytorch:2.3.1-cuda11.8-cudnn8-runtime  # smaller than downloading separately
```
Or reduce torch version to `2.1.0`.

**`yt-dlp` fails: "Sign in to confirm you're not a bot"**
→ YouTube sometimes blocks cloud IPs. Workaround: add a browser cookie file.
Download your YouTube cookies using a browser extension (e.g. "Get cookies.txt LOCALLY"),
upload as `cookies.txt` to the Space repo, and update `timestamps.py`:
```python
subprocess.run(["yt-dlp", "--cookies", "/app/cookies.txt", ...])
```

**`/nlp/timestamps` returns `{ "words": [], "count": 0 }`**
→ Either yt-dlp was blocked (see above) or whisperx failed silently.
Check Space logs: Space page → **Logs** tab → look for `[timestamps]` lines.

**`spokenTimings` not appearing in `/api/sign/batch` response**
→ Check that `NLP_SERVICE_URL` is set on the Render backend (no trailing slash, no quotes).
→ Check Render backend logs for `[timestamps] NLP service returned` messages.

---

## Rollback (Disable WhisperX)

To disable Phase B2 without any code change:
1. Render dashboard → `signlearn-api` → Environment → clear `NLP_SERVICE_URL`
2. Save → service redeploys
3. All captions fall back to Phase A syllable timing immediately

The Space itself can stay running — it costs nothing on free tier.

---

## Accuracy After Deployment

| Mode | Word window accuracy | Root cause of remaining error |
|---|---|---|
| Phase A (syllable only) | ±30–40% per word | Caption includes silence; syllables ≠ signing duration |
| Phase B2 `tiny` model | ±15–25% per word | Better boundaries; `tiny` WER ~12% |
| Phase B2 `base` model | ±10–20% per word | Better boundaries; `base` WER ~7% |
| Phase B2 `small` model | ±8–15% per word | Best accuracy; ~2× slower inference |

The remaining error after Phase B2 is fundamental: WhisperX gives spoken English word timestamps,
but the BdSL gloss is in SOV order with fewer words. The avatar distributes gloss words by syllable
weight within the real speech span — boundaries are accurate, individual word alignment within the
span is still an approximation. This limit only lifts with a BdSL-specific ASR corpus (post-Phase B).
