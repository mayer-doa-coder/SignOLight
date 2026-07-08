const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

// Extract YouTube video ID from various URL formats
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
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

    // Use YouTube oEmbed API (no key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return res.status(404).json({ error: "Video not found or is private" });
    }

    const data = await response.json();

    res.json({
      videoId,
      title: data.title,
      author: data.author_name,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&cc_load_policy=1&cc_lang_pref=en`,
    });
  } catch (err) {
    console.error("Video info error:", err);
    res.status(500).json({ error: "Failed to fetch video info" });
  }
});

module.exports = router;
