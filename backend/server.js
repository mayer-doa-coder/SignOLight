const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const rootEnvPath = path.resolve(__dirname, "../.env");
const DEMO_VIDEO_ID = "aircAruvnKk"; // 3Blue1Brown - Neural Networks
const DEMO_MIN_CACHE_SEGMENTS = 50;

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: path.resolve(__dirname, ".env") });

if (!process.env.GROQ_API_KEY) {
  try {
    const rawEnv = fs.readFileSync(rootEnvPath, "utf8").trim();
    if (/^gsk_[A-Za-z0-9_-]+$/.test(rawEnv)) {
      process.env.GROQ_API_KEY = rawEnv;
    }
  } catch {
    // Root .env is optional. The translator will fall back if no key is set.
  }
}

const captionRoutes = require("./routes/captions");
const signRoutes = require("./routes/sign");
const videoRoutes = require("./routes/video");

const app = express();
const PORT = process.env.PORT || 5000;
app.set("trust proxy", 1);

// ── Persistent file cache ────────────────────────────────────────────────────
// Two-layer cache: hot (Map) + cold (JSON files in backend/cache/).
// File cache survives server restarts — the demo lecture pre-fetch is skipped
// on warm restarts because the file already exists.

const CACHE_DIR = process.env.SIGNOLIGHT_CACHE_DIR || path.resolve(__dirname, "cache");
try {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
} catch {
  // Ignore — directory may already exist or be read-only in some CI envs.
}

function normalizeCachePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return null;
}

function isUsableCache(videoId, results) {
  if (!Array.isArray(results) || results.length === 0) return false;
  if (videoId === DEMO_VIDEO_ID && results.length < DEMO_MIN_CACHE_SEGMENTS) return false;
  return results.every((item) =>
    item &&
    typeof item.start === "number" &&
    typeof item.end === "number" &&
    typeof item.text === "string"
  );
}

