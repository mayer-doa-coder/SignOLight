import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./LandingPage.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SAMPLE_VIDEOS = [
  {
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
    label: "3Blue1Brown — Neural Networks",
  },
  {
    url: "https://www.youtube.com/watch?v=WUvTyaaNkzM",
    label: "3Blue1Brown — Calculus",
  },
  {
    url: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    label: "3Blue1Brown — Vectors",
  },
];

// Simple hand silhouettes built from primitives (palm + 4 fingers + thumb), each finger
// given a rotation + length so the same shape function produces recognizable ASL-adjacent
// handshapes: open-5, index-1, V/peace-2, closed fist, and "I love you" (ILY).
const HAND_SHAPES = {
  open: { thumb: [-34, 1], index: [-9, 1], middle: [0, 1.06], ring: [9, 1], pinky: [19, 0.86] },
  point: { thumb: [-28, 0.4], index: [-4, 1.05], middle: [5, 0.32], ring: [11, 0.28], pinky: [17, 0.26] },
  peace: { thumb: [-28, 0.4], index: [-11, 1], middle: [6, 1], ring: [11, 0.28], pinky: [17, 0.26] },
  fist: { thumb: [-20, 0.34], index: [-6, 0.28], middle: [2, 0.28], ring: [8, 0.28], pinky: [14, 0.26] },
  loveyou: { thumb: [-36, 0.9], index: [-8, 1], middle: [2, 0.28], ring: [8, 0.28], pinky: [19, 0.9] },
};

function HandGlyph({ shape, className, style }) {
  const f = HAND_SHAPES[shape] || HAND_SHAPES.open;
  const fingers = [
    { key: "index", x: 38 },
    { key: "middle", x: 48 },
    { key: "ring", x: 58 },
    { key: "pinky", x: 68 },
  ];
  const [thumbRot, thumbLen] = f.thumb;
  return (
    <svg viewBox="0 0 100 120" className={className} style={style} fill="currentColor" aria-hidden="true">
      <rect x="28" y="55" width="48" height="48" rx="18" />
      {fingers.map(({ key, x }) => {
        const [rot, len] = f[key];
        return (
          <rect
            key={key}
            x={x - 5}
            y={55 - 34 * len}
            width="10"
            height={34 * len}
            rx="5"
            transform={`rotate(${rot} ${x} 55)`}
          />
        );
      })}
      <rect
        x="14"
        y={72 - 28 * thumbLen}
        width="10"
        height={28 * thumbLen}
        rx="5"
        transform={`rotate(${thumbRot} 19 72)`}
      />
    </svg>
  );
}

// Scattered, slowly-drifting background field — purely decorative, kept low-opacity so it
// reads as texture rather than competing with the foreground content.
const BG_HANDS = [
  { shape: "open", top: "6%", left: "5%", size: 100, delay: "0s", dur: "15s", rot: -14 },
  { shape: "point", top: "14%", left: "84%", size: 76, delay: "2s", dur: "17s", rot: 12 },
  { shape: "peace", top: "58%", left: "3%", size: 84, delay: "4s", dur: "19s", rot: 8 },
  { shape: "fist", top: "72%", left: "89%", size: 64, delay: "1s", dur: "16s", rot: -10 },
  { shape: "loveyou", top: "36%", left: "93%", size: 80, delay: "3s", dur: "18s", rot: 16 },
  { shape: "open", top: "84%", left: "48%", size: 58, delay: "5s", dur: "14s", rot: -22 },
  { shape: "point", top: "4%", left: "44%", size: 54, delay: "6s", dur: "20s", rot: 20 },
  { shape: "peace", top: "28%", left: "18%", size: 48, delay: "2.5s", dur: "21s", rot: -12 },
  { shape: "fist", top: "48%", left: "62%", size: 46, delay: "4.5s", dur: "16.5s", rot: 6 },
];

function HandBackground() {
  return (
    <div className="hand-field" aria-hidden="true">
      {BG_HANDS.map((h, i) => (
        <HandGlyph
          key={i}
          shape={h.shape}
          className="hand-glyph"
          style={{
            top: h.top,
            left: h.left,
            width: h.size,
            height: h.size * 1.2,
            "--rot": `${h.rot}deg`,
            animationDelay: h.delay,
            animationDuration: h.dur,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage({ onVideoSubmit, onOpenSignDemo }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (videoUrl) => {
    const submitUrl = videoUrl || url;
    if (!submitUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API}/api/video/info`, {
        params: { url: submitUrl },
      });
      onVideoSubmit({ ...res.data, originalUrl: submitUrl });
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not load video. Check the URL and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <HandBackground />

      <nav className="landing-nav">
        <span className="nav-logo">SignOLight</span>
        <button className="nav-link" onClick={onOpenSignDemo}>
          Sign Demo
        </button>
      </nav>

      <main className="landing-hero">
        <p className="hero-eyebrow">For Deaf and hard-of-hearing students</p>

        <h1 className="hero-title">SignOLight</h1>

        <p className="hero-subtitle">
          Paste a YouTube lecture and get accurate captions, simplified
          language and synchronized ASL signing — all in one place.
        </p>

        <div className="hero-input-wrapper">
          <input
            ref={inputRef}
            type="url"
            className="hero-input"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          <button
            className="hero-btn"
            onClick={() => handleSubmit()}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Loading
              </>
            ) : (
              "Start Learning"
            )}
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="samples">
          <p className="samples-label">Try a sample video</p>
          <div className="samples-grid">
            {SAMPLE_VIDEOS.map((v) => (
              <button
                key={v.url}
                className="sample-card"
                onClick={() => {
                  setUrl(v.url);
                  handleSubmit(v.url);
                }}
                disabled={loading}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      
    </div>
  );
}
