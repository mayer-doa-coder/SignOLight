import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MixamoAvatar from "../components/MixamoAvatar";
import "./MixamoDemoPage.css";

const COMMON_GESTURES = ["HELLO", "THANK", "YOU", "YES", "NO", "HELP", "PLEASE", "GOOD", "OK", "LOVE", "MORE"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 10 }, (_, index) => `NUM_${index}`);

const GROUPS = [
  { id: "common", label: "Common signs", gestures: COMMON_GESTURES },
  { id: "alphabet", label: "ASL alphabet", gestures: LETTERS },
  { id: "numbers", label: "Numbers", gestures: NUMBERS },
];

// How long each step holds before advancing. Words with a real mocap-backed
// sign (see mocapClips.js) get roughly their real captured duration; anything
// spelled out letter-by-letter gets a shorter fixed hold per letter/digit —
// there's no real timing data for individual fingerspelled characters.
const WORD_SIGN_MS = 1300;
const LETTER_HOLD_MS = 600;

function gestureLabel(gesture) {
  return gesture.startsWith("NUM_") ? gesture.slice(4) : gesture;
}

// Turns free text into a sequence of playable steps: known words become a
// single common-sign gesture, anything else falls back to fingerspelling
// letter-by-letter (digits map to NUM_<d>). Unspellable characters are
// dropped rather than silently guessed at.
function buildSignSequence(text) {
  const words = text
    .toUpperCase()
    .split(/[^A-Z0-9']+/)
    .filter(Boolean);

  const steps = [];
  for (const word of words) {
    if (COMMON_GESTURES.includes(word)) {
      steps.push({ gesture: word, word, label: word, fingerspelled: false, duration: WORD_SIGN_MS });
      continue;
    }
    for (const ch of word.replace(/'/g, "")) {
      if (/[A-Z]/.test(ch)) {
        steps.push({ gesture: ch, word, label: ch, fingerspelled: true, duration: LETTER_HOLD_MS });
      } else if (/[0-9]/.test(ch)) {
        steps.push({ gesture: `NUM_${ch}`, word, label: ch, fingerspelled: true, duration: LETTER_HOLD_MS });
      }
    }
  }
  return steps;
}

export default function MixamoDemoPage({ onBack }) {
  const [groupId, setGroupId] = useState("common");
  const [gesture, setGesture] = useState("HELLO");
  const [viewMode, setViewMode] = useState("hands");
  const [rigReport, setRigReport] = useState(null);

  const [sentenceInput, setSentenceInput] = useState("");
  const [sequence, setSequence] = useState([]);
  const [sequenceIndex, setSequenceIndex] = useState(-1);
  const advanceTimer = useRef(null);

  const isPlayingSentence = sequenceIndex >= 0 && sequenceIndex < sequence.length;
  const currentStep = isPlayingSentence ? sequence[sequenceIndex] : null;

  const group = useMemo(
    () => GROUPS.find((item) => item.id === groupId) || GROUPS[0],
    [groupId]
  );

  const stopSentence = useCallback(() => {
    clearTimeout(advanceTimer.current);
    setSequence([]);
    setSequenceIndex(-1);
  }, []);

  const handlePlaySentence = useCallback(() => {
    const steps = buildSignSequence(sentenceInput);
    if (!steps.length) return;
    clearTimeout(advanceTimer.current);
    setSequence(steps);
    setSequenceIndex(0);
  }, [sentenceInput]);

  // Drives playback: show the current step's gesture, hold it for its
  // duration, then advance. Cleans up on unmount/interruption so a stale
  // timer can't fire after the sequence was stopped or replaced.
  useEffect(() => {
    if (sequenceIndex < 0 || sequenceIndex >= sequence.length) return undefined;
    setGesture(sequence[sequenceIndex].gesture);
    advanceTimer.current = setTimeout(() => {
      setSequenceIndex((i) => i + 1);
    }, sequence[sequenceIndex].duration);
    return () => clearTimeout(advanceTimer.current);
  }, [sequenceIndex, sequence]);

  const handleGroupChange = (nextGroup) => {
    stopSentence();
    setGroupId(nextGroup.id);
    setGesture(nextGroup.gestures[0]);
  };

  const handleManualGesture = (item) => {
    stopSentence();
    setGesture(item);
  };

  const handleRigReport = useCallback((report) => {
    setRigReport(report);
  }, []);

  return (
    <div className="mixamo-demo-page">
      <header className="mixamo-demo-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div>
          <p className="mixamo-kicker">Experimental articulated rig</p>
          <h1>Mixamo Finger Lab</h1>
        </div>
        <div className="mixamo-header-actions">
          <button
            className={`mixamo-view-btn ${viewMode === "hands" ? "active" : ""}`}
            onClick={() => setViewMode("hands")}
          >
            Hand focus
          </button>
          <button
            className={`mixamo-view-btn ${viewMode === "body" ? "active" : ""}`}
            onClick={() => setViewMode("body")}
          >
            Full body
          </button>
        </div>
      </header>

      <main className="mixamo-demo-main">
        <section className="mixamo-stage-panel">
          <MixamoAvatar
            gesture={gesture}
            viewMode={viewMode}
            onRigReport={handleRigReport}
          />

          <div className="mixamo-stage-label">
            <span>{isPlayingSentence ? (currentStep.fingerspelled ? "Fingerspelling" : "Signing") : "Current gesture"}</span>
            <strong>{gestureLabel(gesture)}</strong>
            {isPlayingSentence && (
              <em className="mixamo-sentence-progress">
                "{currentStep.word}" &middot; step {sequenceIndex + 1} of {sequence.length}
              </em>
            )}
          </div>
        </section>

        <aside className="mixamo-controls">
          <section className="mixamo-rig-card">
            <div className="mixamo-rig-heading">
              <span className={`rig-light ${rigReport?.loaded ? "ready" : ""}`} />
              <div>
                <strong>{rigReport?.loaded ? "FBX rig ready" : "Loading FBX rig"}</strong>
                <span>Ch09_nonPBR.fbx</span>
              </div>
            </div>

            <div className="rig-metric">
              <span>Finger joints</span>
              <strong>
                {rigReport?.fingerBoneCount ?? "--"}/{rigReport?.totalFingerBones ?? 30}
              </strong>
            </div>

            {rigReport?.error && <p className="mixamo-rig-error">{rigReport.error}</p>}
          </section>

          <section className="mixamo-sentence-card">
            <p className="mixamo-section-label">Sign a word or sentence</p>
            <div className="mixamo-sentence-input-row">
              <input
                type="text"
                className="mixamo-sentence-input"
                placeholder="e.g. hello thank you good"
                value={sentenceInput}
                onChange={(e) => setSentenceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePlaySentence()}
              />
              {isPlayingSentence ? (
                <button className="mixamo-sentence-btn stop" onClick={stopSentence}>
                  Stop
                </button>
              ) : (
                <button className="mixamo-sentence-btn" onClick={handlePlaySentence}>
                  Play
                </button>
              )}
            </div>
            <p className="mixamo-note">
              Known words ({COMMON_GESTURES.join(", ")}) play their own sign; anything
              else is fingerspelled letter by letter.
            </p>
          </section>

          <section>
            <p className="mixamo-section-label">Gesture set</p>
            <div className="mixamo-group-tabs">
              {GROUPS.map((item) => (
                <button
                  key={item.id}
                  className={item.id === groupId ? "active" : ""}
                  onClick={() => handleGroupChange(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mixamo-gesture-section">
            <p className="mixamo-section-label">{group.label}</p>
            <div className={`mixamo-gesture-grid ${groupId}`}>
              {group.gestures.map((item) => (
                <button
                  key={item}
                  className={!isPlayingSentence && item === gesture ? "active" : ""}
                  onClick={() => handleManualGesture(item)}
                >
                  {gestureLabel(item)}
                </button>
              ))}
            </div>
          </section>

          <p className="mixamo-note">
            This page drives each thumb, index, middle, ring and pinky chain independently.
            Dynamic J, Z and NO gestures also animate during playback.
          </p>
        </aside>
      </main>
    </div>
  );
}