function cacheFilePath(videoId) {
  // Sanitize videoId to safe filename — only alphanumeric, dash, underscore.
  const safe = String(videoId).replace(/[^A-Za-z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

function readFileCache(videoId) {
  try {
    const raw = fs.readFileSync(cacheFilePath(videoId), "utf8");
    const parsed = JSON.parse(raw);
    const results = normalizeCachePayload(parsed);
    return isUsableCache(videoId, results) ? results : null;
  } catch {
    return null;
  }
}

function writeFileCache(videoId, data) {
  try {
    const targetPath = cacheFilePath(videoId);
    const tempPath = `${targetPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data), "utf8");
    fs.renameSync(tempPath, targetPath);
  } catch (err) {
    console.warn(`[cache] Could not write file cache for ${videoId}: ${err.message}`);
  }
}

const videoCache = new Map(); // hot layer
app.locals.videoCache = videoCache;
app.locals.writeFileCache = writeFileCache;
// ─────────────────────────────────────────────────────────────────────────────

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Routes
app.use("/api/captions", captionRoutes);
app.use("/api/sign", signRoutes);
app.use("/api/video", videoRoutes);

// ── NLP service proxy (Phase B) ──────────────────────────────────────────────
// Proxies /api/nlp/* to the Python FastAPI microservice when NLP_SERVICE_URL is set.
// Falls back gracefully (503) when the service is unavailable — Phase A Groq gloss
// continues to work without it.
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || "";
app.use("/api/nlp", async (req, res) => {
  if (!NLP_SERVICE_URL) {
    return res.status(503).json({
      error: "NLP service not configured. Set NLP_SERVICE_URL to enable Phase B glossing.",
    });
  }
  try {
    const target = `${NLP_SERVICE_URL}${req.path}`;
    const response = await axios({
      method: req.method,
      url: target,
      data: req.body,
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data?.detail || "NLP service error" });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Vocabulary gap tracker (Phase C) ────────────────────────────────────────
// Tracks which words consistently fall through to concept card.
// Persisted to CACHE_DIR/vocabulary_gaps.json (gitignored).
// GET /api/admin/gaps returns ranked list for next dictionary expansion sprint.

const GAPS_FILE = path.join(CACHE_DIR, "vocabulary_gaps.json");
const gapCounts = new Map(); // word → hit count (hot layer)

function loadGapsFromDisk() {
  try {
    const raw = fs.readFileSync(GAPS_FILE, "utf8");
    const obj = JSON.parse(raw);
    for (const [word, count] of Object.entries(obj)) {
      gapCounts.set(word, Number(count) || 0);
    }
  } catch {
    // First run — no file yet.
  }
}

function saveGapsToDisk() {
  try {
    const obj = {};
    for (const [word, count] of gapCounts.entries()) obj[word] = count;
    fs.writeFileSync(GAPS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch {
    // Non-fatal.
  }
}

// Called by sign.js batch handler after gloss results are ready.
function recordVocabularyGaps(results) {
  let dirty = false;
  for (const result of results) {
    for (const word of (result.words || [])) {
      const s = String(word || "").trim().toUpperCase();
      if (!s.startsWith("[")) continue; // only bracket-tagged unknowns
      const conceptMatch = s.match(/^\[CONCEPT:(.+)\]$/);
      if (!conceptMatch) continue;
      const cw = conceptMatch[1].replace(/[^A-Za-z\s]/g, "").toUpperCase().trim();
      if (!cw) continue;
      gapCounts.set(cw, (gapCounts.get(cw) || 0) + 1);
      dirty = true;
    }
  }
  if (dirty) saveGapsToDisk();
}

// Expose via app.locals so sign.js can call it without circular require.
loadGapsFromDisk();
app.locals.recordVocabularyGaps = recordVocabularyGaps;

app.get("/api/admin/gaps", (_req, res) => {
  const sorted = [...gapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));
  res.json({ total: sorted.length, gaps: sorted });
});
// ─────────────────────────────────────────────────────────────────────────────

// Cache lookup endpoint — checked by PlayerPage before live API calls.
// Checks hot (Map) layer first; falls through to file layer on miss.
// Promotes file-cache hits back into the hot layer to avoid repeated disk reads.
app.get("/api/cache/:videoId", (req, res) => {
  const { videoId } = req.params;

  const hot = videoCache.get(videoId);
  if (hot) return res.json({ results: hot });

  const cold = readFileCache(videoId);
  if (cold) {
    videoCache.set(videoId, cold); // promote to hot layer
    return res.json({ results: cold });
  }

  return res.status(404).json({ error: "Not cached" });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Pre-warm the demo lecture cache 3 seconds after startup.
// Best-effort: failures are logged and ignored.
const SHOULD_PREFETCH_DEMO = /^true$/i.test(process.env.SIGNOLIGHT_PREFETCH_DEMO || "");

function warmDemoFromFileCache() {
  const existing = readFileCache(DEMO_VIDEO_ID);
  if (!existing || existing.length === 0) return false;
  videoCache.set(DEMO_VIDEO_ID, existing);
  console.log(`[cache] Demo lecture loaded from file cache (${existing.length} segments).`);
  return true;
}

async function prefetchDemoLecture() {
  // Skip if file cache already has the demo — avoids redundant API calls on restart.
  if (warmDemoFromFileCache()) {
    return;
  }

  try {
    const base = `http://localhost:${PORT}`;
    console.log(`[cache] Pre-fetching demo lecture ${DEMO_VIDEO_ID}...`);

    const captionRes = await axios.get(`${base}/api/captions`, {
      params: { videoId: DEMO_VIDEO_ID },
      timeout: 30000,
    });
    const rawCaptions = captionRes.data.captions || [];
    if (!rawCaptions.length) {
      console.log("[cache] Demo pre-fetch: no captions found.");
      return;
    }

    const signRes = await axios.post(
      `${base}/api/sign/batch`,
      { captions: rawCaptions },
      { timeout: 90000 }
    );
    const results = signRes.data.results || [];
    videoCache.set(DEMO_VIDEO_ID, results);
    writeFileCache(DEMO_VIDEO_ID, results); // persist for next restart
    console.log(`[cache] Demo pre-fetch complete: ${results.length} segments cached to file.`);
  } catch (err) {
    console.log(`[cache] Demo pre-fetch skipped: ${err.message}`);
  }
}

// Only start the HTTP server when this file is the entry point.
// When imported by tests, app is exported without binding a port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SignLearn backend running on http://localhost:${PORT}`);
    if (!warmDemoFromFileCache() && SHOULD_PREFETCH_DEMO) {
      setTimeout(prefetchDemoLecture, 3000);
    }
  });
}

module.exports = app;
