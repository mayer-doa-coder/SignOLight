import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import GalaxyBackground from "../components/GalaxyBackground";
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
      <GalaxyBackground />

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
