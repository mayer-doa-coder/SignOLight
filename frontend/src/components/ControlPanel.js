import React from "react";
import "./ControlPanel.css";

const LAYOUTS = [
  { id: "side-by-side", short: "Split", label: "Side by Side" },
  { id: "picture-in-picture", short: "PiP", label: "Picture in Picture" },
  { id: "fullscreen-sign", short: "Focus", label: "Focus Sign" },
];

const SPEEDS = [
  { value: 1.0, label: "1×" },
  { value: 0.75, label: "¾×" },
  { value: 0.5, label: "½×" },
  { value: 0.25, label: "¼×" },
];

export default function ControlPanel({
  signEnabled,
  onToggleSign,
  layout,
  onLayoutChange,
  playbackSpeed = 1.0,
  onSpeedChange,
  learningMode = false,
  onToggleLearning,
  fingerspellMode = false,
  onToggleFingerspell,
  avatarLanguage = "en",
  onLanguageChange,
  banglaLoading = false,
}) {
  return (
    <div className="control-panel">
      {/* Layout switcher */}
      <div className="layout-btns" title="Change layout">
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            className={`layout-btn ${layout === l.id ? "active" : ""}`}
            onClick={() => onLayoutChange(l.id)}
            title={l.label}
          >
            {l.short}
          </button>
        ))}
      </div>

      {onLanguageChange && (
        <div className="language-btns" title="Avatar language">
          <button
            className={avatarLanguage === "en" ? "active" : ""}
            onClick={() => onLanguageChange("en")}
          >
            English
          </button>
          <button
            className={avatarLanguage === "bn" ? "active" : ""}
            onClick={() => onLanguageChange("bn")}
            disabled={banglaLoading}
          >
            {banglaLoading ? "বাংলা…" : "বাংলা"}
          </button>
        </div>
      )}

      {/* Playback speed selector — learning mode support */}
      {onSpeedChange && (
        <div className="speed-btns" title="Avatar signing speed">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              className={`speed-btn ${playbackSpeed === s.value ? "active" : ""}`}
              onClick={() => onSpeedChange(s.value)}
              title={`Sign at ${s.label} speed`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Learning mode toggle — repeat + slow sign */}
      {onToggleLearning && (
        <button
          className={`mode-toggle ${learningMode ? "on" : ""}`}
          onClick={onToggleLearning}
          title={learningMode ? "Exit learning mode" : "Learning mode: signs repeat at current speed"}
        >
          <span className="toggle-label">{learningMode ? "Learning" : "Learn"}</span>
          <span className={`toggle-dot ${learningMode ? "active" : ""}`} />
        </button>
      )}

      {/* Fingerspell toggle — spell every word letter-by-letter for verification */}
      {onToggleFingerspell && (
        <button
          className={`mode-toggle ${fingerspellMode ? "on" : ""}`}
          onClick={onToggleFingerspell}
          title={fingerspellMode ? "Exit fingerspell mode" : "Fingerspell mode: spell every word letter by letter"}
        >
          <span className="toggle-label">{fingerspellMode ? "Fingerspelling" : "Fingerspell"}</span>
          <span className={`toggle-dot ${fingerspellMode ? "active" : ""}`} />
        </button>
      )}

      {/* Sign toggle — discreet mode hides the avatar, captions always stay */}
      <button
        className={`sign-toggle ${signEnabled ? "on" : "off"}`}
        onClick={onToggleSign}
        title={signEnabled ? "Switch to caption-only (discreet) mode" : "Enable sign avatar"}
      >
        <span className="toggle-label">
          {signEnabled ? "Sign + Caption" : "Caption Only (Discreet)"}
        </span>
        <span className={`toggle-dot ${signEnabled ? "active" : ""}`} />
      </button>
    </div>
  );
}
