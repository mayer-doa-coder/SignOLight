# QUICKSTART — SignOLight / SignLearn

A YouTube-to-BdSL sign language pipeline. This file covers local development and global deployment on Render.com.

---

## TL;DR (local dev in 4 commands)

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev

# Terminal 2 — frontend
cd frontend && npm install && npm start
```

Then open `http://localhost:3000` and paste the demo URL:
`https://www.youtube.com/watch?v=aircAruvnKk`

---

## Prerequisites

| Requirement | Minimum | Recommended | Check |
|-------------|---------|-------------|-------|
| Node.js | 18.x | 20.x or 24.x | `node --version` |
| npm | 9.x | 10.x+ | `npm --version` |
| Groq API key | required | — | [console.groq.com](https://console.groq.com) — free tier |

> **No other services required.** The app uses YouTube's public CC API (no YouTube key needed for captions) and Groq's free tier for LLM glossing.

---

## Local Development

### Step 1 — Clone and enter the repo

```bash
git clone <repo-url>
cd SignOLight
```

### Step 2 — Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your Groq API key:

```env
GROQ_API_KEY=gsk_your-key-here      # required — get from console.groq.com
GROQ_MODEL=llama-3.1-8b-instant     # free-tier model, leave as-is
GROQ_BATCH_SIZE=10                  # captions per Groq call
FRONTEND_URL=http://localhost:3000   # CORS allow-list for local dev
PORT=5000                           # backend port
```

> The frontend `.env` is already configured for local dev:
> `REACT_APP_API_URL=http://localhost:5000` (also proxied via `package.json` → no change needed).

### Step 3 — Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (in a new terminal)
cd frontend && npm install
```

### Step 4 — Start both servers

**Terminal 1 — Backend (port 5000):**
```bash
cd backend
npm run dev        # nodemon hot-reload
# OR
node server.js     # plain Node
```

Expected output:
```
SignLearn backend running on http://localhost:5000
[cache] Pre-fetching demo lecture aircAruvnKk...
[cache] Demo pre-fetch complete: 83 segments cached to file.
```

> On subsequent restarts, the demo lecture loads from `backend/cache/aircAruvnKk.json` instead of calling the API again:
> ```
> [cache] Demo lecture loaded from file cache (83 segments).
> ```

**Terminal 2 — Frontend (port 3000):**
```bash
cd frontend
npm start
```

Expected output:
```
Compiled successfully!
Local: http://localhost:3000
```

### Step 5 — Open the app

Navigate to `http://localhost:3000`.

**Quick smoke test:**
1. Click the **"3Blue1Brown - Neural Networks"** sample button — it should auto-load
2. Click **"Process full video"** — wait ~10–20 seconds for captions to process
3. Press play — the BdSL avatar should start signing in sync with the video
4. Enable **"Debug"** in the control panel — watch the sync drift panel (target: ≤2000ms)

---

## Running Tests

### Backend tests (unit + integration + comprehension)

```bash
cd backend
npm test
```

Expected:
```
Test Suites: 3 passed, 3 total
Tests:       61 passed, 61 total
```

| Suite | File | Count |
|-------|------|-------|
| Unit (simpleGloss, buildGlossPrompt, normalizeGloss) | `__tests__/sign.test.js` | 19 |
| Integration (HTTP endpoints, file cache round-trip) | `__tests__/integration.test.js` | 20 |
| Comprehension proxy (SOV order, domain coverage, NMM grammar) | `__tests__/comprehension.test.js` | 22 |

### Frontend tests (binary search, NMM grammar)

```bash
cd frontend
npm test -- --watchAll=false
```

Expected:
```
Tests: 16 passed
```

---

## Project Structure

```
SignOLight/
├── backend/
│   ├── server.js              Express app (exported for tests, listens only as main)
│   ├── routes/
│   │   ├── sign.js            Two-step pipeline: simplifyBatch → batchTextToSignGloss
│   │   ├── captions.js        4-method YouTube caption extraction
│   │   └── video.js           oEmbed metadata
│   ├── cache/                 Persistent JSON cache (gitignored)
│   └── __tests__/             Jest test suites
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PlayerPage.js  Timeline-locked sync engine + drift telemetry
│   │   │   └── LandingPage.js
│   │   ├── components/
│   │   │   ├── SignAvatar.js   VRM avatar + cross-sign blending + NMM overrides
│   │   │   ├── CaptionBar.js  Captions + simplified text + debug panel
│   │   │   └── YouTubePlayer.js  250ms poll → onTimeUpdate
│   │   ├── services/
│   │   │   └── timelineScheduler.js  Character-weighted word timing, effectiveNMM
│   │   └── utils/
│   │       ├── sync.js        findCaption (binary search), computeNMM
│   │       ├── notation.js    Articulatory space, computeDictionaryCoverage
│   │       └── nDTW.js        Clip quality metric (Ham2Pose)
│   └── public/
│       ├── models/sign.vrm    12MB VRM avatar model
│       └── signs/*.json       27 sign clip files (17 social + 10 domain)
└── render.yaml                Render.com deployment config
```

---

## Global Deployment (Render.com)

Both services are configured in [`render.yaml`](render.yaml) and deploy from this single repo.

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "deploy"
git push origin main
```

### Step 2 — Connect Render

1. Go to [render.com](https://render.com) → New → Blueprint
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates both services automatically

### Step 3 — Set environment variables in the Render dashboard

**Backend service (`signlearn-api`):**

| Variable | Value |
|----------|-------|
| `GROQ_API_KEY` | Your key from [console.groq.com](https://console.groq.com) |
| `FRONTEND_URL` | Your frontend Render URL, e.g. `https://signlearn-frontend.onrender.com` |

**Frontend service (`signlearn-frontend`):**

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | Your backend Render URL, e.g. `https://signlearn-api.onrender.com` |

> Set these in **Render Dashboard → Service → Environment** before the first deploy, or trigger a redeploy after setting them.

### Step 4 — Verify deployment

Once both services show **"Live"** in Render:

1. Open the frontend URL
2. Click the Neural Networks sample — it should hit the pre-warmed cache immediately (no processing wait)
3. The debug panel should show sync drift ≤2000ms after 30 seconds of playback

**Expected first-boot log (backend):**
```
SignLearn backend running on http://0.0.0.0:PORT
[cache] Pre-fetching demo lecture aircAruvnKk...
[cache] Demo pre-fetch complete: 83 segments cached to file.
```

> On Render free tier, the backend spins down after 15 minutes of inactivity. The first request after spin-down will take ~30 seconds (cold start). The demo lecture will re-fetch from the file cache on warm restart.

---

## Verification Checklist

Run through this after any local or production setup:

```
[ ] http://localhost:3000 (or prod URL) loads without console errors
[ ] Neural Networks sample button auto-fills the URL and submits
[ ] "Process full video" completes in <30s with "X segments translated to BdSL"
[ ] Avatar animates in sync with video — visible signs match captions
[ ] Pause → avatar freezes; Resume → avatar continues from correct position
[ ] Seek to 2:00 → avatar snaps to correct caption within 500ms
[ ] CaptionBar shows simplified text below original caption (→ prefix)
[ ] Debug panel shows sync drift ≤2000ms
[ ] "Caption Only (Discreet)" toggle hides avatar
[ ] Backend tests: cd backend && npm test → 61 passed
[ ] Frontend tests: cd frontend && npm test -- --watchAll=false → 16 passed
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `GROQ_API_KEY not set` warning in backend logs | Missing `.env` | Copy `backend/.env.example` → `backend/.env` and fill key |
| "No captions found" on most videos | YouTube rate-limits or no CC on video | Use the sample 3Blue1Brown videos — they have confirmed CC |
| Avatar shows a grey box (no model) | VRM failed to load | Check browser console for `/models/sign.vrm` 404; file must be at `frontend/public/models/sign.vrm` |
| `jest: command not found` | backend `node_modules` not installed | `cd backend && npm install` |
| Frontend shows `ECONNREFUSED :5000` | Backend not running | Start `cd backend && npm run dev` in a separate terminal |
| Render backend shows "Service unavailable" | Free-tier cold start | Wait 30s and refresh; first request after spin-down wakes the service |
| Demo pre-fetch takes >90s | Groq API slow or rate-limited | Reduce `GROQ_BATCH_SIZE` to 5 in `.env`; or check Groq dashboard for quota |
| Signs look robotic / jerky | Cross-sign transition not loading | Check browser console for `[SignAvatar]` warnings; confirm VRM model loaded |
