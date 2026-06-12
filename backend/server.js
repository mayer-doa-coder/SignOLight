const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const rootEnvPath = path.resolve(__dirname, "../.env");

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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`SignLearn backend running on http://localhost:${PORT}`);
});
