import React from "react";
import "./ControlPanel.css";

const LAYOUTS = [
  { id: "side-by-side", icon: "⬛⬛", label: "Side by Side" },
  { id: "picture-in-picture", icon: "⬛◻", label: "Picture in Picture" },
  { id: "fullscreen-sign", icon: "◻⬛", label: "Focus Sign" },
];

export default function ControlPanel({ signEnabled, onToggleSign, layout, onLayoutChange }) {
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
            {l.icon}
          </button>
        ))}
      </div>

      {/* Sign toggle */}
      <button
        className={`sign-toggle ${signEnabled ? "on" : "off"}`}
        onClick={onToggleSign}
        title={signEnabled ? "Disable sign avatar" : "Enable sign avatar"}
      >
        <span className="toggle-icon">🤟</span>
        <span className="toggle-label">{signEnabled ? "Sign ON" : "Sign OFF"}</span>
        <span className={`toggle-dot ${signEnabled ? "active" : ""}`} />
      </button>
    </div>
  );
}
