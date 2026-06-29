# 🤟 SignLearn — AI Sign Language Video Player

> **Hackathon Project** · Inclusive Education Tool for Deaf & Hard-of-Hearing Students

SignLearn lets you paste any YouTube educational video URL and watch it **side-by-side with a real-time AI sign language avatar** that synchronizes perfectly with the video's captions.

---

## 🖼️ What It Does

- 📺 **YouTube video player** on the left (with built-in captions)
- 🤟 **Animated sign language avatar** on the right — signs every word in sync
- 🤖 **Groq AI** converts subtitles → ASL gloss notation in real time
- 🎛️ Three layout modes: Side-by-Side / Picture-in-Picture / Focus Sign
- 📜 **Caption timeline bar** at the bottom — click any caption to jump to it
- ⚡ Works with any YouTube video that has CC subtitles enabled

---

## 🗂️ Project Structure

```
signlearn/
├── backend/             ← Express.js API server
│   ├── server.js        ← Entry point
│   ├── routes/
│   │   ├── video.js     ← YouTube metadata fetch
│   │   ├── captions.js  ← Caption extraction
│   │   └── sign.js      ← AI sign language translation
│   ├── .env.example
│   └── package.json
│
├── frontend/            ← React app
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   │   ├── LandingPage.js   ← URL input page
│   │   │   └── PlayerPage.js    ← Main player page
│   │   ├── components/
│   │   │   ├── YouTubePlayer.js ← YouTube IFrame API wrapper
│   │   │   ├── SignAvatar.js    ← Animated SVG signing avatar
│   │   │   ├── CaptionBar.js   ← Caption timeline + current text
│   │   │   └── ControlPanel.js ← Layout & sign toggle controls
│   │   └── styles/global.css
│   ├── public/index.html
│   ├── .env.example
│   └── package.json
│
├── render.yaml          ← Render.com deployment config
├── package.json         ← Root scripts
└── README.md
```

---

## 🚀 Local Setup (Step-by-Step)

