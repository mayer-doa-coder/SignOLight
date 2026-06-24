# SignOLight — Project Documentation

> A deep-dive into the architecture, data flow, and component design of the SignLearn app.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [The 3D Sign Avatar](#6-the-3d-sign-avatar)
7. [Primary Data Flow](#7-primary-data-flow)
8. [Styling System](#8-styling-system)
9. [Deployment Configuration](#9-deployment-configuration)
10. [Known Issues](#10-known-issues)

---

## 1. Project Overview

**SignOLight** (branded as *SignLearn*) is an AI-powered accessibility tool built for deaf and hard-of-hearing learners. Users paste any YouTube video URL and watch it side-by-side with a real-time 3D animated sign language avatar that signs every word in sync with the video's closed captions.

The core pipeline is:

```
YouTube Video → Captions → AI (ASL Gloss) → 3D Avatar Animation
```

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend UI | React 18 | Component-based browser app |
| 3D Rendering | Three.js 0.184 | Draws and animates the avatar on a `<canvas>` |
| Avatar Model | VRM (`@pixiv/three-vrm`) | Standard 3D avatar format used in VTubing |
| UI Animations | Framer Motion | Smooth transitions and effects |
| HTTP Client | Axios | Frontend → Backend API calls |
| Backend | Express.js (Node.js) | REST API server on port 5000 |
| AI Translation | Groq API (Llama 3.1 8B) | Converts English captions to ASL gloss notation |
| Caption Source | YouTube Timedtext + `youtube-transcript` | Fetches subtitles from YouTube videos |

---

## 3. Folder Structure

```
SignOLight/
│
├── backend/                    # Express API server
│   ├── server.js               # Entry point — middleware, CORS, rate limiting, route wiring
│   ├── routes/
│   │   ├── video.js            # GET /api/video/info — fetch YouTube video metadata
│   │   ├── captions.js         # GET /api/captions — extract timed captions from YouTube
│   │   └── sign.js             # POST /api/sign/batch — AI translation to ASL gloss
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React browser app
│   ├── public/
│   │   ├── index.html          # HTML shell
│   │   ├── models/
│   │   │   └── sign.vrm        # 3D avatar model file (13 MB)
│   │   └── signs/              # Pre-recorded sign motion clips (19 JSON files)
│   │       ├── HELLO.json
│   │       ├── GOOD.json
│   │       └── ...
│   ├── src/
│   │   ├── App.js              # Top-level router (no React Router — manual state)
│   │   ├── index.js            # React root mount point
│   │   ├── pages/
│   │   │   ├── LandingPage.js  # Home screen with URL input
│   │   │   ├── PlayerPage.js   # Main video + avatar experience
│   │   │   └── SignDemoPage.js # Standalone sign motion showcase
│   │   ├── components/
│   │   │   ├── SignAvatar.js   # 3D avatar component (1089 lines)
│   │   │   ├── YouTubePlayer.js# YouTube IFrame API wrapper
│   │   │   ├── CaptionBar.js   # Caption timeline at the bottom
│   │   │   └── ControlPanel.js # Layout toggle + sign on/off
│   │   └── styles/
│   │       └── global.css      # Design system — variables, fonts, utilities
│   ├── vercel.json             # Vercel deployment config (SPA rewrites)
│   ├── .env.example
│   └── package.json
│
├── package.json                # Root scripts — install all, run both servers
├── render.yaml                 # Render.com full-stack deployment blueprint
└── README.md                   # Setup and deployment guide
```

---

## 4. Backend Architecture

The backend is a standard Express.js REST API. It starts in `backend/server.js`, which:

- Loads `.env` from both the root and `backend/` directories
- Configures CORS (allowed origin set via `FRONTEND_URL` env var, defaults to `*`)
- Applies a rate limit of **100 requests per 15 minutes** across all `/api/` routes
- Registers three route modules

### Route: `GET /api/video/info`

**File:** `routes/video.js`

Accepts a YouTube URL in any common format (standard, `youtu.be`, embed, Shorts). Extracts the video ID with a regex, then calls YouTube's public **oEmbed API** — no API key required.

Returns:
```json
{
  "videoId": "abc123",
  "title": "Neural Networks Explained",
  "author": "3Blue1Brown",
  "thumbnail": "https://...",
  "embedUrl": "https://www.youtube.com/embed/abc123?cc_load_policy=1&cc_lang_pref=en"
}
```

---

### Route: `GET /api/captions`

**File:** `routes/captions.js` (340 lines)

The most complex route. It attempts four methods in sequence and stops at the first success:

| Priority | Method | How It Works |
|---|---|---|
| 1 | Watch page parse | Downloads the YouTube watch page HTML and finds the embedded JSON (`ytInitialPlayerResponse`) that contains caption track metadata |
| 2 | Timedtext API | Calls YouTube's public `/api/timedtext` endpoint to get an XML track list |
| 3 | Direct VTT/XML fetch | Tries multiple format + language combinations to download a caption file directly |
| 4 | `youtube-transcript` library | Last resort npm package that uses the transcript API |

Captions are returned as an array of timed chunks:
```json
[
  { "start": 0, "end": 3200, "text": "Hello everyone" },
  { "start": 3200, "end": 6800, "text": "Today we learn about neural networks" }
]
```

---

### Route: `POST /api/sign/batch`

**File:** `routes/sign.js` (193 lines)

Accepts an array of caption objects and translates each one into **ASL gloss notation** — a simplified, structured form where articles are dropped and words are capitalized (e.g., "the dog ate some food" → "DOG EAT FOOD").

**Process:**
1. Captions are split into batches (size controlled by `GROQ_BATCH_SIZE`, default 10)
2. Each batch is sent to the Groq API with a structured prompt
3. The AI returns a JSON array of gloss strings
4. Each gloss is split into a `words` array for word-by-word animation

**Prompt rules sent to AI:**
- Remove articles (a, an, the) unless essential
- Use topic-comment sentence structure
- Capitalize all words
- Max 8 words per gloss
- Use `[FINGERSPELL:X]` for proper nouns, `[NUMBER:X]` for digits

**Fallback (no Groq key):** A `simpleGloss()` function strips common stop words and uppercases what remains — no AI, but still functional.

Returns:
```json
{
  "results": [
    { "start": 0, "end": 3200, "text": "Hello everyone", "gloss": "HELLO EVERYONE", "words": ["HELLO", "EVERYONE"] }
  ],
  "count": 1,
  "model": "llama-3.1-8b-instant"
}
```

---

## 5. Frontend Architecture

### Routing

`App.js` manages navigation with plain React state — no React Router. It tracks:
- `currentPage`: `"landing"` | `"player"` | `"sign-demo"`
- `videoData`: the video info object returned from `/api/video/info`

Navigation calls `window.history.pushState()` to update the browser URL without a page reload.

---

### LandingPage.js

The entry screen. Contains:
- A YouTube URL text input (auto-focused)
- Three built-in sample video buttons (3Blue1Brown videos)
- A link to the Sign Demo page
- On submit: calls `GET /api/video/info` to validate the URL, then navigates to PlayerPage

---

### PlayerPage.js

The main experience page. Key state:

| State Variable | Type | Purpose |
|---|---|---|
| `captions` | Array | Raw timed caption objects from the API |
| `signedCaptions` | Array | Captions enriched with AI gloss and word arrays |
| `currentTime` | Number | Current video playback position (seconds) |
| `currentCaption` | Object | The caption active at `currentTime` |
| `signEnabled` | Boolean | Whether the avatar panel is shown |
| `layout` | String | `"side-by-side"` / `"picture-in-picture"` / `"fullscreen-sign"` |

**Lifecycle:**
1. On mount: fetches video info and sets `videoData`
2. User clicks "Process Video": fetches captions → sends to AI → stores in `signedCaptions`
3. Every 250ms: `YouTubePlayer` fires `onTimeUpdate(seconds)` → `setCurrentTime`
4. A `useEffect` watches `currentTime` and finds the matching caption by timestamp
5. The active caption is passed to `SignAvatar`, which animates the corresponding signs

**Layout:**
```
[ Header: back button, video title, ControlPanel ]
[ Status bar: loading / ready / error states      ]
[ Video Panel          | Sign Avatar Panel        ]
[ Caption Timeline Bar (horizontal scroll)        ]
```

---

### SignDemoPage.js

A standalone showcase page. It cycles through demo word sets (Greetings, Basics, Learning, etc.) using a synthetic timer — no real video. Uses the same `SignAvatar` component but feeds it manually constructed caption objects. Words advance every 1250ms.

---

### YouTubePlayer.js

Wraps the YouTube IFrame JavaScript API:
- Lazy-injects the `<script>` tag for `youtube.com/iframe_api`
- Creates a `YT.Player` instance bound to a `<div>`
- Polls `player.getCurrentTime()` every 250ms via `setInterval`
- Exposes `seekTo()`, `play()`, and `pause()` via a React ref

Auto-enables captions with `cc_load_policy=1` in the embed URL parameters.

---

### CaptionBar.js

A horizontal scrolling strip at the bottom of the player. Each caption is rendered as a chip showing the timestamp and text. Behaviors:
- The active caption chip is highlighted
- Past captions are dimmed
- Clicking a chip calls `seekTo()` on the YouTube player
- The strip auto-scrolls to keep the active chip in view
- Hovering shows a tooltip with the full ASL gloss

---

### ControlPanel.js

A small toolbar rendered in the header. Contains:
- Three layout buttons (Side-by-Side, PiP, Fullscreen Sign)
- A Sign Language toggle button with an animated indicator dot

---

## 6. The 3D Sign Avatar

**File:** `frontend/src/components/SignAvatar.js` (1089 lines)

This is the most complex component. It manages a full Three.js scene inside a React component.

### Scene Setup

| Element | Details |
|---|---|
| Renderer | `WebGLRenderer` on a `<canvas>` element, auto-resizes with `ResizeObserver` |
| Camera | `PerspectiveCamera` at position `(0, 0.62, 4.3)`, 60° FOV |
| Lighting | Hemisphere light + directional key light + point rim light |
| Background | Dark fog gradient (`#0a0a1a`) |

### Two Avatar Modes

**Mode 1 — VRM Model (preferred)**

The app tries to load `/models/sign.vrm` using `GLTFLoader` + `VRMLoaderPlugin`. The VRM format provides a full skeletal rig (40+ named bones), blend shape expressions (happy, sad, surprised, blink, vowels), and PBR materials. All animation is applied by directly setting bone quaternion rotations.

**Mode 2 — Procedural Fallback**

If VRM loading fails, the app constructs an avatar from Three.js primitives:
- Head: scaled sphere + hair, eyes, pupils, eyebrows, mouth
- Torso: capsule geometry
- Arms: upper arm + elbow joint + forearm + hand
- Fingers: 5 articulated fingers per hand (thumb, index, middle, ring, pinky)
- Floor: circular platform

### Motion System

The `SIGN_MOTIONS` object defines 33 keywords, each with a motion name, accent color, and facial expression:

```js
HELLO: { label: "Hello", motion: "wave", color: "#22d3ee", expression: "happy" }
LEARN: { label: "Learn", motion: "tap-head", color: "#818cf8", expression: "focused" }
```

For each active word, the animation loop applies the corresponding bone rotations using sine/cosine waves for natural, fluid movement.

### Sign Clip Loading

For higher-fidelity signs, the app tries to load a pre-recorded keyframe JSON from `/signs/WORD.json`. These files contain an array of keyframes:

```json
[
  { "time": 0.0, "bones": { "leftUpperArm": [0, 0, 0.8] }, "fingers": { "left": "point" }, "expression": "neutral" },
  { "time": 0.3, "bones": { "leftUpperArm": [0, 0.2, 1.2] }, "fingers": { "left": "open" }, "expression": "happy" }
]
```

Loaded clips are cached in a `Map` so they are only fetched once per session. If no clip file exists for a word, it falls back to the procedural `SIGN_MOTIONS` definition.

### Word Progress Tracking

The avatar receives:
- `caption.words`: e.g. `["HELLO", "EVERYONE"]`
- `currentTime` (seconds, converted to ms internally)
- `caption.start` / `caption.end` (ms)

It calculates which word index is active by dividing the elapsed time within the caption by the per-word duration. A progress bar and highlighted word indicator update in real time.

---

## 7. Primary Data Flow

### Step 1 — URL Submission

```
User types YouTube URL → LandingPage.onSubmit()
    → GET /api/video/info?url=<url>
    ← { videoId, title, author, thumbnail, embedUrl }
    → Navigate to PlayerPage with videoData
```

### Step 2 — Caption Processing

```
User clicks "Process Video" → PlayerPage.processVideo()
    → GET /api/captions?videoId=xxx
    ← [ { start, end, text }, ... ]
    → POST /api/sign/batch  { captions: [...] }
        → Groq AI (batched, 10 at a time)
        ← glosses: ["HELLO EVERYONE", "TODAY LEARN NEURAL NETWORK", ...]
    ← [ { start, end, text, gloss, words: [] }, ... ]
    → setState: signedCaptions = results
```

### Step 3 — Playback Sync

```
User presses Play
    → YouTube IFrame plays video
    → Every 250ms: player.getCurrentTime() → setCurrentTime(t)
    → useEffect: find caption where start ≤ t*1000 ≤ end
    → setCurrentCaption(match)
    → SignAvatar receives caption + currentTime
        → calculates wordIndex from elapsed time
        → loads or plays motion for words[wordIndex]
        → Three.js RAF loop renders updated bones/expressions
```

---

## 8. Styling System

All global design tokens live in `frontend/src/styles/global.css` as CSS custom properties:

```css
--color-primary: #6366f1;
--color-accent-cyan: #22d3ee;
--color-accent-purple: #a78bfa;
--color-card-bg: rgba(15, 15, 30, 0.8);
--shadow-glow-cyan: 0 0 20px rgba(34, 211, 238, 0.3);
```

**Fonts:**
- `Space Mono` — headings, monospace labels
- `Nunito` — body text, rounded and readable

**Utility classes:**
- `.glass` — frosted glass panel (`backdrop-filter: blur(20px)`)
- `.glow-cyan`, `.glow-purple` — colored box-shadow glows
- `.fade-in-up` — entrance animation

**Animations defined in global.css:**
- `fadeInUp` — panel entrance slide
- `float` — gentle hover effect on hero elements
- `pulse-glow` — pulsing glow ring
- `spin-slow` — slow rotation for decorative orbs
- `wave-hand` — wrist wave used in the hero section

Each component also has its own `.css` file for layout-specific rules.

---

## 9. Deployment Configuration

### `render.yaml` — Full-Stack on Render.com

Defines two services in one blueprint file:

| Service | Type | Root Dir | Build Command | Start Command |
|---|---|---|---|---|
| `signlearn-api` | Web Service | `backend/` | `npm install` | `node server.js` |
| `signlearn-frontend` | Static Site | `frontend/` | `npm run build` | — |

The static frontend service uses a catch-all rewrite (`/* → /index.html`) to support client-side routing.

### `vercel.json` — Frontend on Vercel

```json
{
  "framework": "create-react-app",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The `REACT_APP_API_URL` environment variable is mapped to a Vercel project secret `@signlearn-api-url`.

---

## 10. Known Issues

### render.yaml has wrong API key name

`render.yaml` sets the environment variable `ANTHROPIC_API_KEY` instead of `GROQ_API_KEY`. This means the backend will start but the Groq client will not authenticate. The AI translation will silently fall back to the simple word-filter mode.

**Fix:** In the Render dashboard, add `GROQ_API_KEY` manually, or correct the variable name in `render.yaml`:

```yaml
# Change this:
- key: ANTHROPIC_API_KEY

# To this:
- key: GROQ_API_KEY
```

### Free-tier cold starts on Render

Render's free tier spins down idle services after 15 minutes of inactivity. The first API request after a cold start can take 20–30 seconds. A simple fix is to add an uptime-ping cron job (e.g. via cron-job.org) that hits the `/health` endpoint every 10 minutes.

### YouTube caption availability

Caption extraction depends on the target video having CC enabled. Auto-generated captions work but are lower quality. Videos without any captions will return an empty array.

---

*SignLearn 2025 — Built for inclusive education*
