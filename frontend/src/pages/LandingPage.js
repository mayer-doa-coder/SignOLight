import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./LandingPage.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const SAMPLE_VIDEOS = [
  {
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
    label: "3Blue1Brown - Neural Networks",
  },
  {
    url: "https://www.youtube.com/watch?v=WUvTyaaNkzM",
    label: "3Blue1Brown - Calculus",
  },
  {
    url: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    label: "3Blue1Brown - Vectors",
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
      {/* Background */}
      <div className="landing-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-lines" />
      </div>

      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">🤟</span>
          <span className="logo-text">SignLearn</span>
        </div>
        <div className="nav-badges">
          <span className="badge badge-cyan">🎓 Education Tool</span>
          <span className="badge badge-green">● Free & Open Source</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        <div className="hero-tag">
          <span>✦</span> Accessible Education for Deaf and Hard-of-Hearing Students
        </div>

        <h1 className="hero-title">
          <span className="hero-title-line">Never Miss</span>
          <span className="hero-title-line accent">What Was Said.</span>
        </h1>

        <p className="hero-subtitle">
          Accurate captions → simplified language → synchronized BdSL signs.
          Paste any YouTube lecture and follow every concept — built for
          deaf and hard-of-hearing students in Bangladesh.
        </p>

        <div className="hero-value-chain">
          <span className="value-step">Accurate Captions</span>
          <span className="value-arrow">→</span>
          <span className="value-step">Simplified Language</span>
          <span className="value-arrow">→</span>
          <span className="value-step accent">BdSL Signs</span>
        </div>

        {/* URL Input */}
        <div className="hero-input-wrapper">
          <div className="input-container">
            <span className="input-icon">▶</span>
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
          </div>

          <button
            className="hero-btn"
            onClick={() => handleSubmit()}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                Loading...
              </>
            ) : (
              <>Start Learning ›</>
            )}
          </button>
        </div>

        <button className="demo-link-btn" onClick={onOpenSignDemo}>
          Open accurate sign demo
        </button>

        {error && (
          <div className="error-msg">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Sample videos */}
        <div className="samples">
          <p className="samples-label">Try a sample video →</p>
          <div className="samples-grid">
            {SAMPLE_VIDEOS.map((v, i) => (
              <button
                key={i}
                className="sample-card"
                onClick={() => {
                  setUrl(v.url);
                  handleSubmit(v.url);
                }}
                disabled={loading}
              >
                <span className="sample-play">▶</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="features">
        {[
          {
            icon: "📝",
            title: "Accurate Captions First",
            desc: "Multi-source caption extraction with 4 fallback methods — even if signs are unavailable, captions always work",
          },
          {
            icon: "🤖",
            title: "BdSL Gloss Translation",
            desc: "Groq AI converts captions to BdSL gloss with topic-comment SOV grammar — based on Bangla-SGP research",
          },
          {
            icon: "⚡",
            title: "Timeline-Locked Sync",
            desc: "Binary search keeps avatar aligned with video — pause, seek, and resume all handled correctly",
          },
          {
            icon: "🙌",
            title: "Honest Fallbacks",
            desc: "For words without established BdSL signs, a concept card explains the term — no misleading gestures",
          },
        ].map((f, i) => (
          <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="feature-icon">{f.icon}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="landing-footer">
        <p>Built with ❤️ for inclusive education · SignLearn 2025</p>
        <p className="landing-disclaimer">
          Educational prototype. Sign representations are not validated by the BdSL Deaf community.
          Comprehension score range for synthetic avatars: 2.5–3.5/5 (Quandt et al. 2022).
        </p>
      </footer>
    </div>
  );
}
