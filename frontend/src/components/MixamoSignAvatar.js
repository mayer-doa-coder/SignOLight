import React, { useMemo } from "react";
import MixamoAvatar from "./MixamoAvatar";
import { resolveSignState } from "../services/timelineScheduler";
import "./MixamoSignAvatar.css";

const COMMON_GESTURES = new Set([
  "HELLO",
  "THANK",
  "YOU",
  "YES",
  "NO",
  "HELP",
  "PLEASE",
]);

function displayWord(word) {
  const value = String(word || "").trim().toUpperCase();
  const fingerspell = value.match(/^\[FINGERSPELL:([A-Z0-9]+)\]$/);
  if (fingerspell) return fingerspell[1];
  const number = value.match(/^\[NUMBER:(\d+)\]$/);
  if (number) return number[1];
  const concept = value.match(/^\[CONCEPT:(.+)\]$/);
  if (concept) return concept[1].replace(/[^A-Z0-9]/g, "");
  return value.replace(/[^A-Z0-9]/g, "");
}

function gestureForWord(word) {
  const label = displayWord(word);
  if (!label) return "RELAXED";
  if (COMMON_GESTURES.has(label)) return label;
  if (/^[A-Z]$/.test(label)) return label;
  if (/^[0-9]$/.test(label)) return `NUM_${label}`;
  return `SPELL_${label.slice(0, 14)}`;
}

export default function MixamoSignAvatar({
  caption,
  isActive,
  currentTime = 0,
  playbackSpeed = 1,
}) {
  const { wordIndex } = useMemo(() => {
    if (!caption || !isActive || !caption.words?.length) return { wordIndex: 0 };
    return resolveSignState(caption, currentTime * 1000, playbackSpeed);
  }, [caption, currentTime, isActive, playbackSpeed]);

  const words = caption?.words || [];
  const currentWord = words[wordIndex] || "";
  const gesture = isActive ? gestureForWord(currentWord) : "RELAXED";

  return (
    <div className="mixamo-sign-avatar">
      <div className="mixamo-player-stage">
        <MixamoAvatar gesture={gesture} viewMode="hands" />
      </div>

      {!isActive ? (
        <p className="mixamo-player-idle">Waiting for processed captions...</p>
      ) : (
        <div className="mixamo-player-gloss" aria-label="Current signed gloss">
          {words.map((word, index) => (
            <span
              key={`${word}-${index}`}
              className={index === wordIndex ? "active" : index < wordIndex ? "done" : ""}
            >
              {displayWord(word)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
