import React, { useCallback, useMemo, useState } from "react";
import MixamoAvatar from "../components/MixamoAvatar";
import {
  BANGLA_ALPHABET,
  banglaGestureLabel,
} from "../services/banglaAlphabet";
import "./MixamoDemoPage.css";

const COMMON_GESTURES = [
  "HELLO", "THANK", "YOU", "ME", "YES", "NO", "WHAT", "WHERE", "WHEN", "WHY",
  "HOW", "HELP", "PLEASE", "SORRY", "GOOD", "BAD", "OK", "KNOW", "THINK",
  "LEARN", "SIGN", "ASL", "WANT", "SEE", "LOOK", "LOVE", "MORE",
];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 10 }, (_, index) => `NUM_${index}`);
const VIDEO_WORDS = [
  "AREA", "GRAPH", "CIRCLE", "RECTANGLE", "FUNCTION", "CALCULUS", "DERIVATIVE",
  "DX", "DR", "SUM", "PRODUCT", "POINT", "SMALLER", "MANY", "BETWEEN", "CHANGE",
  "FIND", "CAN", "RIGHT", "PROBLEM",
];

const GROUPS = [
  { id: "common", label: "Common signs", gestures: COMMON_GESTURES },
  { id: "alphabet", label: "ASL alphabet", gestures: LETTERS },
  {
    id: "bangla",
    label: "Bangla alphabet",
    gestures: BANGLA_ALPHABET.map(({ id }) => id),
  },
  { id: "numbers", label: "Numbers", gestures: NUMBERS },
  { id: "video", label: "Video words", gestures: VIDEO_WORDS },
];

function gestureLabel(gesture) {
  const banglaLabel = banglaGestureLabel(gesture);
  if (banglaLabel) return banglaLabel;
  return gesture.startsWith("NUM_") ? gesture.slice(4) : gesture;
}

export default function MixamoDemoPage({ onBack }) {
  const [groupId, setGroupId] = useState("common");
  const [gesture, setGesture] = useState("HELLO");
  const [viewMode, setViewMode] = useState("hands");
  const [rigReport, setRigReport] = useState(null);

  const group = useMemo(
    () => GROUPS.find((item) => item.id === groupId) || GROUPS[0],
    [groupId]
  );

  const handleGroupChange = (nextGroup) => {
    setGroupId(nextGroup.id);
    setGesture(nextGroup.gestures[0]);
  };

  const handleManualGesture = (item) => {
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
            <span>Current gesture</span>
            <strong>{gestureLabel(gesture)}</strong>
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
                  className={item === gesture ? "active" : ""}
                  onClick={() => handleManualGesture(item)}
                >
                  {gestureLabel(item)}
                </button>
              ))}
            </div>
          </section>

          <p className="mixamo-note">
            {groupId === "bangla"
              ? "Bangla letters stay in Bangla script. The avatar poses follow the supplied Bangla Sign Language alphabet chart."
              : "This page drives each thumb, index, middle, ring and pinky chain independently. Dynamic J, Z and NO gestures also animate during playback."}
          </p>
        </aside>
      </main>
    </div>
  );
}
