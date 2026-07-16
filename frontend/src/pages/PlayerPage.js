import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import SignAvatar from "../components/SignAvatar";
import MixamoSignAvatar from "../components/MixamoSignAvatar";
import CaptionBar from "../components/CaptionBar";
import YouTubePlayer from "../components/YouTubePlayer";
import ControlPanel from "../components/ControlPanel";
import { findCaption, computeNMM } from "../utils/sync";
import { shouldAvatarAnimate } from "../services/timelineScheduler";
import {
  attachSpokenTimings,
  recommendedPlaybackRate,
} from "../services/playbackPacing";
import { buildBanglaCaptions } from "../services/banglaCaptions";
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
  const [avatarLanguage, setAvatarLanguage] = useState("en");
  const [banglaCaptions, setBanglaCaptions] = useState([]);
  const [banglaLoading, setBanglaLoading] = useState(false);
  const [banglaError, setBanglaError] = useState("");
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
    setAvatarLanguage("en");
    setBanglaCaptions([]);
    setBanglaLoading(false);
    setBanglaError("");
  }, [videoData.videoId]);

  const activeCaptions =
    avatarLanguage === "bn" && banglaCaptions.length
      ? banglaCaptions
      : signedCaptions;

  // Timeline-locked caption sync: binary search on every currentTime update.
  useEffect(() => {
    // Freeze avatar when paused.
    if (playerState === "paused") return;

    const currentTimeMs = currentTime * 1000;
    const found = findCaption(activeCaptions, currentTimeMs);

    if (playerState === "seeking") {
      setCurrentCaption(found);
      setPlayerState("playing");
      return;
    }

    setCurrentCaption(found);
  }, [currentTime, activeCaptions, playerState]);

  const applyReadablePacing = useCallback((captions) => {
    const rate = recommendedPlaybackRate(captions);
    setPlaybackSpeed(rate);
    setLearningMode(rate < 1);
    playerRef.current?.setPlaybackRate?.(rate);
    return rate;
  }, []);

  const enrichCachedTimings = useCallback(async (captions, videoId) => {
    try {
      const response = await axios.post(
        `${API}/api/sign/timestamps`,
        { videoId },
        { timeout: 190000 }
      );
      if (!response.data?.words?.length) return;
      setSignedCaptions((current) =>
        attachSpokenTimings(current.length ? current : captions, response.data.words)
      );
    } catch {
      // WhisperX is optional; cached caption boundaries remain the fallback.
    }
  }, []);

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
          const results = cached.data.results;
          setSignedCaptions(results);
          applyReadablePacing(results);
          setProcessed(true);
          enrichCachedTimings(results, videoData.videoId);
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

      const results = signRes.data.results || [];
      setSignedCaptions(results);
      applyReadablePacing(results);
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

  const handleToggleLearning = useCallback(() => {
    if (learningMode) {
      setLearningMode(false);
      handleSpeedChange(1);
      return;
    }
    setLearningMode(true);
    handleSpeedChange(recommendedPlaybackRate(activeCaptions));
  }, [activeCaptions, handleSpeedChange, learningMode]);

  const handleLanguageChange = useCallback(async (language) => {
    if (language === "en") {
      setAvatarLanguage("en");
      setBanglaError("");
      applyReadablePacing(signedCaptions);
      return;
    }

    if (!processed) {
      setBanglaError("Process the video before enabling Bangla.");
      return;
    }

    if (banglaCaptions.length) {
      setAvatarLanguage("bn");
      setBanglaError("");
      applyReadablePacing(banglaCaptions);
      return;
    }

    setBanglaLoading(true);
    setBanglaError("");
    try {
      const response = await axios.get(`${API}/api/captions`, {
        params: { videoId: videoData.videoId, lang: "bn" },
        timeout: 120000,
      });
      const translated = buildBanglaCaptions(
        response.data?.captions || [],
        signedCaptions
      );
      if (!translated.length) {
        throw new Error("No Bangla translation was returned.");
      }
      setBanglaCaptions(translated);
      setAvatarLanguage("bn");
      applyReadablePacing(translated);
    } catch (error) {
      setBanglaError(
        error.response?.data?.error ||
          error.message ||
          "Could not prepare the Bangla translation."
      );
    } finally {
      setBanglaLoading(false);
    }
  }, [
    applyReadablePacing,
    banglaCaptions,
    processed,
    signedCaptions,
    videoData.videoId,
  ]);

  // Structured NMM — type + word-onset index + headY for head-shake.
  const sentenceNMM = useMemo(
    () => computeNMM(currentCaption?.gloss, currentCaption?.text) ?? NEUTRAL_NMM,
    [currentCaption]
  );
  const avatarIsPlaying = shouldAvatarAnimate(playerState, currentCaption) && signEnabled;
  const effectiveAvatarMode = avatarLanguage === "bn" ? "mixamo" : avatarMode;

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
          onToggleLearning={handleToggleLearning}
          fingerspellMode={fingerspellMode}
          onToggleFingerspell={() => setFingerspellMode((v) => !v)}
          avatarLanguage={avatarLanguage}
          onLanguageChange={handleLanguageChange}
          banglaLoading={banglaLoading}
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

      {banglaLoading && (
        <div className="status-bar loading">
          <span className="status-spinner" />
          Preparing Bangla translation and alphabet signing...
        </div>
      )}

      {banglaError && !banglaLoading && (
        <div className="status-bar error">
          <span>{banglaError}</span>
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
          <div className={`sign-panel ${effectiveAvatarMode === "mixamo" ? "mixamo-sign-panel" : ""} ${layout === "picture-in-picture" ? "pip" : ""}`}>
            <div className="sign-panel-header">
              <span className="sign-badge">
                {avatarLanguage === "bn"
                  ? "Bangla alphabet avatar"
                  : effectiveAvatarMode === "mixamo"
                    ? "Mixamo Humanoid"
                    : "VRM Avatar"}
              </span>
            </div>
            {effectiveAvatarMode === "mixamo" ? (
              <MixamoSignAvatar
                caption={currentCaption}
                isActive={!!currentCaption && signEnabled}
                currentTime={currentTime}
                playbackSpeed={1.0}
                isPlaying={avatarIsPlaying}
              />
            ) : (
              <SignAvatar
                caption={currentCaption}
                isActive={!!currentCaption && signEnabled}
                currentTime={currentTime}
                sentenceNMM={sentenceNMM}
                playbackSpeed={1.0}
                fingerspellMode={fingerspellMode}
              />
            )}
          </div>
        )}
      </main>

      <CaptionBar
        caption={currentCaption}
        allCaptions={activeCaptions}
        currentTime={currentTime}
        onSeek={handleSeek}
      />
    </div>
  );
}
