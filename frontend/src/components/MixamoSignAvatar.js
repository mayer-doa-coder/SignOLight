import React, { useMemo } from "react";
import MixamoAvatar from "./MixamoAvatar";
import { resolveSignState } from "../services/timelineScheduler";
import { displayMixamoWord, gestureForMixamoWord } from "../services/mixamoGestureMap";
import "./MixamoSignAvatar.css";

export default function MixamoSignAvatar({
  caption,
  isActive,
  currentTime = 0,
  playbackSpeed = 1,
  isPlaying = true,
}) {
  const { wordIndex } = useMemo(() => {
    if (!caption || !isActive || !caption.words?.length) return { wordIndex: 0 };
    return resolveSignState(caption, currentTime * 1000, playbackSpeed);
  }, [caption, currentTime, isActive, playbackSpeed]);

  const words = caption?.words || [];
  const currentWord = words[wordIndex] || "";
  const gesture = isActive ? gestureForMixamoWord(currentWord) : "RELAXED";

  return (
    <div className="mixamo-sign-avatar">
      <div className="mixamo-player-stage">
        <MixamoAvatar gesture={gesture} viewMode="body" isPlaying={isPlaying} />
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
              {displayMixamoWord(word)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
