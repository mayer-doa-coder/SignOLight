import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import SignAvatar from "../components/SignAvatar";
import CaptionBar from "../components/CaptionBar";
import YouTubePlayer from "../components/YouTubePlayer";
import ControlPanel from "../components/ControlPanel";
import { findCaption, computeNMM } from "../utils/sync";
import { computeDictionaryCoverage } from "../utils/notation";
import "./PlayerPage.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// YT.PlayerState constants
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_BUFFERING = 3;

const NEUTRAL_NMM = { type: "neutral", wordIndex: -1, headY: 0 };

export default function PlayerPage({ videoData, onBack }) {
  const [captions, setCaptions] = useState([]);
  const [signedCaptions, setSignedCaptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState(null);
  const [playerState, setPlayerState] = useState("idle");
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [captionSource, setCaptionSource] = useState("");
  const [signEnabled, setSignEnabled] = useState(true);
  const [layout, setLayout] = useState("side-by-side");
  const [captionError, setCaptionError] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [learningMode, setLearningMode] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugDriftMs, setDebugDriftMs] = useState(null);
  // seekingRef distinguishes intentional seeks from network-stall buffering
  const seekingRef = useRef(false);
  const playerRef = useRef(null);
  // Drift telemetry: tracks caption sync deviation to verify the ≤2s success metric.
  const driftRef = useRef({ lastUpdateMs: 0, maxDrift: 0 });

  useEffect(() => {
    setCaptions([]);
    setSignedCaptions([]);
    setCurrentCaption(null);
    setCaptionError("");
    setCaptionSource("");
    setProcessed(false);
    setLoadingCaptions(false);
    setPlayerState("idle");
  }, [videoData.videoId]);

  // Timeline-locked caption sync: binary search on every currentTime update.
  useEffect(() => {
    // Freeze avatar when paused.
    if (playerState === "paused") return;

    const currentTimeMs = currentTime * 1000;
    const found = findCaption(signedCaptions, currentTimeMs);

    // Drift telemetry: measure how far the current video time is from the caption midpoint.
    // Verifies the ≤2s success metric. Only measures when a caption is active.
    if (found && playerState === "playing") {
      const captionMidMs = (found.start + found.end) / 2;
      const drift = Math.abs(currentTimeMs - captionMidMs);
      driftRef.current.maxDrift = Math.max(driftRef.current.maxDrift, drift);
      const nowMs = Date.now();
      if (nowMs - driftRef.current.lastUpdateMs > 2000) {
        setDebugDriftMs(Math.round(drift));
        driftRef.current.lastUpdateMs = nowMs;
      }
    }

    if (playerState === "seeking") {
      setCurrentCaption(found);
      setPlayerState("playing");
      return;
    }

    setCurrentCaption(found);
  }, [currentTime, signedCaptions, playerState]);

  // Handle YouTube player state changes.
  // YT_BUFFERING fires on both intentional seeks and network stalls.
  // seekingRef distinguishes them so network stalls don't snap the avatar.
  const handlePlayerStateChange = useCallback((state) => {
    if (state === YT_PLAYING) {
      seekingRef.current = false;
      setPlayerState("playing");
    } else if (state === YT_PAUSED) {
      setPlayerState("paused");
    } else if (state === YT_BUFFERING) {
      if (seekingRef.current) setPlayerState("seeking");
      // else: network stall — keep current playerState
    }
  }, []);

  const processVideo = async () => {
    setLoadingCaptions(true);
    setCaptionError("");
    setProcessed(false);
    setCaptions([]);
    setSignedCaptions([]);

    try {
      // Check server-side cache first (pre-processed demo lecture).
      try {
        const cached = await axios.get(`${API}/api/cache/${videoData.videoId}`);
        if (cached.data?.results?.length) {
          setSignedCaptions(cached.data.results);
          setCaptions(cached.data.results);
          setCaptionSource("pre-processed cache");
          setProcessed(true);
          return;
        }
      } catch {
        // Cache miss — proceed with live processing.
      }

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
        videoId: videoData.videoId,
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

  // Seek: mark intentional seek so BUFFERING event triggers snap.
  const handleSeek = useCallback((time) => {
    playerRef.current?.seekTo(time);
    seekingRef.current = true;
    setPlayerState("seeking");
  }, []);

  const handleSpeedChange = useCallback((speed) => {
    setPlaybackSpeed(speed);
    playerRef.current?.setPlaybackRate?.(speed);
  }, []);

  // Structured NMM — type + word-onset index + headY for head-shake.
  const sentenceNMM = useMemo(
    () => computeNMM(currentCaption?.gloss, currentCaption?.text) ?? NEUTRAL_NMM,
    [currentCaption]
  );

  // Dictionary coverage — computed once per processed batch.
  const coverage = useMemo(
    () => (signedCaptions.length ? computeDictionaryCoverage(signedCaptions) : null),
    [signedCaptions]
  );

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
          onToggleSign={() => setSignEnabled((v) => !v)}
          layout={layout}
          onLayoutChange={setLayout}
          playbackSpeed={playbackSpeed}
          onSpeedChange={handleSpeedChange}
          learningMode={learningMode}
          onToggleLearning={() => setLearningMode((v) => !v)}
          showDebug={showDebug}
          onToggleDebug={() => setShowDebug((v) => !v)}
        />
      </header>

      {loadingCaptions && (
        <div className="status-bar loading">
          <span className="status-spinner" />
          Processing captions, simplifying text, and generating ASL gloss...
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
            {signedCaptions.length} segments translated to ASL
            {captionSource ? ` — ${captionSource}` : ""}
            {coverage ? ` — dictionary covers ${coverage.percentage}% of gloss words` : ""}
            {signEnabled ? " — sign avatar active" : " — discreet mode"}
          </span>
        </div>
      )}

      {showDebug && signedCaptions.length > 0 && (
        <div className="status-bar debug-panel">
          <span>
            Sync drift:{" "}
            {debugDriftMs !== null ? (
              <strong style={{ color: debugDriftMs > 2000 ? "#ef4444" : "#10b981" }}>
                {debugDriftMs}ms
              </strong>
            ) : (
              "measuring…"
            )}
            {" "}— max: {Math.round(driftRef.current.maxDrift)}ms — target ≤2000ms
            {" "}— speed: {playbackSpeed}×
            {" "}— words: {(signedCaptions.flatMap((c) => c.words || []).length)} total
          </span>
        </div>
      )}

      <main className={`player-main layout-${layout}`}>
        <div className="video-panel">
          <YouTubePlayer
            ref={playerRef}
            videoId={videoData.videoId}
            onTimeUpdate={handleTimeUpdate}
            onStateChange={handlePlayerStateChange}
          />
        </div>

        {signEnabled && (
          <div className={`sign-panel ${layout === "picture-in-picture" ? "pip" : ""}`}>
            <div className="sign-panel-header">
              <span className="sign-badge">ASL Sign Interpreter</span>
              {currentCaption && <span className="live-badge">LIVE</span>}
              {learningMode && (
                <span className="learning-badge" title="Learning mode: signing at reduced speed">
                  📖 {playbackSpeed < 1 ? `${playbackSpeed}×` : "Learn"}
                </span>
              )}
              {sentenceNMM.type !== "neutral" && (
                <span
                  className="nmm-live-badge"
                  title={`NMM: ${sentenceNMM.type} (onset: word #${sentenceNMM.wordIndex})`}
                >
                  {sentenceNMM.type === "wh-question" ? "WH?" : sentenceNMM.type === "yn-question" ? "YN?" : "NEG"}
                </span>
              )}
            </div>
            <p className="player-avatar-disclaimer">
              Educational prototype · Comprehension 2.5–3.5/5 (Quandt et al. 2022) · Signs not validated by ASL community
            </p>
            <SignAvatar
              caption={currentCaption}
              isActive={!!currentCaption && signEnabled}
              currentTime={currentTime}
              sentenceNMM={sentenceNMM}
              playbackSpeed={learningMode ? playbackSpeed : 1.0}
            />
          </div>
        )}
      </main>

      <CaptionBar
        caption={currentCaption}
        allCaptions={signedCaptions}
        currentTime={currentTime}
        onSeek={handleSeek}
        sentenceNMM={sentenceNMM}
        coverage={coverage}
        showDebug={showDebug}
      />
    </div>
  );
}
