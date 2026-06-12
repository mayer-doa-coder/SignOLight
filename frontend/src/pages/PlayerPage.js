import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import SignAvatar from "../components/SignAvatar";
import CaptionBar from "../components/CaptionBar";
import YouTubePlayer from "../components/YouTubePlayer";
import ControlPanel from "../components/ControlPanel";
import "./PlayerPage.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PlayerPage({ videoData, onBack }) {
  const [captions, setCaptions] = useState([]);
  const [signedCaptions, setSignedCaptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState(null);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [captionSource, setCaptionSource] = useState("");
  const [signEnabled, setSignEnabled] = useState(true);
  const [layout, setLayout] = useState("side-by-side");
  const [captionError, setCaptionError] = useState("");
  const playerRef = useRef(null);

  useEffect(() => {
    setCaptions([]);
    setSignedCaptions([]);
    setCurrentCaption(null);
    setCaptionError("");
    setCaptionSource("");
    setProcessed(false);
    setLoadingCaptions(false);
  }, [videoData.videoId]);

  useEffect(() => {
    const active = signedCaptions.find(
      (caption) =>
        currentTime * 1000 >= caption.start && currentTime * 1000 <= caption.end
    );
    setCurrentCaption(active || null);
  }, [currentTime, signedCaptions]);

  const processVideo = async () => {
    setLoadingCaptions(true);
    setCaptionError("");
    setProcessed(false);
    setCaptions([]);
    setSignedCaptions([]);

    try {
      const captionRes = await axios.get(`${API}/api/captions`, {
        params: { videoId: videoData.videoId },
      });

      const rawCaptions = captionRes.data.captions || [];
      setCaptions(rawCaptions);
      setCaptionSource(captionRes.data.source || captionRes.data.format || "");

      if (!rawCaptions.length) {
        setCaptionError("No captions found for this video.");
        return;
      }

      const signRes = await axios.post(`${API}/api/sign/batch`, {
        captions: rawCaptions,
      });

      setSignedCaptions(signRes.data.results || []);
      setProcessed(true);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Failed to process captions. Try another video with CC enabled.";
      setCaptionError(msg);
      console.error("Caption processing error:", err);
    } finally {
      setLoadingCaptions(false);
    }
  };

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  return (
    <div className="player-page">
      <header className="player-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div className="player-title">
          <span className="title-icon">ASL</span>
          <div>
            <h1 className="video-title">{videoData.title}</h1>
            <p className="video-author">by {videoData.author}</p>
          </div>
        </div>
        <ControlPanel
          signEnabled={signEnabled}
          onToggleSign={() => setSignEnabled((value) => !value)}
          layout={layout}
          onLayoutChange={setLayout}
        />
      </header>

      {loadingCaptions && (
        <div className="status-bar loading">
          <span className="status-spinner" />
          Processing full video captions and ASL gloss...
        </div>
      )}

      {!loadingCaptions && !processed && !captionError && (
        <div className="status-bar ready">
          <span>Ready to process captions for the sign avatar.</span>
          <button className="process-btn" onClick={processVideo}>
            Process full video
          </button>
        </div>
      )}

      {captionError && !loadingCaptions && (
        <div className="status-bar error">
          <span>{captionError}</span>
          <button className="process-btn error-retry" onClick={processVideo}>
            Try again
          </button>
        </div>
      )}

      {!loadingCaptions && signedCaptions.length > 0 && (
        <div className="status-bar success">
          <span>
            {signedCaptions.length} of {captions.length} caption segments
            translated to ASL
            {captionSource ? ` - captions from ${captionSource}` : ""}
            {signEnabled ? " - sign avatar active" : " - sign avatar paused"}
          </span>
        </div>
      )}

      <main className={`player-main layout-${layout}`}>
        <div className="video-panel">
          <YouTubePlayer
            ref={playerRef}
            videoId={videoData.videoId}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>

        {signEnabled && (
          <div className={`sign-panel ${layout === "picture-in-picture" ? "pip" : ""}`}>
            <div className="sign-panel-header">
              <span className="sign-badge">ASL Sign Interpreter</span>
              {currentCaption && <span className="live-badge">LIVE</span>}
            </div>
            <SignAvatar
              caption={currentCaption}
              isActive={!!currentCaption && signEnabled}
              currentTime={currentTime}
            />
          </div>
        )}
      </main>

      <CaptionBar
        caption={currentCaption}
        allCaptions={signedCaptions}
        currentTime={currentTime}
        onSeek={(time) => playerRef.current?.seekTo(time)}
      />
    </div>
  );
}
