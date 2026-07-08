import React, { useRef, useEffect } from "react";
import "./CaptionBar.css";

export default function CaptionBar({ caption, allCaptions, currentTime, onSeek }) {
  const activeRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, [caption]);

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const hasSimplified = caption?.simplified && caption.simplified !== caption?.text;

  return (
    <div className="caption-bar">
      {/* Current caption display */}
      <div className="caption-current">
        <span className="caption-label">CC</span>

        <div className="caption-text-block">
          {/* Original text */}
          <p className="caption-text">{caption?.text || "[ No caption at this time ]"}</p>

          {/* Simplified text — educational scaffolding layer */}
          {hasSimplified && (
            <p className="caption-simplified" title="Simplified for readability">
              <span className="simplified-tag">→</span>
              {caption.simplified}
            </p>
          )}
        </div>
      </div>

      {/* Caption timeline scroll */}
      <div className="caption-scroll" ref={scrollRef}>
        {allCaptions.map((cap, i) => {
          const isActive = caption && cap.start === caption.start;
          const isPast = cap.end < currentTime * 1000;
          return (
            <button
              key={i}
              ref={isActive ? activeRef : null}
              className={`caption-chip ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
              onClick={() => onSeek && onSeek(cap.start / 1000)}
              title={cap.text}
            >
              <span className="chip-time">{formatTime(cap.start)}</span>
              <span className="chip-text">{cap.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
