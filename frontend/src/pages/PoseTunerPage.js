import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { tunerApi } from "../components/SignAvatar";
import "./PoseTunerPage.css";

// Dev-only authoring tool for sign clips. It drives the VRM through tunerApi — the SAME bone,
// finger, and expression functions playback uses — so a clip that looks right here renders
// identically in the player. Output matches public/signs/*.json exactly:
//   { gloss, duration, frames: [{ time, bones:{bone:[x,y,z]}, fingers:{right,left}, expression }] }
//
// Workflow: type a gloss, add 2-3 keyframes, scrub each with the sliders until the handshape
// and arm position read correctly, Play to preview the interpolation, then Export and drop the
// file into frontend/public/signs/. Flip SIGN_CLIPS_ENABLED back on in SignAvatar.js once a
// batch of clips is authored.

const { CLIP_BONES, FINGER_POSES, EXPRESSIONS } = tunerApi;
const AXES = ["x", "y", "z"];

function blankFrame(time) {
  const bones = {};
  CLIP_BONES.forEach((b) => { bones[b] = [0, 0, 0]; });
  return { time, bones, fingers: { right: "relaxed", left: "relaxed" }, expression: "neutral" };
}

function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export default function PoseTunerPage({ onBack }) {
  const canvasRef = useRef(null);
  const partsRef = useRef(null);
  const rafRef = useRef(0);
  // Frames live in a ref for the render loop and mirror to state for the UI.
  const framesRef = useRef([blankFrame(0), blankFrame(0.6)]);
  const [frames, setFrames] = useState(framesRef.current);
  const [activeIdx, setActiveIdx] = useState(0);
  const [gloss, setGloss] = useState("SIGN");
  const [loadError, setLoadError] = useState(null);
  const [ready, setReady] = useState(false);

  // Play state in a ref so the loop reads it without re-subscribing.
  const playRef = useRef({ playing: false, t: 0 });
  const [playing, setPlaying] = useState(false);

  const syncFrames = useCallback((next) => {
    framesRef.current = next;
    setFrames(next.slice());
  }, []);

  // Applies a single frame's pose to the VRM through the shared playback functions.
  const applyFrame = useCallback((frame) => {
    const parts = partsRef.current;
    if (!parts || !frame) return;
    const { bones, vrm } = parts;
    tunerApi.resetVrmPose(bones, 0); // baseline rest pose + idle finger curl, then override
    CLIP_BONES.forEach((name) => {
      const [x, y, z] = frame.bones[name] || [0, 0, 0];
      tunerApi.setBone(bones, name, x, y, z);
    });
    tunerApi.setVrmFingerPose(bones, "right", frame.fingers.right);
    tunerApi.setVrmFingerPose(bones, "left", frame.fingers.left);
    tunerApi.applyVrmExpression(vrm, frame.expression, 0, 1);
    vrm.update?.(0);
  }, []);

  // Interpolates between keyframes at time t (seconds) exactly as playback would.
  const applyAtTime = useCallback((t) => {
    const list = framesRef.current;
    if (!list.length) return;
    let from = list[0];
    let to = list[list.length - 1];
    for (let i = 0; i < list.length - 1; i += 1) {
      if (t >= list[i].time && t <= list[i + 1].time) { from = list[i]; to = list[i + 1]; break; }
    }
    const span = to.time - from.time || 1;
    const k = Math.max(0, Math.min(1, (t - from.time) / span));
    const parts = partsRef.current;
    if (!parts) return;
    const { bones, vrm } = parts;
    tunerApi.resetVrmPose(bones, 0);
    CLIP_BONES.forEach((name) => {
      const [x, y, z] = lerp3(from.bones[name] || [0, 0, 0], to.bones[name] || [0, 0, 0], k);
      tunerApi.setBone(bones, name, x, y, z);
    });
    // Fingers and expression are discrete — hold the source keyframe's until the next.
    tunerApi.setVrmFingerPose(bones, "right", from.fingers.right);
    tunerApi.setVrmFingerPose(bones, "left", from.fingers.left);
    tunerApi.applyVrmExpression(vrm, from.expression, 0, 1);
    vrm.update?.(0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.set(0, 0.9, 3.2);
    camera.lookAt(0, 0.85, 0);
    scene.add(new THREE.HemisphereLight("#ffffff", "#334155", 2.2));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(2, 3, 3);
    scene.add(key);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      tunerApi.VRM_MODEL_URL,
      (gltf) => {
        try {
          const vrm = gltf.userData.vrm;
          VRMUtils.removeUnnecessaryVertices(vrm.scene);
          VRMUtils.combineSkeletons(vrm.scene);
          VRMUtils.rotateVRM0(vrm);
          tunerApi.fitVrmToScene(vrm);
          tunerApi.tintVrmClothing(vrm, tunerApi.CLOTHING_COLOR);
          scene.add(vrm.scene);
          partsRef.current = tunerApi.createVrmParts(vrm);
          setReady(true);
        } catch (err) {
          setLoadError(String(err.message || err));
        }
      },
      undefined,
      (err) => setLoadError(`Could not load ${tunerApi.VRM_MODEL_URL}: ${err.message || err}`)
    );

    const clock = new THREE.Clock();
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      const { clientWidth: w, clientHeight: h } = canvas;
      if (w && h) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      if (partsRef.current) {
        if (playRef.current.playing) {
          const dur = framesRef.current[framesRef.current.length - 1]?.time || 1;
          playRef.current.t += clock.getDelta();
          if (playRef.current.t > dur) playRef.current.t = 0;
          applyAtTime(playRef.current.t);
        } else {
          clock.getDelta(); // keep delta fresh so play resumes smoothly
          applyFrame(framesRef.current[activeIdxRef.current]);
        }
      }
      renderer.render(scene, camera);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
    };
  }, [applyFrame, applyAtTime]);

  // activeIdx read inside the loop without re-running the effect.
  const activeIdxRef = useRef(0);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const active = frames[activeIdx];

  const updateBone = (bone, axis, value) => {
    const next = framesRef.current.slice();
    const f = { ...next[activeIdx], bones: { ...next[activeIdx].bones } };
    const arr = f.bones[bone].slice();
    arr[AXES.indexOf(axis)] = value;
    f.bones[bone] = arr;
    next[activeIdx] = f;
    syncFrames(next);
  };

  const updateField = (patch) => {
    const next = framesRef.current.slice();
    next[activeIdx] = { ...next[activeIdx], ...patch };
    syncFrames(next);
  };

  const updateTime = (value) => updateField({ time: Math.max(0, value) });

  const addFrame = () => {
    const list = framesRef.current;
    const lastTime = list[list.length - 1]?.time ?? 0;
    // Clone the active frame so authors tweak deltas rather than start from rest each time.
    const clone = JSON.parse(JSON.stringify(list[activeIdx]));
    clone.time = Number((lastTime + 0.3).toFixed(2));
    const next = [...list, clone];
    syncFrames(next);
    setActiveIdx(next.length - 1);
  };

  const deleteFrame = (idx) => {
    if (framesRef.current.length <= 2) return; // a clip needs >= 2 frames
    const next = framesRef.current.filter((_, i) => i !== idx);
    syncFrames(next);
    setActiveIdx((cur) => Math.min(cur, next.length - 1));
  };

  const togglePlay = () => {
    playRef.current.playing = !playRef.current.playing;
    playRef.current.t = 0;
    setPlaying(playRef.current.playing);
  };

  const buildClip = () => {
    const list = framesRef.current;
    const duration = Number((list[list.length - 1]?.time || 1).toFixed(2));
    return {
      gloss: gloss.trim().toUpperCase(),
      duration,
      frames: list.map((f) => ({
        time: Number(f.time.toFixed(2)),
        bones: Object.fromEntries(CLIP_BONES.map((b) => [b, f.bones[b].map((n) => Number(n.toFixed(3)))])),
        fingers: { ...f.fingers },
        expression: f.expression,
      })),
    };
  };

  const exportClip = () => {
    const clip = buildClip();
    const blob = new Blob([JSON.stringify(clip, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clip.gloss || "SIGN"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyClip = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildClip(), null, 2));
    } catch { /* clipboard blocked — Export button still works */ }
  };

  return (
    <div className="tuner">
      <header className="tuner-top">
        <button className="tuner-btn ghost" onClick={onBack}>← Back</button>
        <h1>Sign Pose Tuner <span className="tuner-dev">dev</span></h1>
        <div className="tuner-gloss">
          <label>Gloss</label>
          <input value={gloss} onChange={(e) => setGloss(e.target.value)} spellCheck={false} />
        </div>
      </header>

      <div className="tuner-body">
        <div className="tuner-stage">
          <canvas ref={canvasRef} className="tuner-canvas" />
          {loadError && <div className="tuner-error">{loadError}</div>}
          {!ready && !loadError && <div className="tuner-loading">Loading VRM…</div>}
          <div className="tuner-play">
            <button className="tuner-btn" onClick={togglePlay}>{playing ? "⏸ Stop preview" : "▶ Play preview"}</button>
          </div>
        </div>

        <div className="tuner-controls">
          <section>
            <div className="tuner-frames">
              {frames.map((f, i) => (
                <button
                  key={i}
                  className={`tuner-frame ${i === activeIdx ? "active" : ""}`}
                  onClick={() => { setActiveIdx(i); playRef.current.playing = false; setPlaying(false); }}
                >
                  #{i} · {f.time.toFixed(2)}s
                  {frames.length > 2 && (
                    <span className="tuner-del" onClick={(e) => { e.stopPropagation(); deleteFrame(i); }}>✕</span>
                  )}
                </button>
              ))}
              <button className="tuner-btn small" onClick={addFrame}>+ keyframe</button>
            </div>
          </section>

          {active && (
            <>
              <section className="tuner-row">
                <label>Keyframe time (s)</label>
                <input type="number" step="0.05" min="0" value={active.time}
                  onChange={(e) => updateTime(Number(e.target.value))} />
              </section>

              <section className="tuner-row two">
                <div>
                  <label>Right fingers</label>
                  <select value={active.fingers.right}
                    onChange={(e) => updateField({ fingers: { ...active.fingers, right: e.target.value } })}>
                    {FINGER_POSES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label>Left fingers</label>
                  <select value={active.fingers.left}
                    onChange={(e) => updateField({ fingers: { ...active.fingers, left: e.target.value } })}>
                    {FINGER_POSES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </section>

              <section className="tuner-row">
                <label>Expression (NMM)</label>
                <select value={active.expression} onChange={(e) => updateField({ expression: e.target.value })}>
                  {EXPRESSIONS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </section>

              <section className="tuner-bones">
                {CLIP_BONES.map((bone) => (
                  <div className="tuner-bone" key={bone}>
                    <div className="tuner-bone-name">{bone}</div>
                    {AXES.map((axis, ai) => (
                      <div className="tuner-slider" key={axis}>
                        <span>{axis}</span>
                        <input type="range" min={-3.14} max={3.14} step={0.01}
                          value={active.bones[bone][ai]}
                          onChange={(e) => updateBone(bone, axis, Number(e.target.value))} />
                        <span className="tuner-val">{active.bones[bone][ai].toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>

              <section className="tuner-export">
                <button className="tuner-btn primary" onClick={exportClip}>⬇ Export {gloss.toUpperCase()}.json</button>
                <button className="tuner-btn" onClick={copyClip}>Copy JSON</button>
              </section>
              <p className="tuner-hint">
                Drop the exported file into <code>frontend/public/signs/</code>, then set
                <code>SIGN_CLIPS_ENABLED = true</code> in SignAvatar.js to play authored clips.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