### Prerequisites
- **Node.js** v18+ ([download](https://nodejs.org))
- **npm** v8+
- A **Groq API key** (free plan works) → [console.groq.com](https://console.groq.com)

---

### Step 1 — Clone / Download the project

```bash
# If using git:
git clone https://github.com/YOUR_USERNAME/signlearn.git
cd signlearn

# Or just unzip the downloaded folder and cd into it
cd signlearn
```

---

### Step 2 — Install dependencies

```bash
# Install root tools
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

Or all at once:
```bash
npm run install:all
```

---

### Step 3 — Configure environment variables

**Backend:**
```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in:
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxx          # Your Groq key
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BATCH_SIZE=10
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

Open `frontend/.env` and set:
```env
REACT_APP_API_URL=http://localhost:5000
```

---

### Step 4 — Run in development mode

**Terminal 1 — Start backend:**
```bash
cd backend
npm run dev
# ✅ Server starts at http://localhost:5000
```

**Terminal 2 — Start frontend:**
```bash
cd frontend
npm start
# ✅ React app opens at http://localhost:3000
```

Or run both at once from root:
```bash
npm run dev
```

---

### Step 5 — Test it!

1. Open **http://localhost:3000**
2. Paste a YouTube URL with captions, e.g.:
   - `https://www.youtube.com/watch?v=kqtD5dpn9C8` (Khan Academy)
   - `https://www.youtube.com/watch?v=HluANRwPyNo` (TED-Ed)
3. Click **Start Learning** — the sign avatar will appear!

> **Tip:** Make sure to use videos that have **CC (Closed Captions)** enabled.
> Khan Academy, TED-Ed, and most major educational channels work great.

---

## ☁️ Deploy for Free

### Option A — Render.com (Recommended, one-click)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your GitHub repo
4. Render reads `render.yaml` automatically and creates both services (API + frontend)
5. In the **Render dashboard**, add environment variables:
   - Backend service → Environment → Add:
     - `GROQ_API_KEY` = your key
     - `GROQ_MODEL` = `llama-3.1-8b-instant`
     - `GROQ_BATCH_SIZE` = `10`
     - `FRONTEND_URL` = your frontend Render URL (set after first deploy)
   - Frontend service → Environment → Add:
     - `REACT_APP_API_URL` = your backend Render URL

6. Trigger a redeploy on both services
7. Your app is live! 🎉

**Optional — Enable WhisperX (free, Phase B2):**
Deploy `backend_nlp/` to [Hugging Face Spaces](https://huggingface.co/spaces) (free, 16 GB RAM).
Then set `NLP_SERVICE_URL` on the Render backend to your Space URL.
See [`docs/WHISPERX_DEPLOYMENT.md`](docs/WHISPERX_DEPLOYMENT.md) for step-by-step instructions.

---

### Option B — Vercel (Frontend) + Render (Backend)

**Backend on Render:**
1. New Web Service → Connect GitHub repo
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add env vars: `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_BATCH_SIZE`, `FRONTEND_URL`
6. Copy your Render backend URL (e.g. `https://signlearn-api.onrender.com`)

**Frontend on Vercel:**
1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Root Directory: `frontend`
3. Framework Preset: Create React App
4. Add Environment Variable:
   - `REACT_APP_API_URL` = your Render backend URL
5. Deploy!

---

## 🔑 API Keys Needed

| Key | Required | Where to Get | Free? |
|-----|----------|--------------|-------|
| `GROQ_API_KEY` | ✅ Yes | [console.groq.com](https://console.groq.com) | Free plan available |
| YouTube Data API | ❌ Optional | Google Cloud Console | Free (10k/day) |

> **Without Groq key:** The app still works! It falls back to a simple word-by-word gloss system (no AI, but functional).

---

## 🎛️ How It Works (Technical Flow)

```
User pastes YouTube URL
        ↓
Backend: GET /api/video/info
  → YouTube oEmbed API (no key needed)
  → Returns title, author, thumbnail, videoId
        ↓
Frontend: Loads YouTube IFrame API player
        ↓
Backend: GET /api/captions?videoId=xxx
  → YouTube Timedtext API (no key needed)
  → Parses XML → [{start, end, text}]
        ↓
Backend: POST /api/sign/batch
  → Groq AI converts each caption
  → text → ASL gloss notation
  → Returns [{start, end, text, gloss, words[]}]
        ↓
Frontend: Polls player.getCurrentTime() every 250ms
        ↓
SignAvatar: Finds active caption by timestamp
  → Animates SVG avatar through each word
  → Cycles hand motions, colors, gestures
  → Word progress dots update in real time
```

---

## 🛠️ Customization

### Add more sign motions in `SignAvatar.js`
Edit the `SIGN_MOTIONS` object to add words:
```js
WATER: { label: "Water", emoji: "💧", motion: "w-chin", color: "#3b82f6" },
```

### Change avatar appearance
Edit the `AvatarSVG` function — it's pure SVG with CSS variables.

### Add more languages
In `sign.js` backend route, change the Groq prompt to target a different sign language (BSL, ISL, etc.).

---

## 📋 Sample Videos That Work Well

| Video | URL |
|-------|-----|
| Khan Academy - Basic Math | `youtube.com/watch?v=kqtD5dpn9C8` |
| TED-Ed - How the brain works | `youtube.com/watch?v=HluANRwPyNo` |
| Python for Beginners | `youtube.com/watch?v=1BfCnjr_Vjg` |
| NASA Space Science | `youtube.com/watch?v=_tmkDIgZFLE` |
| Crash Course Biology | `youtube.com/watch?v=QnQe0xW_JY4` |

---

## 🐛 Troubleshooting

**"No captions found"**
→ The video doesn't have CC enabled. Try another video with the CC icon.

**Sign avatar not moving**
→ Check that captions loaded (green status bar). Check browser console for errors.

**Backend connection error**
→ Make sure backend is running on port 5000. Check `REACT_APP_API_URL` in frontend `.env`.

**Render free tier sleeping**
→ Free Render services sleep after 15min. First request takes ~30s to wake up. Consider adding a health-ping cron job.

---

## 📄 License

MIT License — free to use, modify, and submit to hackathons!

---

Built with ❤️ for inclusive education · **SignLearn 2025**
