import React, { useRef, useEffect, useState } from "react";
import "./CaptionBar.css";

const NMM_LABELS = {
  "wh-question": { text: "WH?", title: "WH-question — eyebrows furrowed" },
  "yn-question": { text: "YN?", title: "Yes/No question — eyebrows raised" },
  negation: { text: "NEG", title: "Negation — head shake" },
};

export default function CaptionBar({
  caption,
  allCaptions,
  currentTime,
  onSeek,
  sentenceNMM,
  coverage,
  showDebug = false,
}) {
  const activeRef = useRef(null);
  const scrollRef = useRef(null);
  const [debugOpen, setDebugOpen] = useState(false);

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

  const nmmInfo = sentenceNMM ? NMM_LABELS[sentenceNMM.type] : null;
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

        <div className="caption-meta">
          {/* NMM badge */}
          {nmmInfo && (
            <span className="nmm-tag" title={nmmInfo.title}>
              {nmmInfo.text}
            </span>
          )}

          {/* BdSL gloss */}
          {caption?.gloss && (
            <span
              className="caption-gloss"
              title="BdSL Gloss — word order follows BdSL grammar (SOV), not English word order"
              style={{ opacity: caption.confidence != null && caption.confidence < 0.7 ? 0.55 : 1 }}
            >
              🤟 {caption.gloss}
              <span className="gloss-order-label" title="BdSL uses Subject-Object-Verb order, not English Subject-Verb-Object">(BdSL order)</span>
              {caption.confidence != null && caption.confidence < 0.7 && (
                <span className="gloss-uncertain" title="Approximate — Groq AI unavailable">~</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Dictionary coverage + debug toggle */}
      {(coverage != null || showDebug) && (
        <div className="caption-status-row">
          {coverage != null && (
            <span className="coverage-badge" title={`BdSL dictionary covers ${coverage.covered} of ${coverage.total} gloss words`}>
              BdSL coverage: {coverage.percentage}%
              {coverage.validated > 0 && (
                <span className="validated-count"> ({coverage.validated} validated)</span>
              )}
            </span>
          )}
          {showDebug && (
            <button
              className="debug-toggle"
              onClick={() => setDebugOpen((v) => !v)}
              title="Toggle gloss debug view"
            >
              {debugOpen ? "▲ Hide" : "▼ Debug"}
            </button>
          )}
        </div>
      )}

      {/* Gloss debug panel */}
      {debugOpen && caption && (
        <div className="gloss-debug-panel">
          <div className="debug-row">
            <span className="debug-label">Original</span>
            <span className="debug-value">{caption.text}</span>
          </div>
          {hasSimplified && (
            <div className="debug-row">
              <span className="debug-label">Simplified</span>
              <span className="debug-value">{caption.simplified}</span>
            </div>
          )}
          <div className="debug-row">
            <span className="debug-label">BdSL Gloss</span>
            <span className="debug-value mono">{caption.gloss || "—"}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Words</span>
            <span className="debug-value mono">{(caption.words || []).join(" | ")}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Confidence</span>
            <span className="debug-value">{caption.confidence != null ? `${Math.round(caption.confidence * 100)}%` : "—"}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">NMM</span>
            <span className="debug-value">{sentenceNMM?.type ?? "neutral"} (onset word #{sentenceNMM?.wordIndex ?? -1})</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Timing</span>
            <span className="debug-value">{formatTime(caption.start)} → {formatTime(caption.end)}</span>
          </div>
        </div>
      )}

      {/* Caption timeline scroll */}
      <div className="caption-scroll" ref={scrollRef}>
        {allCaptions.map((cap, i) => {
          const isActive = caption && cap.start === caption.start;
          const isPast = cap.end < currentTime * 1000;
          const isLowConf = cap.confidence != null && cap.confidence < 0.7;
          return (
            <button
              key={i}
              ref={isActive ? activeRef : null}
              className={`caption-chip ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
              onClick={() => onSeek && onSeek(cap.start / 1000)}
              title={cap.gloss || cap.text}
              style={{ opacity: isLowConf ? 0.55 : 1 }}
            >
              <span className="chip-time">{formatTime(cap.start)}</span>
              <span className="chip-text">{cap.text}</span>
              {isLowConf && <span className="chip-uncertain">~</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
