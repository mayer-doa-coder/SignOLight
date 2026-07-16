import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import SignAvatar from "../components/SignAvatar";
import MixamoSignAvatar from "../components/MixamoSignAvatar";
import CaptionBar from "../components/CaptionBar";
import YouTubePlayer from "../components/YouTubePlayer";
import ControlPanel from "../components/ControlPanel";
import { findCaption, computeNMM } from "../utils/sync";
import { shouldAvatarAnimate } from "../services/timelineScheduler";
import "./PlayerPage.css";

const API = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

// YT.PlayerState constants
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_BUFFERING = 3;

const NEUTRAL_NMM = { type: "neutral", wordIndex: -1, headY: 0 };

export default function PlayerPage({ videoData, onBack, avatarMode = "vrm" }) {
  const [signedCaptions, setSignedCaptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState(null);
  const [playerState, setPlayerState] = useState("idle");
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [signEnabled, setSignEnabled] = useState(true);
  const [layout, setLayout] = useState("side-by-side");
  const [captionError, setCaptionError] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [learningMode, setLearningMode] = useState(false);
  const [fingerspellMode, setFingerspellMode] = useState(false);
  // seekingRef distinguishes intentional seeks from network-stall buffering
  const seekingRef = useRef(false);
  const playerRef = useRef(null);

  useEffect(() => {
    setSignedCaptions([]);
    setCurrentCaption(null);
    setCaptionError("");
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
    setSignedCaptions([]);

    try {
      // Check server-side cache first (pre-processed demo lecture).
      try {
        const cached = await axios.get(`${API}/api/cache/${videoData.videoId}`);
        if (cached.data?.results?.length) {
          setSignedCaptions(cached.data.results);
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
        (!err.response
          ? "Backend API is unreachable. Start the backend server and try again."
          : "Failed to process captions. Try another video with CC enabled.");
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
  const avatarIsPlaying = shouldAvatarAnimate(playerState, currentCaption) && signEnabled;

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
          fingerspellMode={fingerspellMode}
          onToggleFingerspell={() => setFingerspellMode((v) => !v)}
        />
      </header>

      {loadingCaptions && (
        <div className="status-bar loading">
          <span className="status-spinner" />
          Processing captions and preparing sign language...
        </div>
      )}

      {!loadingCaptions && !processed && !captionError && (
        <div className="status-bar ready">
          <span>Ready to generate captions and sign language for this video.</span>
          <button className="process-btn" onClick={processVideo}>
            Process video
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
          <div className={`sign-panel ${avatarMode === "mixamo" ? "mixamo-sign-panel" : ""} ${layout === "picture-in-picture" ? "pip" : ""}`}>
            <div className="sign-panel-header">
              <span className="sign-badge">
                {avatarMode === "mixamo" ? "Mixamo Humanoid" : "VRM Avatar"}
              </span>
            </div>
            {avatarMode === "mixamo" ? (
              <MixamoSignAvatar
                caption={currentCaption}
                isActive={!!currentCaption && signEnabled}
                currentTime={currentTime}
                playbackSpeed={learningMode ? playbackSpeed : 1.0}
                isPlaying={avatarIsPlaying}
              />
            ) : (
              <SignAvatar
                caption={currentCaption}
                isActive={!!currentCaption && signEnabled}
                currentTime={currentTime}
                sentenceNMM={sentenceNMM}
                playbackSpeed={learningMode ? playbackSpeed : 1.0}
                fingerspellMode={fingerspellMode}
              />
            )}
          </div>
        )}
      </main>

      <CaptionBar
        caption={currentCaption}
        allCaptions={signedCaptions}
        currentTime={currentTime}
        onSeek={handleSeek}
      />
    </div>
  );
}
