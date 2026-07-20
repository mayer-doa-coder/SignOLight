const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// Extract YouTube video ID from various URL formats
function extractVideoId(input) {
  const value = String(input || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const queryId = parsed.searchParams.get("v");
      if (/^[A-Za-z0-9_-]{11}$/.test(queryId || "")) return queryId;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(parts[0])) {
        return /^[A-Za-z0-9_-]{11}$/.test(parts[1] || "") ? parts[1] : null;
      }
    }
  } catch {
    // Invalid URL syntax.
  }

  return null;
}

// GET /api/video/info?url=...
router.get("/info", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    // Use YouTube oEmbed when available, but do not reject a valid video ID
    // when metadata is blocked, embedding is restricted, or YouTube is slow.
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    let title = "YouTube video";
    let author = "YouTube";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        title = data.title || title;
        author = data.author_name || author;
      } else {
        console.warn(`[video] oEmbed returned ${response.status} for ${videoId}; using fallback metadata.`);
      }
    } catch (error) {
      console.warn(`[video] oEmbed unavailable for ${videoId}: ${error.message}`);
    }

    res.json({
      videoId,
      title,
      author,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&cc_load_policy=1&cc_lang_pref=en`,
    });
  } catch (err) {
    console.error("Video info error:", err);
    res.status(500).json({ error: "Failed to fetch video info" });
  }
});

module.exports = router;
module.exports.extractVideoId = extractVideoId;
