import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { effectiveNMM, resolveSignState } from "../services/timelineScheduler";
import "./SignAvatar.css";

const VRM_MODEL_URL = "/models/sign.vrm";
const signClipCache = new Map();

const SIGN_MOTIONS = {
  HELLO: { label: "Hello", motion: "wave", color: "#00d4ff", expression: "smile" },
  THANK: { label: "Thank You", motion: "chin-forward", color: "#10b981", expression: "soft" },
  YOU: { label: "You", motion: "point-out", color: "#7c3aed", expression: "focus" },
  ME: { label: "Me", motion: "point-self", color: "#f59e0b", expression: "focus" },
  YES: { label: "Yes", motion: "nod", color: "#10b981", expression: "smile" },
  NO: { label: "No", motion: "shake", color: "#ef4444", expression: "firm" },
  LEARN: { label: "Learn", motion: "learn", color: "#00d4ff", expression: "focus" },
  KNOW: { label: "Know", motion: "tap-head", color: "#f59e0b", expression: "focus" },
  UNDERSTAND: { label: "Understand", motion: "snap", color: "#7c3aed", expression: "smile" },
  GOOD: { label: "Good", motion: "thumbs", color: "#10b981", expression: "smile" },
  BAD: { label: "Bad", motion: "thumbs-down", color: "#ef4444", expression: "firm" },
  HELP: { label: "Help", motion: "lift", color: "#00d4ff", expression: "soft" },
  PLEASE: { label: "Please", motion: "circle-chest", color: "#f59e0b", expression: "soft" },
  SORRY: { label: "Sorry", motion: "fist-circle", color: "#8b5cf6", expression: "sad" },
  WHAT: { label: "What", motion: "shrug", color: "#f59e0b", expression: "question" },
  WHERE: { label: "Where", motion: "waggle", color: "#f59e0b", expression: "question" },
  WHEN: { label: "When", motion: "circle-wrist", color: "#f59e0b", expression: "question" },
  HOW: { label: "How", motion: "knuckles", color: "#7c3aed", expression: "question" },
  WHY: { label: "Why", motion: "y-hand", color: "#f59e0b", expression: "question" },
  BECAUSE: { label: "Because", motion: "index-temple", color: "#00d4ff", expression: "focus" },
  SIGN: { label: "Sign", motion: "sign", color: "#00d4ff", expression: "smile" },
  BDSL: { label: "BdSL", motion: "sign", color: "#00d4ff", expression: "focus" },

  // === Academic / CS / Neural Networks domain vocabulary ===
  // These are educational gesture representations — not yet validated by a BdSL community reviewer.
  NETWORK:     { label: "Network",     motion: "spread-hands",  color: "#6366f1", expression: "focus" },
  NEURON:      { label: "Neuron",      motion: "point-out",     color: "#22d3ee", expression: "focus" },
  LAYER:       { label: "Layer",       motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  TRAIN:       { label: "Train",       motion: "tap-head",      color: "#10b981", expression: "focus" },
  MODEL:       { label: "Model",       motion: "circle-chest",  color: "#6366f1", expression: "focus" },
  WEIGHT:      { label: "Weight",      motion: "thumbs",        color: "#f59e0b", expression: "focus" },
  GRADIENT:    { label: "Gradient",    motion: "wave",          color: "#22d3ee", expression: "focus" },
  LOSS:        { label: "Loss",        motion: "thumbs-down",   color: "#ef4444", expression: "sad"   },
  FUNCTION:    { label: "Function",    motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  ACTIVATE:    { label: "Activate",    motion: "snap",          color: "#22d3ee", expression: "smile" },
  DATA:        { label: "Data",        motion: "point-self",    color: "#7c3aed", expression: "focus" },
  INPUT:       { label: "Input",       motion: "point-out",     color: "#22d3ee", expression: "focus" },
  OUTPUT:      { label: "Output",      motion: "chin-forward",  color: "#10b981", expression: "focus" },
  ERROR:       { label: "Error",       motion: "shake",         color: "#ef4444", expression: "firm"  },
  PREDICT:     { label: "Predict",     motion: "y-hand",        color: "#f59e0b", expression: "focus" },
  CALCULATE:   { label: "Calculate",   motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  MATRIX:      { label: "Matrix",      motion: "spread-hands",  color: "#6366f1", expression: "focus" },
  VECTOR:      { label: "Vector",      motion: "point-out",     color: "#22d3ee", expression: "focus" },
  PATTERN:     { label: "Pattern",     motion: "circle-chest",  color: "#7c3aed", expression: "focus" },
  IMAGE:       { label: "Image",       motion: "flat-hand",     color: "#f59e0b", expression: "focus" },
  CLASSIFY:    { label: "Classify",    motion: "waggle",        color: "#6366f1", expression: "focus" },
  ACCURACY:    { label: "Accuracy",    motion: "thumbs",        color: "#10b981", expression: "smile" },
  PROBABILITY: { label: "Probability", motion: "shrug",         color: "#f59e0b", expression: "focus" },
  DEEP:        { label: "Deep",        motion: "tap-head",      color: "#a78bfa", expression: "focus" },
  CONNECT:     { label: "Connect",     motion: "lift",          color: "#22d3ee", expression: "focus" },
  NODE:        { label: "Node",        motion: "point-self",    color: "#6366f1", expression: "focus" },
  SIGNAL:      { label: "Signal",      motion: "wave",          color: "#22d3ee", expression: "focus" },
  PIXEL:       { label: "Pixel",       motion: "snap",          color: "#a78bfa", expression: "focus" },
  EXAMPLE:     { label: "Example",     motion: "point-out",     color: "#7c3aed", expression: "focus" },
  PROCESS:     { label: "Process",     motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  STEP:        { label: "Step",        motion: "index-temple",  color: "#f59e0b", expression: "focus" },
  RESULT:      { label: "Result",      motion: "chin-forward",  color: "#10b981", expression: "smile" },
  PROBLEM:     { label: "Problem",     motion: "shake",         color: "#ef4444", expression: "firm"  },
  SOLUTION:    { label: "Solution",    motion: "thumbs",        color: "#10b981", expression: "smile" },
  COMPUTER:    { label: "Computer",    motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  PROGRAM:     { label: "Program",     motion: "tap-head",      color: "#6366f1", expression: "focus" },
};

const FINGER_NAMES = ["thumb", "index", "middle", "ring", "pinky"];

function getSignInfo(word) {
  const s = String(word || "").trim().toUpperCase();
  const fsMatch = s.match(/^\[FINGERSPELL:([A-Z0-9]+)\]$/);
  if (fsMatch) {
    return { label: fsMatch[1], motion: "fingerspell", color: "#06b6d4", expression: "neutral", letters: fsMatch[1] };
  }
  const conceptMatch = s.match(/^\[CONCEPT:(.+)\]$/);
  if (conceptMatch) {
    const cw = conceptMatch[1].replace(/[^A-Za-z\s]/g, "").toUpperCase().trim();
    return { label: cw, motion: "concept-card", color: "#64748b", expression: "neutral" };
  }
  const numMatch = s.match(/^\[NUMBER:(\d+)\]$/);
  if (numMatch) {
    return { label: "#" + numMatch[1], motion: "concept-card", color: "#64748b", expression: "neutral" };
  }
  const upper = s.replace(/[^A-Z]/g, "") || "";
  // Fallback hierarchy: SIGN_MOTIONS → concept card (not generic fingerspell)
  return SIGN_MOTIONS[upper] || { label: upper || "Ready", motion: "concept-card", color: "#64748b", expression: "neutral" };
}

// Returns "" for bracket-tagged words so loadSignClip skips the network fetch.
function normalizeGlossWord(word) {
  const s = String(word || "").trim().toUpperCase();
  if (s.startsWith("[")) return "";
  return s.replace(/[^A-Z]/g, "");
}

// Human-readable display form of a gloss word for the UI.
function displayGlossWord(word) {
  const s = String(word || "").trim().toUpperCase();
  const fsMatch = s.match(/^\[FINGERSPELL:([A-Z0-9]+)\]$/);
  if (fsMatch) return "~" + fsMatch[1];
  const conceptMatch = s.match(/^\[CONCEPT:(.+)\]$/);
  if (conceptMatch) return "?" + conceptMatch[1].replace(/[^A-Z]/g, "").slice(0, 12);
  const numMatch = s.match(/^\[NUMBER:(\d+)\]$/);
  if (numMatch) return "#" + numMatch[1];
  return s.replace(/[^A-Z]/g, "");
}

async function loadSignClip(word) {
  const key = normalizeGlossWord(word);
  if (!key) return null;
  if (signClipCache.has(key)) return signClipCache.get(key);

  const promise = fetch(`/signs/${key}.json`)
    .then((response) => (response.ok ? response.json() : null))
    .then((clip) => {
      if (!clip) return null;
      if (!Array.isArray(clip.frames) || clip.frames.length < 2 || !clip.duration) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[SignAvatar] Clip "${key}" failed validation — must have duration and ≥2 frames`);
        }
        return null;
      }
      return clip;
    })
    .catch(() => null);

  signClipCache.set(key, promise);
  return promise;
}

function createMaterial(color, roughness = 0.65, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createLimb(length, radius, material) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.9, length, 18),
    material
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function createFinger(name, material) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 6, 10), material);
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 6, 10), material);
  base.position.y = 0.08;
  tip.position.y = 0.22;
  base.castShadow = true;
  tip.castShadow = true;
  group.name = name;
  group.add(base, tip);
  return group;
}

function createHand(material, side) {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 18), material);
  palm.scale.set(0.72, 0.95, 0.32);
  palm.castShadow = true;
  hand.add(palm);

  const fingers = {};
  const offsets = [-0.11, -0.04, 0.03, 0.1];
  ["index", "middle", "ring", "pinky"].forEach((name, index) => {
    const finger = createFinger(name, material);
    finger.position.set(offsets[index], 0.16, 0.02);
    finger.rotation.z = offsets[index] * 0.9;
    hand.add(finger);
    fingers[name] = finger;
  });

  const thumb = createFinger("thumb", material);
  thumb.position.set(side * -0.14, 0.03, 0.02);
  thumb.rotation.z = side * 1.2;
  thumb.rotation.x = 0.4;
  hand.add(thumb);
  fingers.thumb = thumb;

  hand.userData.fingers = fingers;
  return hand;
}

function createAvatar() {
  const avatar = new THREE.Group();
  const skin = createMaterial("#f0b28c", 0.7);
  const shirt = createMaterial("#157b86", 0.58);
  const dark = createMaterial("#1f2937", 0.72);
  const white = createMaterial("#f8fafc", 0.5);
  const eye = createMaterial("#111827", 0.35);
  const mouthMat = createMaterial("#7f1d1d", 0.5);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.0, 16, 24), shirt);
  torso.scale.set(0.88, 1.05, 0.42);
  torso.position.y = 0.15;
  torso.castShadow = true;
  avatar.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.22, 18), skin);
  neck.position.y = 0.95;
  avatar.add(neck);

  const head = new THREE.Group();
  head.position.y = 1.38;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 32), skin);
  face.scale.set(0.9, 1.08, 0.82);
  face.castShadow = true;
  head.add(face);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 16), dark);
  hair.scale.set(0.93, 0.45, 0.84);
  hair.position.set(0, 0.23, -0.01);
  head.add(hair);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), white);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.12, 0.04, 0.31);
  rightEye.position.set(0.12, 0.04, 0.31);
  head.add(leftEye, rightEye);

  const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), eye);
  const rightPupil = leftPupil.clone();
  leftPupil.position.set(-0.12, 0.035, 0.345);
  rightPupil.position.set(0.12, 0.035, 0.345);
  head.add(leftPupil, rightPupil);

  const browMaterial = createMaterial("#3d1f12", 0.7);
  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.018, 0.02), browMaterial);
  const rightBrow = leftBrow.clone();
  leftBrow.position.set(-0.12, 0.15, 0.33);
  rightBrow.position.set(0.12, 0.15, 0.33);
  head.add(leftBrow, rightBrow);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.025), mouthMat);
  mouth.position.set(0, -0.17, 0.335);
  head.add(mouth);
  avatar.add(head);

  function arm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.54, 0.58, 0);

    const upper = createLimb(0.58, 0.075, skin);
    const elbow = new THREE.Group();
    elbow.position.y = -0.58;
    const lower = createLimb(0.55, 0.065, skin);
    const hand = createHand(skin, side);
    hand.position.y = -0.59;

    shoulder.add(upper);
    shoulder.add(elbow);
    elbow.add(lower);
    lower.add(hand);

    avatar.add(shoulder);
    return { shoulder, elbow, lower, hand };
  }

  const left = arm(-1);
  const right = arm(1);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 64),
    new THREE.MeshStandardMaterial({
      color: "#0f172a",
      roughness: 0.85,
      transparent: true,
      opacity: 0.45,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.08;
  floor.receiveShadow = true;
  avatar.add(floor);

  return {
    group: avatar,
    head,
    torso,
    mouth,
    leftBrow,
    rightBrow,
    left,
    right,
    accentTargets: [torso],
  };
}

function setEuler(group, x, y, z) {
  group.rotation.set(x, y, z);
}

function setFingerPose(hand, pose = "open") {
  const fingers = hand.userData.fingers || {};
  const curls = {
    open: { thumb: 0.2, index: 0.05, middle: 0.05, ring: 0.08, pinky: 0.1 },
    fist: { thumb: 0.9, index: 1.25, middle: 1.25, ring: 1.25, pinky: 1.2 },
    point: { thumb: 0.45, index: -0.05, middle: 1.2, ring: 1.25, pinky: 1.25 },
    flat: { thumb: 0.35, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.0 },
    thumb: { thumb: -0.65, index: 1.2, middle: 1.2, ring: 1.2, pinky: 1.2 },
    y: { thumb: -0.45, index: 1.15, middle: 1.2, ring: 1.15, pinky: -0.25 },
    spell: { thumb: 0.25, index: 0.35, middle: 0.1, ring: 0.45, pinky: 0.7 },
  }[pose] || {};

  FINGER_NAMES.forEach((name) => {
    if (fingers[name]) {
      fingers[name].rotation.x = curls[name] || 0;
    }
  });
}

function applyExpression(parts, expression, time) {
  const browLift = expression === "question" ? 0.07 : 0;
  const browFirm = expression === "firm" ? -0.04 : 0;
  const sad = expression === "sad" ? -0.04 : 0;
  const smile = expression === "smile" || expression === "soft" ? 0.035 : 0;

  parts.leftBrow.position.y = 0.15 + browLift + browFirm;
  parts.rightBrow.position.y = 0.15 + browLift + browFirm;
  parts.leftBrow.rotation.z = expression === "question" ? 0.16 : expression === "firm" ? -0.1 : 0;
  parts.rightBrow.rotation.z = expression === "question" ? -0.16 : expression === "firm" ? 0.1 : 0;
  parts.mouth.scale.set(1, expression === "question" ? 1.6 : 1, 1);
  parts.mouth.position.y = -0.17 + smile + sad + Math.sin(time * 5) * 0.003;
  parts.mouth.rotation.z = sad ? 0.05 : 0;
}

// Simplified handshape descriptors for fingerspelling.
// Each letter maps to an existing finger pose + wrist rotation for visual distinction.
// These are NOT validated BdSL manual alphabet shapes — the letter ticker carries the meaning.
const FINGERSPELL_HANDSHAPES = {
  A: { pose: "fist",  wristX: -0.10, wristY:  0.00, wristZ: -0.10 },
  B: { pose: "flat",  wristX:  0.00, wristY:  0.00, wristZ:  0.10 },
  C: { pose: "spell", wristX:  0.20, wristY:  0.10, wristZ:  0.10 },
  D: { pose: "point", wristX: -0.15, wristY:  0.00, wristZ: -0.10 },
  E: { pose: "fist",  wristX:  0.15, wristY:  0.00, wristZ: -0.10 },
  F: { pose: "spell", wristX: -0.10, wristY: -0.10, wristZ:  0.00 },
  G: { pose: "point", wristX:  0.00, wristY: -0.30, wristZ: -0.20 },
  H: { pose: "flat",  wristX:  0.00, wristY: -0.25, wristZ:  0.20 },
  I: { pose: "y",     wristX: -0.10, wristY:  0.00, wristZ: -0.15 },
  J: { pose: "y",     wristX: -0.10, wristY:  0.20, wristZ: -0.10 },
  K: { pose: "point", wristX: -0.20, wristY:  0.10, wristZ:  0.00 },
  L: { pose: "thumb", wristX:  0.00, wristY:  0.00, wristZ:  0.10 },
  M: { pose: "fist",  wristX:  0.10, wristY:  0.15, wristZ: -0.05 },
  N: { pose: "fist",  wristX:  0.10, wristY: -0.10, wristZ: -0.05 },
  O: { pose: "spell", wristX:  0.25, wristY:  0.00, wristZ:  0.00 },
  P: { pose: "point", wristX:  0.30, wristY: -0.10, wristZ: -0.20 },
  Q: { pose: "point", wristX:  0.30, wristY:  0.10, wristZ: -0.20 },
  R: { pose: "spell", wristX:  0.00, wristY:  0.00, wristZ: -0.20 },
  S: { pose: "fist",  wristX:  0.00, wristY:  0.00, wristZ: -0.15 },
  T: { pose: "fist",  wristX:  0.00, wristY:  0.00, wristZ:  0.15 },
  U: { pose: "flat",  wristX: -0.10, wristY:  0.00, wristZ: -0.15 },
  V: { pose: "flat",  wristX: -0.10, wristY:  0.00, wristZ: -0.25 },
  W: { pose: "flat",  wristX:  0.00, wristY:  0.00, wristZ: -0.10 },
  X: { pose: "point", wristX:  0.20, wristY:  0.00, wristZ: -0.10 },
  Y: { pose: "y",     wristX:  0.00, wristY:  0.00, wristZ: -0.10 },
  Z: { pose: "point", wristX: -0.20, wristY:  0.00, wristZ:  0.00 },
};

function applyMotion(parts, signInfo, time) {
  const motion = signInfo.motion;
  const wave = Math.sin(time * 7);
  const slow = Math.sin(time * 2.6);
  const pulse = Math.sin(time * 12);

  parts.group.rotation.y = slow * 0.03;
  parts.torso.rotation.z = slow * 0.015;
  parts.head.rotation.set(0, 0, 0);

  setEuler(parts.left.shoulder, 0.55, 0.15, 0.45);
  setEuler(parts.left.elbow, 0.45, 0.05, -0.2);
  setEuler(parts.right.shoulder, 0.45, -0.15, -0.45);
  setEuler(parts.right.elbow, 0.42, -0.05, 0.2);
  parts.left.hand.rotation.set(0.2, 0, 0.25);
  parts.right.hand.rotation.set(0.2, 0, -0.25);
  parts.left.hand.position.set(0, -0.59, 0);
  parts.right.hand.position.set(0, -0.59, 0);
  setFingerPose(parts.left.hand, "open");
  setFingerPose(parts.right.hand, "open");

  switch (motion) {
    case "wave":
      setEuler(parts.right.shoulder, -1.35, 0.15, -1.15);
      setEuler(parts.right.elbow, -0.35, 0.0, -0.25);
      parts.right.hand.rotation.set(0.2, 0.2, wave * 0.65);
      setFingerPose(parts.right.hand, "flat");
      break;
    case "chin-forward":
      setEuler(parts.right.shoulder, -0.82, -0.08, -0.6);
      setEuler(parts.right.elbow, -0.88, 0.08, 0.2);
      parts.right.hand.position.z = 0.1 + Math.max(0, wave) * 0.12;
      parts.right.hand.rotation.set(-0.1, 0.15, -0.3);
      setFingerPose(parts.right.hand, "flat");
      break;
    case "point-out":
      setEuler(parts.right.shoulder, -1.15, -0.42, -0.52);
      setEuler(parts.right.elbow, -0.45, -0.2, 0.05);
      parts.right.hand.rotation.set(-0.25, -0.2, -0.25);
      setFingerPose(parts.right.hand, "point");
      break;
    case "point-self":
      setEuler(parts.right.shoulder, -0.68, 0.18, -0.5);
      setEuler(parts.right.elbow, -1.0, 0.22, 0.08);
      parts.right.hand.rotation.set(-0.8, 0.0, 0.35);
      setFingerPose(parts.right.hand, "point");
      break;
    case "nod":
      parts.head.rotation.x = Math.sin(time * 8) * 0.18;
      setFingerPose(parts.right.hand, "fist");
      parts.right.hand.rotation.z = pulse * 0.12;
      break;
    case "shake":
      parts.head.rotation.y = Math.sin(time * 9) * 0.22;
      setFingerPose(parts.right.hand, "point");
      parts.right.hand.rotation.z = Math.sin(time * 9) * 0.18;
      break;
    case "learn":
      setEuler(parts.left.shoulder, -0.75, 0.08, 0.68);
      setEuler(parts.left.elbow, -0.55, 0.0, -0.2);
      setEuler(parts.right.shoulder, -0.95, -0.1, -0.72);
      setEuler(parts.right.elbow, -0.72, 0.0, 0.3);
      parts.right.hand.position.y = -0.59 + Math.max(0, wave) * 0.15;
      setFingerPose(parts.left.hand, "flat");
      setFingerPose(parts.right.hand, "spell");
      break;
    case "tap-head":
    case "index-temple":
      setEuler(parts.right.shoulder, -1.25, -0.18, -0.55);
      setEuler(parts.right.elbow, -1.1, -0.15, 0.2);
      parts.right.hand.position.y = -0.55 + Math.max(0, pulse) * 0.06;
      parts.right.hand.rotation.set(-0.45, 0.1, -0.2);
      setFingerPose(parts.right.hand, "point");
      break;
    case "snap":
      setEuler(parts.right.shoulder, -0.88, -0.08, -0.55);
      setEuler(parts.right.elbow, -0.8, 0.0, 0.15);
      parts.right.hand.rotation.set(-0.3, 0, pulse > 0 ? 0.45 : -0.15);
      setFingerPose(parts.right.hand, pulse > 0 ? "spell" : "fist");
      break;
    case "thumbs":
      setEuler(parts.right.shoulder, -0.72, -0.04, -0.55);
      setEuler(parts.right.elbow, -0.75, 0.0, 0.2);
      parts.right.hand.rotation.set(-0.6, 0, -0.2);
      setFingerPose(parts.right.hand, "thumb");
      break;
    case "thumbs-down":
      setEuler(parts.right.shoulder, -0.5, -0.02, -0.5);
      setEuler(parts.right.elbow, -0.55, 0.0, 0.2);
      parts.right.hand.rotation.set(1.5, 0, -0.2);
      setFingerPose(parts.right.hand, "thumb");
      break;
    case "lift":
      setEuler(parts.left.shoulder, -0.7, 0.05, 0.55);
      setEuler(parts.right.shoulder, -0.7, -0.05, -0.55);
      parts.left.hand.position.y = -0.57 + Math.max(0, wave) * 0.14;
      parts.right.hand.position.y = -0.57 + Math.max(0, wave) * 0.14;
      setFingerPose(parts.left.hand, "fist");
      setFingerPose(parts.right.hand, "flat");
      break;
    case "circle-chest":
    case "fist-circle":
      setEuler(parts.right.shoulder, -0.62, -0.02, -0.52);
      setEuler(parts.right.elbow, -0.85, 0.0, 0.16);
      parts.right.hand.position.x = Math.cos(time * 5) * 0.08;
      parts.right.hand.position.z = Math.sin(time * 5) * 0.08;
      setFingerPose(parts.right.hand, motion === "fist-circle" ? "fist" : "flat");
      break;
    case "shrug":
    case "waggle":
      setEuler(parts.left.shoulder, -0.6, 0.12, 0.9);
      setEuler(parts.right.shoulder, -0.6, -0.12, -0.9);
      parts.left.hand.rotation.z = 0.35 + wave * 0.25;
      parts.right.hand.rotation.z = -0.35 - wave * 0.25;
      parts.head.rotation.z = wave * 0.05;
      setFingerPose(parts.left.hand, "open");
      setFingerPose(parts.right.hand, "open");
      break;
    case "circle-wrist":
      setEuler(parts.left.shoulder, -0.72, 0.08, 0.58);
      setEuler(parts.right.shoulder, -0.85, -0.08, -0.55);
      parts.right.hand.rotation.set(-0.2, Math.cos(time * 5) * 0.4, Math.sin(time * 5) * 0.4);
      setFingerPose(parts.right.hand, "point");
      break;
    case "knuckles":
      setEuler(parts.left.shoulder, -0.72, 0.08, 0.55);
      setEuler(parts.right.shoulder, -0.72, -0.08, -0.55);
      parts.left.hand.position.x = 0.06 + wave * 0.04;
      parts.right.hand.position.x = -0.06 - wave * 0.04;
      setFingerPose(parts.left.hand, "fist");
      setFingerPose(parts.right.hand, "fist");
      break;
    case "y-hand":
      setEuler(parts.right.shoulder, -1.15, -0.08, -0.5);
      setEuler(parts.right.elbow, -1.0, 0.0, 0.2);
      parts.right.hand.rotation.set(-0.35, 0.08, -0.25);
      setFingerPose(parts.right.hand, "y");
      break;
    case "sign":
      setEuler(parts.left.shoulder, -0.82, 0.08, 0.54);
      setEuler(parts.right.shoulder, -0.82, -0.08, -0.54);
      parts.left.hand.position.x = Math.sin(time * 4) * 0.12;
      parts.right.hand.position.x = -Math.sin(time * 4) * 0.12;
      setFingerPose(parts.left.hand, "point");
      setFingerPose(parts.right.hand, "point");
      break;
    case "spread-hands":
      setEuler(parts.left.shoulder, -0.18, 0.08, 0.85);
      setEuler(parts.right.shoulder, -0.18, -0.08, -0.85);
      setEuler(parts.left.elbow, -0.52, 0.04, -0.06);
      setEuler(parts.right.elbow, -0.52, -0.04, 0.06);
      parts.left.hand.rotation.set(0.08, 0, 0.18 + wave * 0.08);
      parts.right.hand.rotation.set(0.08, 0, -0.18 - wave * 0.08);
      setFingerPose(parts.left.hand, "flat");
      setFingerPose(parts.right.hand, "flat");
      break;
    case "flat-hand":
      setEuler(parts.right.shoulder, -0.12, -0.12, -0.75);
      setEuler(parts.right.elbow, -0.85, 0.04, 0.12);
      parts.right.hand.rotation.set(0.05, 0, -0.12 + wave * 0.06);
      setFingerPose(parts.right.hand, "flat");
      break;
    case "fingerspell": {
      const letters = (signInfo.letters || "A").toUpperCase().split("").filter((l) => /[A-Z]/.test(l));
      const letterIndex = letters.length ? Math.floor(time * 3) % letters.length : 0;
      const shape = FINGERSPELL_HANDSHAPES[letters[letterIndex]] || FINGERSPELL_HANDSHAPES.A;
      setEuler(parts.right.shoulder, -0.95, -0.08, -0.55);
      setEuler(parts.right.elbow, -0.82, 0.0, 0.12);
      parts.right.hand.rotation.set(shape.wristX, shape.wristY, shape.wristZ);
      setFingerPose(parts.right.hand, shape.pose);
      setFingerPose(parts.left.hand, "open");
      break;
    }
    case "concept-card":
      // Avatar idles naturally; the concept card overlay in React carries all the meaning.
      break;
    default:
      setEuler(parts.left.shoulder, -0.75, 0.12, 0.58);
      setEuler(parts.right.shoulder, -0.75, -0.12, -0.58);
      parts.left.hand.rotation.z = 0.3 + Math.sin(time * 8) * 0.25;
      parts.right.hand.rotation.z = -0.3 + Math.cos(time * 8) * 0.25;
      setFingerPose(parts.left.hand, "spell");
      setFingerPose(parts.right.hand, "spell");
      break;
  }
}

const BONE_ALIASES = {
  hips: ["J_Bip_C_Hips", "hips"],
  spine: ["J_Bip_C_Spine", "spine"],
  chest: ["J_Bip_C_Chest", "chest"],
  upperChest: ["J_Bip_C_UpperChest", "upperChest"],
  neck: ["J_Bip_C_Neck", "neck"],
  head: ["J_Bip_C_Head", "head"],
  leftUpperArm: ["J_Bip_L_UpperArm", "leftUpperArm"],
  leftLowerArm: ["J_Bip_L_LowerArm", "leftLowerArm", "leftForeArm"],
  leftHand: ["J_Bip_L_Hand", "leftHand"],
  rightUpperArm: ["J_Bip_R_UpperArm", "rightUpperArm"],
  rightLowerArm: ["J_Bip_R_LowerArm", "rightLowerArm", "rightForeArm"],
  rightHand: ["J_Bip_R_Hand", "rightHand"],
  leftThumbProximal: ["J_Bip_L_Thumb1", "leftThumbProximal"],
  leftThumbIntermediate: ["J_Bip_L_Thumb2", "leftThumbIntermediate"],
  leftThumbDistal: ["J_Bip_L_Thumb3", "leftThumbDistal"],
  leftIndexProximal: ["J_Bip_L_Index1", "leftIndexProximal"],
  leftIndexIntermediate: ["J_Bip_L_Index2", "leftIndexIntermediate"],
  leftIndexDistal: ["J_Bip_L_Index3", "leftIndexDistal"],
  leftMiddleProximal: ["J_Bip_L_Middle1", "leftMiddleProximal"],
  leftMiddleIntermediate: ["J_Bip_L_Middle2", "leftMiddleIntermediate"],
  leftMiddleDistal: ["J_Bip_L_Middle3", "leftMiddleDistal"],
  leftRingProximal: ["J_Bip_L_Ring1", "leftRingProximal"],
  leftRingIntermediate: ["J_Bip_L_Ring2", "leftRingIntermediate"],
  leftRingDistal: ["J_Bip_L_Ring3", "leftRingDistal"],
  leftLittleProximal: ["J_Bip_L_Little1", "leftLittleProximal"],
  leftLittleIntermediate: ["J_Bip_L_Little2", "leftLittleIntermediate"],
  leftLittleDistal: ["J_Bip_L_Little3", "leftLittleDistal"],
  rightThumbProximal: ["J_Bip_R_Thumb1", "rightThumbProximal"],
  rightThumbIntermediate: ["J_Bip_R_Thumb2", "rightThumbIntermediate"],
  rightThumbDistal: ["J_Bip_R_Thumb3", "rightThumbDistal"],
  rightIndexProximal: ["J_Bip_R_Index1", "rightIndexProximal"],
  rightIndexIntermediate: ["J_Bip_R_Index2", "rightIndexIntermediate"],
  rightIndexDistal: ["J_Bip_R_Index3", "rightIndexDistal"],
  rightMiddleProximal: ["J_Bip_R_Middle1", "rightMiddleProximal"],
  rightMiddleIntermediate: ["J_Bip_R_Middle2", "rightMiddleIntermediate"],
  rightMiddleDistal: ["J_Bip_R_Middle3", "rightMiddleDistal"],
  rightRingProximal: ["J_Bip_R_Ring1", "rightRingProximal"],
  rightRingIntermediate: ["J_Bip_R_Ring2", "rightRingIntermediate"],
  rightRingDistal: ["J_Bip_R_Ring3", "rightRingDistal"],
  rightLittleProximal: ["J_Bip_R_Little1", "rightLittleProximal"],
  rightLittleIntermediate: ["J_Bip_R_Little2", "rightLittleIntermediate"],
  rightLittleDistal: ["J_Bip_R_Little3", "rightLittleDistal"],
};

function compactName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findSceneBone(vrm, aliases) {
  const aliasSet = new Set(aliases.map(compactName));
  let found = null;

  vrm.scene.traverse((object) => {
    if (!found && aliasSet.has(compactName(object.name))) {
      found = object;
    }
  });

  return found;
}

function uniqueBones(nodes) {
  return nodes.filter((node, index) => node && nodes.indexOf(node) === index);
}

function getBone(vrm, name) {
  const aliases = BONE_ALIASES[name] || [name];
  return uniqueBones([
    vrm.humanoid?.getNormalizedBoneNode(name),
    vrm.humanoid?.getRawBoneNode(name),
    findSceneBone(vrm, aliases),
  ]);
}

function createVrmParts(vrm) {
  const bones = {
    hips: getBone(vrm, "hips"),
    spine: getBone(vrm, "spine"),
    chest: getBone(vrm, "chest"),
    upperChest: getBone(vrm, "upperChest"),
    neck: getBone(vrm, "neck"),
    head: getBone(vrm, "head"),
    leftUpperArm: getBone(vrm, "leftUpperArm"),
    leftLowerArm: getBone(vrm, "leftLowerArm"),
    leftHand: getBone(vrm, "leftHand"),
    rightUpperArm: getBone(vrm, "rightUpperArm"),
    rightLowerArm: getBone(vrm, "rightLowerArm"),
    rightHand: getBone(vrm, "rightHand"),
    leftThumbProximal: getBone(vrm, "leftThumbProximal"),
    leftThumbIntermediate: getBone(vrm, "leftThumbIntermediate"),
    leftThumbDistal: getBone(vrm, "leftThumbDistal"),
    leftIndexProximal: getBone(vrm, "leftIndexProximal"),
    leftIndexIntermediate: getBone(vrm, "leftIndexIntermediate"),
    leftIndexDistal: getBone(vrm, "leftIndexDistal"),
    leftMiddleProximal: getBone(vrm, "leftMiddleProximal"),
    leftMiddleIntermediate: getBone(vrm, "leftMiddleIntermediate"),
    leftMiddleDistal: getBone(vrm, "leftMiddleDistal"),
    leftRingProximal: getBone(vrm, "leftRingProximal"),
    leftRingIntermediate: getBone(vrm, "leftRingIntermediate"),
    leftRingDistal: getBone(vrm, "leftRingDistal"),
    leftLittleProximal: getBone(vrm, "leftLittleProximal"),
    leftLittleIntermediate: getBone(vrm, "leftLittleIntermediate"),
    leftLittleDistal: getBone(vrm, "leftLittleDistal"),
    rightThumbProximal: getBone(vrm, "rightThumbProximal"),
    rightThumbIntermediate: getBone(vrm, "rightThumbIntermediate"),
    rightThumbDistal: getBone(vrm, "rightThumbDistal"),
    rightIndexProximal: getBone(vrm, "rightIndexProximal"),
    rightIndexIntermediate: getBone(vrm, "rightIndexIntermediate"),
    rightIndexDistal: getBone(vrm, "rightIndexDistal"),
    rightMiddleProximal: getBone(vrm, "rightMiddleProximal"),
    rightMiddleIntermediate: getBone(vrm, "rightMiddleIntermediate"),
    rightMiddleDistal: getBone(vrm, "rightMiddleDistal"),
    rightRingProximal: getBone(vrm, "rightRingProximal"),
    rightRingIntermediate: getBone(vrm, "rightRingIntermediate"),
    rightRingDistal: getBone(vrm, "rightRingDistal"),
    rightLittleProximal: getBone(vrm, "rightLittleProximal"),
    rightLittleIntermediate: getBone(vrm, "rightLittleIntermediate"),
    rightLittleDistal: getBone(vrm, "rightLittleDistal"),
  };

  // Probe for model-specific isolated brow blendshapes beyond the VRM standard preset set.
  // Standard VRM only has: happy/sad/angry/surprised/relaxed/aa/ih/ou.
  // Custom models may expose browDownLeft, browOuterUpLeft, etc. for isolated brow control.
  // getExpression returns undefined for unknown names — no side effects from probing.
  const manager = vrm.expressionManager;
  const customBrow = { down: [], up: [] };
  if (manager?.getExpression) {
    const probe = (name) => manager.getExpression(name) != null;
    ["browDownLeft", "browDownRight", "brow_down_left", "brow_down_right"].forEach((n) => {
      if (probe(n)) customBrow.down.push(n);
    });
    ["browOuterUpLeft", "browOuterUpRight", "browInnerUp", "brow_outer_up_left", "browRaiserLeft", "browRaiserRight"].forEach((n) => {
      if (probe(n)) customBrow.up.push(n);
    });
    if (customBrow.down.length || customBrow.up.length) {
      console.log("[SignAvatar] Custom brow blendshapes found — isolated brow NMM active:", customBrow);
    } else {
      console.log("[SignAvatar] No custom brow blendshapes in model — using full-face presets for NMM (WH=angry, YN=surprised)");
    }
  }

  return { vrm, bones, customBrow };
}

function setBone(bones, name, x = 0, y = 0, z = 0) {
  const targets = Array.isArray(bones[name]) ? bones[name] : [bones[name]];
  targets.forEach((bone) => {
    if (bone) bone.rotation.set(x, y, z);
  });
}

function resetVrmPose(bones, time) {
  setBone(bones, "hips", 0, Math.sin(time * 0.9) * 0.02, 0);
  setBone(bones, "spine", 0.02, 0, Math.sin(time * 1.2) * 0.015);
  setBone(bones, "chest", 0.03, 0, 0);
  setBone(bones, "upperChest", 0.02, 0, 0);
  setBone(bones, "neck", 0, 0, 0);
  setBone(bones, "head", 0, 0, 0);

  setBone(bones, "leftUpperArm", 0.02, 0.02, 0.08);
  setBone(bones, "leftLowerArm", 0.04, 0.02, 0.04);
  setBone(bones, "leftHand", 0, 0, 0.02);
  setBone(bones, "rightUpperArm", 0.02, -0.02, -0.08);
  setBone(bones, "rightLowerArm", 0.04, -0.02, -0.04);
  setBone(bones, "rightHand", 0, 0, -0.02);

  setVrmFingerPose(bones, "left", "relaxed");
  setVrmFingerPose(bones, "right", "relaxed");
}

function setFingerChain(bones, side, finger, curl, spread = 0) {
  const prefix = `${side}${finger}`;
  setBone(bones, `${prefix}Proximal`, curl * 0.55, spread, 0);
  setBone(bones, `${prefix}Intermediate`, curl * 0.45, 0, 0);
  setBone(bones, `${prefix}Distal`, curl * 0.28, 0, 0);
}

function setVrmFingerPose(bones, side, pose) {
  const poses = {
    relaxed: { Thumb: 0.2, Index: 0.15, Middle: 0.16, Ring: 0.18, Little: 0.2 },
    flat: { Thumb: 0.16, Index: 0.02, Middle: 0.02, Ring: 0.03, Little: 0.05 },
    fist: { Thumb: 1.0, Index: 1.28, Middle: 1.3, Ring: 1.28, Little: 1.22 },
    point: { Thumb: 0.55, Index: 0.02, Middle: 1.2, Ring: 1.24, Little: 1.2 },
    thumb: { Thumb: -0.25, Index: 1.16, Middle: 1.18, Ring: 1.16, Little: 1.14 },
    y: { Thumb: -0.18, Index: 1.05, Middle: 1.1, Ring: 1.1, Little: 0.02 },
    spell: { Thumb: 0.35, Index: 0.22, Middle: 0.12, Ring: 0.28, Little: 0.45 },
  }[pose] || {};

  Object.entries(poses).forEach(([finger, curl], index) => {
    setFingerChain(bones, side, finger, curl, (index - 2) * 0.015);
  });
}

// mouthShape: "ou" | "aa" | "ih" | null  — NMM mouth morpheme approximation using VRM vowel presets
// customBrow: { down: string[], up: string[] } | null  — model-specific isolated brow blendshapes if detected
function applyVrmExpression(vrm, expression, time, intensity = 1, mouthShape = null, customBrow = null) {
  const manager = vrm.expressionManager;
  if (!manager) return;

  // "blink" is not a VRM1 preset — VRM1 uses "blinkLeft"/"blinkRight". Omit to avoid silent errors.
  ["happy", "sad", "angry", "surprised", "relaxed", "aa", "ih", "ou"].forEach((name) => {
    manager.setValue(name, 0);
  });
  // Also reset any custom brow blendshapes found in the model
  customBrow?.down?.forEach((n) => manager.setValue(n, 0));
  customBrow?.up?.forEach((n) => manager.setValue(n, 0));

  if (expression === "smile") manager.setValue("happy", 0.65 * intensity);
  if (expression === "soft") manager.setValue("relaxed", 0.45 * intensity);
  if (expression === "sad") manager.setValue("sad", 0.50 * intensity);   // negation NMM

  if (expression === "firm") {
    // WH-question: prefer isolated brow-down if model exposes it; fall back to full-face angry
    if (customBrow?.down?.length) {
      customBrow.down.forEach((n) => manager.setValue(n, 0.80 * intensity));
    } else {
      manager.setValue("angry", 0.55 * intensity);
    }
  }
  if (expression === "question") {
    // YN-question: prefer isolated brow-up if model exposes it; fall back to full-face surprised
    if (customBrow?.up?.length) {
      customBrow.up.forEach((n) => manager.setValue(n, 0.80 * intensity));
    } else {
      manager.setValue("surprised", 0.55 * intensity);
    }
  }

  if (expression === "focus") manager.setValue("aa", (0.08 + Math.max(0, Math.sin(time * 5)) * 0.08) * intensity);

  // NMM mouth morpheme approximation — BdSL has mouth-shape components that accompany each NMM type.
  // "ou" (pursed) for WH-questions, "aa" (open) for YN-questions, "ih" (tight) for negation.
  if (mouthShape === "ou") manager.setValue("ou", 0.30 * intensity);
  else if (mouthShape === "aa") manager.setValue("aa", 0.20 * intensity);
  else if (mouthShape === "ih") manager.setValue("ih", 0.25 * intensity);

  manager.update();
}

function lerp(a = 0, b = 0, t = 0) {
  return a + (b - a) * t;
}

function findClipFrames(clip, progress) {
  const frames = clip?.frames || [];
  if (!frames.length) return [null, null, 0];
  if (frames.length === 1) return [frames[0], frames[0], 0];

  const duration = clip.duration || frames[frames.length - 1].time || 1;
  const time = Math.max(0, Math.min(duration, progress * duration));

  let from = frames[0];
  let to = frames[frames.length - 1];

  for (let index = 0; index < frames.length - 1; index += 1) {
    if (time >= frames[index].time && time <= frames[index + 1].time) {
      from = frames[index];
      to = frames[index + 1];
      break;
    }
  }

  const span = Math.max(0.001, to.time - from.time);
  const t = Math.max(0, Math.min(1, (time - from.time) / span));
  const smoothT = t * t * (3 - 2 * t);
  return [from, to, smoothT];
}

function applyClipFrame(bones, from, to, t) {
  const names = new Set([
    ...Object.keys(from?.bones || {}),
    ...Object.keys(to?.bones || {}),
  ]);

  names.forEach((name) => {
    const a = from?.bones?.[name] || to?.bones?.[name] || [0, 0, 0];
    const b = to?.bones?.[name] || from?.bones?.[name] || [0, 0, 0];
    setBone(
      bones,
      name,
      lerp(a[0], b[0], t),
      lerp(a[1], b[1], t),
      lerp(a[2], b[2], t)
    );
  });
}

function applyClipFingers(bones, from, to, t) {
  const fingers = t < 0.5 ? from?.fingers : to?.fingers || from?.fingers;
  if (!fingers) return;

  if (fingers.left) setVrmFingerPose(bones, "left", fingers.left);
  if (fingers.right) setVrmFingerPose(bones, "right", fingers.right);
}

function applyVrmClip(parts, clip, progress, time) {
  const { bones, vrm } = parts;
  const [from, to, t] = findClipFrames(clip, progress);
  if (!from) return false;

  resetVrmPose(bones, time);
  applyClipFrame(bones, from, to, t);
  applyClipFingers(bones, from, to, t);
  applyVrmExpression(vrm, to?.expression || from.expression || "neutral", time);
  return true;
}

function applyVrmMotion(parts, signInfo, time) {
  const { bones, vrm } = parts;
  const motion = signInfo.motion;
  const wave = Math.sin(time * 7);
  const pulse = Math.sin(time * 12);

  resetVrmPose(bones, time);
  applyVrmExpression(vrm, signInfo.expression, time);

  switch (motion) {
    case "idle":
      break;
    case "wave":
      setBone(bones, "rightUpperArm", -0.05, -0.18, -1.38);
      setBone(bones, "rightLowerArm", -1.08, 0.06, -0.18);
      setBone(bones, "rightHand", 0.1, 0.12, wave * 0.55);
      setVrmFingerPose(bones, "right", "flat");
      break;
    case "chin-forward":
      setBone(bones, "rightUpperArm", 0.1, -0.28, -0.72);
      setBone(bones, "rightLowerArm", -1.2, 0.18, -0.12);
      setBone(bones, "rightHand", -0.12, 0.12, -0.2 + Math.max(0, wave) * 0.32);
      setVrmFingerPose(bones, "right", "flat");
      break;
    case "point-out":
      setBone(bones, "rightUpperArm", -0.45, -0.48, -0.82);
      setBone(bones, "rightLowerArm", -0.55, -0.08, -0.08);
      setBone(bones, "rightHand", -0.25, -0.1, -0.24);
      setVrmFingerPose(bones, "right", "point");
      break;
    case "point-self":
      setBone(bones, "rightUpperArm", 0.15, 0.2, -0.65);
      setBone(bones, "rightLowerArm", -1.15, 0.28, 0.12);
      setBone(bones, "rightHand", -0.65, 0.05, 0.25);
      setVrmFingerPose(bones, "right", "point");
      break;
    case "nod":
      setBone(bones, "head", Math.sin(time * 8) * 0.16, 0, 0);
      setVrmFingerPose(bones, "right", "fist");
      break;
    case "shake":
      setBone(bones, "head", 0, Math.sin(time * 9) * 0.22, 0);
      setVrmFingerPose(bones, "right", "point");
      break;
    case "learn":
      setBone(bones, "leftUpperArm", -0.25, 0.18, 0.78);
      setBone(bones, "leftLowerArm", -0.82, 0.02, 0.08);
      setBone(bones, "rightUpperArm", -0.2, -0.2, -0.82);
      setBone(bones, "rightLowerArm", -0.9 + Math.max(0, wave) * 0.18, 0.06, 0.18);
      setVrmFingerPose(bones, "left", "flat");
      setVrmFingerPose(bones, "right", "spell");
      break;
    case "tap-head":
    case "index-temple":
      setBone(bones, "rightUpperArm", -0.55, -0.28, -0.78);
      setBone(bones, "rightLowerArm", -1.32, -0.06, 0.28);
      setBone(bones, "rightHand", -0.25 + Math.max(0, pulse) * 0.08, 0.08, -0.16);
      setVrmFingerPose(bones, "right", "point");
      break;
    case "snap":
      setBone(bones, "rightUpperArm", -0.15, -0.18, -0.72);
      setBone(bones, "rightLowerArm", -0.98, 0.04, 0.18);
      setBone(bones, "rightHand", -0.18, 0.05, pulse > 0 ? 0.45 : -0.1);
      setVrmFingerPose(bones, "right", pulse > 0 ? "spell" : "fist");
      break;
    case "thumbs":
      setBone(bones, "rightUpperArm", 0.04, -0.08, -0.72);
      setBone(bones, "rightLowerArm", -0.86, 0.02, 0.2);
      setBone(bones, "rightHand", -0.6, 0, -0.12);
      setVrmFingerPose(bones, "right", "thumb");
      break;
    case "thumbs-down":
      setBone(bones, "rightUpperArm", 0.16, -0.08, -0.68);
      setBone(bones, "rightLowerArm", -0.72, 0.02, 0.2);
      setBone(bones, "rightHand", 1.45, 0, -0.12);
      setVrmFingerPose(bones, "right", "thumb");
      break;
    case "lift":
      setBone(bones, "leftUpperArm", -0.2, 0.08, 0.72);
      setBone(bones, "rightUpperArm", -0.2, -0.08, -0.72);
      setBone(bones, "leftLowerArm", -0.62 + Math.max(0, wave) * 0.2, 0, -0.08);
      setBone(bones, "rightLowerArm", -0.62 + Math.max(0, wave) * 0.2, 0, 0.08);
      setVrmFingerPose(bones, "left", "fist");
      setVrmFingerPose(bones, "right", "flat");
      break;
    case "circle-chest":
    case "fist-circle":
      setBone(bones, "rightUpperArm", 0.05, -0.18, -0.65);
      setBone(bones, "rightLowerArm", -1.0, Math.sin(time * 5) * 0.18, 0.22);
      setBone(bones, "rightHand", -0.25, Math.cos(time * 5) * 0.28, -0.18);
      setVrmFingerPose(bones, "right", motion === "fist-circle" ? "fist" : "flat");
      break;
    case "shrug":
    case "waggle":
      setBone(bones, "leftUpperArm", -0.12, 0.18, 1.05);
      setBone(bones, "rightUpperArm", -0.12, -0.18, -1.05);
      setBone(bones, "leftHand", 0.1, 0, 0.28 + wave * 0.2);
      setBone(bones, "rightHand", 0.1, 0, -0.28 - wave * 0.2);
      setBone(bones, "head", 0.02, 0, wave * 0.05);
      break;
    case "circle-wrist":
      setBone(bones, "rightUpperArm", -0.14, -0.18, -0.72);
      setBone(bones, "rightLowerArm", -0.95, 0.03, 0.2);
      setBone(bones, "rightHand", -0.15, Math.cos(time * 5) * 0.36, Math.sin(time * 5) * 0.36);
      setVrmFingerPose(bones, "right", "point");
      break;
    case "knuckles":
      setBone(bones, "leftUpperArm", -0.12, 0.1, 0.72);
      setBone(bones, "rightUpperArm", -0.12, -0.1, -0.72);
      setBone(bones, "leftLowerArm", -0.88, 0.08 + wave * 0.08, -0.04);
      setBone(bones, "rightLowerArm", -0.88, -0.08 - wave * 0.08, 0.04);
      setVrmFingerPose(bones, "left", "fist");
      setVrmFingerPose(bones, "right", "fist");
      break;
    case "y-hand":
      setBone(bones, "rightUpperArm", -0.5, -0.12, -0.68);
      setBone(bones, "rightLowerArm", -1.05, 0.04, 0.22);
      setBone(bones, "rightHand", -0.2, 0.08, -0.18);
      setVrmFingerPose(bones, "right", "y");
      break;
    case "sign":
      setBone(bones, "leftUpperArm", -0.22, 0.12, 0.72);
      setBone(bones, "rightUpperArm", -0.22, -0.12, -0.72);
      setBone(bones, "leftLowerArm", -0.9, Math.sin(time * 4) * 0.16, 0.04);
      setBone(bones, "rightLowerArm", -0.9, -Math.sin(time * 4) * 0.16, -0.04);
      setVrmFingerPose(bones, "left", "point");
      setVrmFingerPose(bones, "right", "point");
      break;
    case "spread-hands":
      setBone(bones, "leftUpperArm", -0.18, 0.08, 0.85);
      setBone(bones, "rightUpperArm", -0.18, -0.08, -0.85);
      setBone(bones, "leftLowerArm", -0.52, 0.04, -0.06);
      setBone(bones, "rightLowerArm", -0.52, -0.04, 0.06);
      setBone(bones, "leftHand", 0.08, 0, 0.18 + wave * 0.08);
      setBone(bones, "rightHand", 0.08, 0, -0.18 - wave * 0.08);
      setVrmFingerPose(bones, "left", "flat");
      setVrmFingerPose(bones, "right", "flat");
      break;
    case "flat-hand":
      setBone(bones, "rightUpperArm", -0.12, -0.12, -0.75);
      setBone(bones, "rightLowerArm", -0.85, 0.04, 0.12);
      setBone(bones, "rightHand", 0.05, 0, -0.12 + wave * 0.06);
      setVrmFingerPose(bones, "right", "flat");
      break;
    case "fingerspell": {
      const letters = (signInfo.letters || "A").toUpperCase().split("").filter((l) => /[A-Z]/.test(l));
      const letterIndex = letters.length ? Math.floor(time * 3) % letters.length : 0;
      const shape = FINGERSPELL_HANDSHAPES[letters[letterIndex]] || FINGERSPELL_HANDSHAPES.A;
      setBone(bones, "rightUpperArm", -0.55, -0.18, -0.68);
      setBone(bones, "rightLowerArm", -0.88, 0.0, 0.12);
      setBone(bones, "rightHand", shape.wristX, shape.wristY, shape.wristZ);
      setVrmFingerPose(bones, "right", shape.pose);
      setVrmFingerPose(bones, "left", "relaxed");
      break;
    }
    case "concept-card":
      // Avatar idles naturally; the concept card overlay in React carries all the meaning.
      break;
    default:
      setBone(bones, "rightUpperArm", -0.08, -0.2, -0.48);
      setBone(bones, "rightLowerArm", -0.72, Math.cos(time * 8) * 0.08, 0.12);
      setBone(bones, "rightHand", -0.12, Math.sin(time * 8) * 0.12, -0.08);
      setVrmFingerPose(bones, "left", "relaxed");
      setVrmFingerPose(bones, "right", "spell");
      break;
  }
}

// Development-time invariant: all motion strings declared in SIGN_MOTIONS must be implemented.
if (process.env.NODE_ENV !== "production") {
  const IMPLEMENTED_MOTIONS = new Set([
    "idle", "wave", "chin-forward", "point-out", "point-self", "nod", "shake",
    "learn", "tap-head", "index-temple", "snap", "thumbs", "thumbs-down", "lift",
    "circle-chest", "fist-circle", "shrug", "waggle", "circle-wrist", "knuckles",
    "y-hand", "sign", "spread-hands", "flat-hand", "concept-card", "fingerspell",
  ]);
  Object.entries(SIGN_MOTIONS).forEach(([word, info]) => {
    if (!IMPLEMENTED_MOTIONS.has(info.motion)) {
      console.warn(`[SignAvatar] Unimplemented motion "${info.motion}" for word "${word}"`);
    }
  });
}

function fitVrmToScene(vrm) {
  const box = new THREE.Box3().setFromObject(vrm.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetHeight = 2.45;
  const scale = size.y ? targetHeight / size.y : 1;
  vrm.scene.scale.setScalar(scale);
  vrm.scene.position.set(-center.x * scale, -box.min.y * scale - 1.18, -center.z * scale);
}

// sentenceNMM is a structured object { type, wordIndex, headY } from computeNMM.
// effectiveNMM is already pre-filtered for word onset by the parent SignAvatar component.
function SignAvatar3D({ signInfo, signClip, wordProgress, active, activeNMM, snapToSign }) {
  const canvasRef = useRef(null);
  const vrmPartsRef = useRef(null);
  const fallbackPartsRef = useRef(null);
  const signInfoRef = useRef(signInfo);
  const signClipRef = useRef(signClip);
  const wordProgressRef = useRef(wordProgress);
  const activeRef = useRef(active);
  const activeNMMRef = useRef(activeNMM);
  const snapRef = useRef(snapToSign);

  useEffect(() => {
    signInfoRef.current = signInfo;
    signClipRef.current = signClip;
    wordProgressRef.current = wordProgress;
    activeRef.current = active;
    activeNMMRef.current = activeNMM;
    snapRef.current = snapToSign;
  }, [signInfo, signClip, wordProgress, active, activeNMM, snapToSign]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#020617", 4.2, 8);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0.62, 4.3);
    camera.lookAt(0, 0.62, 0);

    const keyLight = new THREE.DirectionalLight("#ffffff", 3.2);
    keyLight.position.set(2.5, 3.5, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    scene.add(new THREE.HemisphereLight("#c7d2fe", "#0f172a", 1.8));

    const rim = new THREE.PointLight("#00d4ff", 2.2, 6);
    rim.position.set(-2, 1.8, 1.5);
    scene.add(rim);

    // Gaze target — the avatar's eyes track this Object3D via vrm.lookAt.
    // Repositioned each frame based on NMM context to signal grammatical meaning through gaze.
    const gazeTarget = new THREE.Object3D();
    gazeTarget.position.set(0, 0.55, 3.5);
    scene.add(gazeTarget);
    // Persistent Vector3 reused each frame to avoid per-frame allocation.
    const gazeCurrentPos = new THREE.Vector3(0, 0.55, 3.5);

    function createFallbackAvatar() {
      if (fallbackPartsRef.current) return;
      const fallback = createAvatar();
      fallback.group.position.y = -0.1;
      scene.add(fallback.group);
      fallbackPartsRef.current = fallback;
    }

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      VRM_MODEL_URL,
      (gltf) => {
        try {
          const vrm = gltf.userData.vrm;
          if (!vrm) throw new Error("No VRM data found in file");

          VRMUtils.removeUnnecessaryVertices(vrm.scene);
          VRMUtils.combineSkeletons(vrm.scene);
          VRMUtils.rotateVRM0(vrm);

          fitVrmToScene(vrm);
          vrm.scene.traverse((object) => {
            object.frustumCulled = false;
            if (object.isMesh || object.isSkinnedMesh) {
              object.castShadow = true;
              object.receiveShadow = true;
            }
          });

          scene.add(vrm.scene);
          vrmPartsRef.current = createVrmParts(vrm);
          // Wire eye gaze: set gazeTarget as the lookAt target so vrm.update() tracks it each frame.
          // vrm.lookAt is null if the model has no lookAt section — guard required.
          if (vrm.lookAt) {
            vrm.lookAt.target = gazeTarget;
          }
        } catch (error) {
          console.error("VRM setup failed:", error);
          createFallbackAvatar();
        }
      },
      undefined,
      (error) => {
        console.error(`Could not load ${VRM_MODEL_URL}:`, error);
        createFallbackAvatar();
      }
    );

    const clock = new THREE.Clock();
    let frameId = 0;

    // Cross-sign transition state — closure vars, not refs, to avoid React overhead.
    // Transition lerps bone rotations from the previous sign's end pose to the new sign's
    // target pose over TRANSITION_DURATION seconds, eliminating hard-cut teleports.
    let prevAnimTime = 0;
    let transitionActive = false;
    let transitionElapsed = 0;
    const TRANSITION_DURATION = 0.1; // 100 ms
    const TRANSITION_BONES = [
      "leftUpperArm", "leftLowerArm", "leftHand",
      "rightUpperArm", "rightLowerArm", "rightHand",
      "head",
    ];
    // NMM fade-in: ramp expression 0→full over 200ms instead of snapping instantly.
    let nmmActiveSince = null;  // clock.getElapsedTime() when current NMM type began
    let prevNMMType = "neutral";
    const NMM_FADE_DURATION = 0.2; // seconds
    let prevBoneSnapshot = {};
    let prevMotionKey = null;

    function resize() {
      const { clientWidth, clientHeight } = canvas;
      const width = Math.max(1, clientWidth);
      const height = Math.max(1, clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      resize();

      const time = clock.getElapsedTime();
      // Compute true frame delta from elapsed time — clock.getDelta() after
      // clock.getElapsedTime() returns ~0 because getElapsedTime calls getDelta internally.
      const frameDelta = Math.min(0.1, prevAnimTime === 0 ? 0.016 : time - prevAnimTime);
      prevAnimTime = time;

      const info = activeRef.current ? signInfoRef.current : {
        motion: "idle",
        color: "#64748b",
        expression: "neutral",
      };
      const clip = activeRef.current ? signClipRef.current : null;
      const progress = wordProgressRef.current || 0;

      rim.color.set(info.color);
      const vrmParts = vrmPartsRef.current;
      const fallbackParts = fallbackPartsRef.current;

      // Hoist NMM state — used by both VRM path and gaze update below.
      const nmm = activeNMMRef.current;
      const nmmType = nmm?.type ?? "neutral";

      // Eye gaze: reposition gazeTarget each frame so vrm.lookAt tracks meaningful positions.
      // WH → slight down-right (thinking), YN → direct at camera (engaging),
      // negation → slight left (assertive), idle → slow drift, neutral signing → audience position.
      if (vrmParts?.vrm?.lookAt) {
        const isActive = activeRef.current;
        let tx, ty, tz;
        if (!isActive) {
          tx = Math.sin(time * 0.4) * 0.25;
          ty = 0.62 + Math.sin(time * 0.3) * 0.08;
          tz = 4.0;
        } else if (nmmType === "yn-question") {
          tx = 0; ty = 0.62; tz = 4.3;         // direct at camera — engaging the viewer
        } else if (nmmType === "wh-question") {
          tx = 0.18; ty = 0.28; tz = 3.0;      // down-right — thinking/searching
        } else if (nmmType === "negation") {
          tx = -0.3; ty = 0.50; tz = 3.5;      // slight left — assertive away-gaze
        } else {
          tx = 0; ty = 0.50; tz = 3.5;         // neutral signing — audience position
        }
        gazeCurrentPos.lerp({ x: tx, y: ty, z: tz }, 0.05);
        gazeTarget.position.copy(gazeCurrentPos);
      }

      if (vrmParts) {
        // Detect sign change by tracking motion + clip presence as a compound key.
        // On change: snapshot current bone state (= end of previous sign) so the
        // transition lerp knows where to blend from.
        const motionKey = info.motion + (clip ? ":clip" : "");
        if (activeRef.current && prevMotionKey !== null && motionKey !== prevMotionKey) {
          if (snapRef.current) {
            // Arrived late into a word window — skip blend and snap directly to target pose.
            transitionActive = false;
          } else {
            const snapshot = {};
            TRANSITION_BONES.forEach((name) => {
              const boneArr = Array.isArray(vrmParts.bones[name])
                ? vrmParts.bones[name]
                : [vrmParts.bones[name]];
              const bone = boneArr.find((b) => b);
              if (bone) snapshot[name] = [bone.rotation.x, bone.rotation.y, bone.rotation.z];
            });
            prevBoneSnapshot = snapshot;
            transitionActive = true;
            transitionElapsed = 0;
          }
        }
        prevMotionKey = motionKey;

        // Apply current sign motion — this sets bones to the target pose.
        if (!clip || !applyVrmClip(vrmParts, clip, progress, time)) {
          applyVrmMotion(vrmParts, info, time);
        }

        // Cross-sign transition: lerp from the snapshotted previous pose toward the
        // target pose computed above. smoothstep(t) gives ease-in/out feel.
        if (transitionActive) {
          transitionElapsed += frameDelta;
          const t = Math.min(1, transitionElapsed / TRANSITION_DURATION);
          const smoothT = t * t * (3 - 2 * t);
          if (t >= 1) {
            transitionActive = false;
          } else {
            TRANSITION_BONES.forEach((name) => {
              const prev = prevBoneSnapshot[name];
              if (!prev) return;
              const boneArr = Array.isArray(vrmParts.bones[name])
                ? vrmParts.bones[name]
                : [vrmParts.bones[name]];
              boneArr.forEach((bone) => {
                if (!bone) return;
                bone.rotation.x = prev[0] + (bone.rotation.x - prev[0]) * smoothT;
                bone.rotation.y = prev[1] + (bone.rotation.y - prev[1]) * smoothT;
                bone.rotation.z = prev[2] + (bone.rotation.z - prev[2]) * smoothT;
              });
            });
          }
        }

        // NMM (Non-Manual Markers): grammar-driven overrides applied AFTER per-sign motion.
        // Uses pre-filtered activeNMM (word-onset already applied by parent component).
        // WH: furrow brows ("firm") + pursed mouth ("ou") + thinking gaze (down-right)
        // YN: raise brows ("question") + open mouth ("aa") + engaging gaze (at camera)
        // Negation: sad + tight mouth ("ih") + assertive gaze (left) + head-shake
        // Expression ramps 0→full over NMM_FADE_DURATION (200ms) — natural onset.
        // nmmType hoisted above (shared with gaze update).

        if (nmmType !== prevNMMType) {
          nmmActiveSince = nmmType !== "neutral" ? time : null;
          prevNMMType = nmmType;
        }
        const nmmIntensity = nmmType !== "neutral" && nmmActiveSince !== null
          ? Math.min(1, (time - nmmActiveSince) / NMM_FADE_DURATION)
          : 0;

        const cb = vrmParts.customBrow;
        if (nmmType === "wh-question") {
          applyVrmExpression(vrmParts.vrm, "firm", time, nmmIntensity, "ou", cb);
        } else if (nmmType === "yn-question") {
          applyVrmExpression(vrmParts.vrm, "question", time, nmmIntensity, "aa", cb);
        } else if (nmmType === "negation") {
          applyVrmExpression(vrmParts.vrm, "sad", time, nmmIntensity, "ih", cb);
          setBone(vrmParts.bones, "head", 0, Math.sin(time * 9) * (nmm.headY ?? 0.22), 0);
        }

        if (!activeRef.current) {
          setBone(vrmParts.bones, "head", 0, Math.sin(time * 0.9) * 0.08, 0);
        }
        vrmParts.vrm.update(frameDelta);
      } else if (fallbackParts) {
        // NMM for fallback avatar — same grammar rules, using expression + head rotation
        // nmmType hoisted above (shared with gaze update).
        const nmmExpression =
          nmmType === "wh-question" ? "firm"     // brow-down furrow (angry)
          : nmmType === "yn-question" ? "question" // brow-up raise (surprised)
          : nmmType === "negation" ? "sad"         // droop — visually distinct from WH
          : info.expression;

        applyExpression(fallbackParts, nmmExpression, time);
        applyMotion(fallbackParts, info, time);

        if (nmmType === "negation") {
          fallbackParts.head.rotation.y = Math.sin(time * 9) * (nmm?.headY ?? 0.22);
        }

        if (!activeRef.current) {
          fallbackParts.group.rotation.y = Math.sin(time * 0.8) * 0.08;
          fallbackParts.head.rotation.y = Math.sin(time * 0.9) * 0.08;
        }
      }

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

  return <canvas ref={canvasRef} className="avatar-canvas" aria-label="3D signing avatar" />;
}

const NEUTRAL_NMM = { type: "neutral", wordIndex: -1, headY: 0 };

// playbackSpeed < 1 activates learning mode: word timing windows are stretched so the
// avatar signs slower than the video — driven by applySlowPlayback from timelineScheduler.
export default function SignAvatar({ caption, isActive, currentTime = 0, sentenceNMM = NEUTRAL_NMM, playbackSpeed = 1.0 }) {
  const [signClip, setSignClip] = useState(null);

  // Word timing via resolveSignState (single source of truth in timelineScheduler).
  // Phase A: syllable-weighted approximation. Phase B: WhisperX timestamps.
  // isCatchingUp is true when we arrive in the last 35% of a word's window —
  // SignAvatar3D will snap instead of blend, so the avatar never lags visibly.
  const { wordIndex, wordProgress, isCatchingUp } = useMemo(() => {
    if (!caption || !isActive || (caption?.words ?? []).length === 0) {
      return { wordIndex: 0, wordProgress: 0, isCatchingUp: false };
    }
    const { wordIndex, wordProgress, isCatchingUp } = resolveSignState(
      caption,
      currentTime * 1000,
      playbackSpeed
    );
    return { wordIndex, wordProgress, isCatchingUp };
  }, [caption, currentTime, isActive, playbackSpeed]);

  const words = caption?.words ?? [];

  const currentWord = words[wordIndex] || "";
  const signInfo = getSignInfo(currentWord);
  const isConceptCard = signInfo.motion === "concept-card" && !!currentWord && isActive;
  const isFingerspell = signInfo.motion === "fingerspell" && !!currentWord && isActive;
  const fsLetters = isFingerspell
    ? (signInfo.letters || "").split("").filter((l) => /[A-Z0-9]/.test(l))
    : [];
  const fsLetterIdx =
    fsLetters.length > 0
      ? Math.min(fsLetters.length - 1, Math.floor(wordProgress * fsLetters.length))
      : 0;

  // Resolve word-onset NMM: only activate once avatar reaches the triggering word.
  // effectiveNMM neutralizes the NMM until currentWordIndex >= nmm.wordIndex.
  const activeNMM = useMemo(
    () => effectiveNMM(sentenceNMM, wordIndex),
    [sentenceNMM, wordIndex]
  );

  useEffect(() => {
    let cancelled = false;
    setSignClip(null);

    if (!currentWord || !isActive) return undefined;

    loadSignClip(currentWord).then((clip) => {
      if (!cancelled) setSignClip(clip);
    });

    return () => {
      cancelled = true;
    };
  }, [currentWord, isActive]);

  // Preload all clips for the incoming caption so word transitions are instant.
  // loadSignClip is cache-first — duplicate calls are no-ops once cached.
  useEffect(() => {
    if (!caption?.words?.length) return;
    caption.words.forEach((word) => {
      if (word) loadSignClip(word);
    });
  }, [caption]);

  return (
    <div className="sign-avatar">
      <div className={`avatar-stage ${isActive ? "active" : "idle"}`}>
        <SignAvatar3D
          signInfo={signInfo}
          signClip={isConceptCard ? null : signClip}
          wordProgress={wordProgress}
          active={!!isActive}
          activeNMM={activeNMM}
          snapToSign={isCatchingUp}
        />
        {isConceptCard && (
          <div className="concept-card glass fade-in-up">
            <span className="concept-card-word">{displayGlossWord(currentWord)}</span>
            <span className="concept-card-subtitle">
              {caption?.conceptExplanations?.[signInfo.label] || "No established BdSL sign"}
            </span>
          </div>
        )}
        {isFingerspell && (
          <div className="fingerspell-ticker glass fade-in-up">
            <span className="fingerspell-label">Fingerspelling</span>
            <div className="fingerspell-letters">
              {fsLetters.map((letter, i) => (
                <span
                  key={i}
                  className={`fingerspell-letter ${i === fsLetterIdx ? "active" : ""}`}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="avatar-depth-grid" />
      </div>

      {!isActive ? (
        <p className="idle-label">Waiting for processed captions...</p>
      ) : (
        <>
          <div className="word-indicator" style={{ borderColor: signInfo.color }}>
            <span className="word-text" style={{ color: signInfo.color }}>
              {displayGlossWord(currentWord) || "..."}
            </span>
            <span className="motion-text">{signInfo.label}</span>
            {activeNMM.type !== "neutral" && (
              <span className="nmm-badge" title={`NMM: ${activeNMM.type}`}>
                {activeNMM.type === "wh-question" ? "WH" : activeNMM.type === "yn-question" ? "YN" : "NEG"}
              </span>
            )}
          </div>

          {words.length > 1 && (
            <div className="word-progress">
              {words.map((word, index) => (
                <div
                  key={`${word}-${index}`}
                  className={`word-dot ${index === wordIndex ? "active" : ""} ${
                    index < wordIndex ? "done" : ""
                  }`}
                  title={displayGlossWord(word)}
                />
              ))}
            </div>
          )}

          <div className="gloss-display">
            {words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className={`gloss-word ${index === wordIndex ? "active" : ""} ${
                  index < wordIndex ? "done" : ""
                }`}
              >
                {displayGlossWord(word)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
