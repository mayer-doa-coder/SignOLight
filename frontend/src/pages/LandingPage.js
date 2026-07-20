import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import SignalNetworkBackground from "../components/SignalNetworkBackground";
import "./LandingPage.css";

const API = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

const SAMPLE_VIDEOS = [
  {
    url: "https://www.youtube.com/watch?v=LPZh9BOjkQs",
    label: "3Blue1Brown — LLMs Explained",
  },
  {
    url: "https://www.youtube.com/watch?v=CMiPYHNNg28",
    label: "Photosynthesis — Plant Biology",
  },
  {
    url: "https://www.youtube.com/watch?v=1XSyyjcEHo0",
    label: "Professor Dave — Newton's First Law",
  },
  {
    url: "https://www.youtube.com/watch?v=B6mi1-YoRT4",
    label: "Physics — What Is Force?",
  },
  {
    url: "https://www.youtube.com/watch?v=zlLpKzPz84Q",
    label: "Physics — Force & Pressure",
  },
];

export default function LandingPage({
  onVideoSubmit,
  onOpenSignDemo,
  onOpenMixamoDemo,
  onOpenMixamoYouTube,
  onOpenVrmHome,
  onOpenHowItWorks,
  avatarMode = "vrm",
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (videoUrl) => {
    const submitUrl = (videoUrl || url).trim();
    if (!submitUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API}/api/video/info`, {
        params: { url: submitUrl },
        timeout: 15000,
      });
      onVideoSubmit({ ...res.data, originalUrl: submitUrl }, avatarMode);
    } catch (err) {
      const apiError =
        typeof err.response?.data?.error === "string"
          ? err.response.data.error
          : "";
      const serviceUnavailable =
        !err.response ||
        err.code === "ECONNABORTED" ||
        err.response?.status >= 500 ||
        typeof err.response?.data === "string";

      setError(
        apiError ||
          (serviceUnavailable
            ? "Video service is unavailable. Start the backend server and try again."
            : "Could not load this YouTube video. Check that it is public and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`landing landing-${avatarMode}`}>
      <SignalNetworkBackground />

      <nav className="landing-nav">
        <span className="nav-logo">SignOLight</span>
        <div className="nav-actions">
          <button className="nav-link" onClick={onOpenHowItWorks}>
            How it works
          </button>
          {avatarMode === "mixamo" ? (
            <button className="nav-link" onClick={onOpenVrmHome}>
              Standard VRM
            </button>
          ) : (
            <button className="nav-link" onClick={onOpenSignDemo}>
              VRM Demo
            </button>
          )}
          <button className="nav-link nav-link-accent" onClick={onOpenMixamoYouTube}>
            Mixamo YouTube
          </button>
          <button className="nav-link" onClick={onOpenMixamoDemo}>
            Finger Lab
          </button>
        </div>
      </nav>

      <main className="landing-hero">
        <p className="hero-eyebrow">
          {avatarMode === "mixamo"
            ? "FBX humanoid conversion workspace"
            : "For Deaf and hard-of-hearing students"}
        </p>

        <h1 className="hero-title">
          {avatarMode === "mixamo" ? "Mixamo YouTube Converter" : "SignOLight"}
        </h1>

        <p className="hero-subtitle" hidden={avatarMode === "mixamo"}>
          Paste a YouTube lecture and get accurate captions, simplified
          language and synchronized ASL signing — all in one place.
        </p>

        {avatarMode === "mixamo" && (
          <p className="hero-subtitle">
            Process a captioned YouTube lecture with the articulated Ch09 FBX
            humanoid and independent finger joints.
          </p>
        )}

        <div className="avatar-mode-switch" aria-label="Avatar engine">
          <button
            className={avatarMode === "vrm" ? "active" : ""}
            onClick={onOpenVrmHome}
          >
            VRM avatar
          </button>
          <button
            className={avatarMode === "mixamo" ? "active" : ""}
            onClick={onOpenMixamoYouTube}
          >
            Mixamo humanoid
          </button>
        </div>

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
              avatarMode === "mixamo" ? "Start with Mixamo" : "Start Learning"
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
