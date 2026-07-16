import React, { useMemo } from "react";
import MixamoAvatar from "./MixamoAvatar";
import { resolveSignState } from "../services/timelineScheduler";
import {
  displayMixamoWord,
  gestureForMixamoWord,
  spellingUnitsForMixamoWord,
} from "../services/mixamoGestureMap";
import "./MixamoSignAvatar.css";

export default function MixamoSignAvatar({
  caption,
  isActive,
  currentTime = 0,
  playbackSpeed = 1,
  isPlaying = true,
}) {
  const { wordIndex, wordProgress } = useMemo(() => {
    if (!caption || !isActive || !caption.words?.length) {
      return { wordIndex: 0, wordProgress: 0 };
    }
    return resolveSignState(caption, currentTime * 1000, playbackSpeed);
  }, [caption, currentTime, isActive, playbackSpeed]);

  const words = caption?.words || [];
  const currentWord = words[wordIndex] || "";
  const gesture = isActive
    ? gestureForMixamoWord(currentWord, wordProgress)
    : "RELAXED";
  const spellingUnits = spellingUnitsForMixamoWord(currentWord);
  const activeUnitIndex = spellingUnits.length
    ? Math.min(
        spellingUnits.length - 1,
        Math.floor(Math.max(0, Math.min(0.999999, wordProgress)) * spellingUnits.length)
      )
    : -1;

  return (
    <div className="mixamo-sign-avatar">
      <div className="mixamo-player-stage">
        <MixamoAvatar gesture={gesture} viewMode="body" isPlaying={isPlaying} />
      </div>

      {!isActive ? (
        <p className="mixamo-player-idle">Waiting for processed captions...</p>
      ) : (
        <>
          {spellingUnits.length > 0 && (
            <div className="mixamo-spelling-strip" aria-label={`Spelling ${displayMixamoWord(currentWord)}`}>
              <strong>{displayMixamoWord(currentWord)}</strong>
              <div>
                {spellingUnits.map((unit, index) => (
                  <span
                    key={`${unit.label}-${index}`}
                    className={index === activeUnitIndex ? "active" : index < activeUnitIndex ? "done" : ""}
                  >
                    {unit.label}
                  </span>
                ))}
              </div>
            </div>
          )}
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
        </>
      )}
    </div>
  );
}
