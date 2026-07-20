import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import MOCAP_CLIPS from "./mocapClips";
import { isBanglaGesture } from "../services/banglaAlphabet";
import "./MixamoAvatar.css";

const MODEL_URL = "/models/mixamo/Ch09_nonPBR.fbx";
const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

// Loops a real captured curl curve (see mocapClips.js) over its own real
// duration and linearly interpolates between the 24 captured samples.
function sampleMocapCurl(samples, phase) {
  const t = ((phase % 1) + 1) % 1;
  const pos = t * (samples.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, samples.length - 1);
  const frac = pos - lo;
  return samples[lo] * (1 - frac) + samples[hi] * frac;
}

// Applies real mocap-captured curl for (gesture, side) if we have it, looped at
// the real signer's own pace; otherwise falls back to the static hand-authored
// handshape. Either way, spread/thumbMode still come from `fallbackShape` — mocap
// only supplies real curl, not the full handshape recipe.
function applyMocapOrHandshape(rig, side, gesture, fallbackShape, time, overrides = {}) {
  const clip = MOCAP_CLIPS[gesture]?.[side];
  if (!clip) {
    applyHandshape(rig, side, fallbackShape, overrides);
    return;
  }
  const phase = time / clip.seconds;
  applyHandshape(rig, side, fallbackShape, {
    thumb: sampleMocapCurl(clip.Thumb, phase),
    index: sampleMocapCurl(clip.Index, phase),
    middle: sampleMocapCurl(clip.Middle, phase),
    ring: sampleMocapCurl(clip.Ring, phase),
    pinky: sampleMocapCurl(clip.Pinky, phase),
    ...overrides,
  });
}

const HANDSHAPES = {
  relaxed: { thumb: 0.22, index: 0.12, middle: 0.16, ring: 0.2, pinky: 0.24 },
  open: { thumb: 0.08, index: 0, middle: 0, ring: 0, pinky: 0 },
  a: { thumb: 0.16, index: 1, middle: 1, ring: 1, pinky: 1 },
  b: { thumb: 0.34, index: 0, middle: 0, ring: 0, pinky: 0, thumbMode: "across" },
  d: { thumb: 0.46, index: 0, middle: 0.92, ring: 1, pinky: 1, thumbMode: "across" },
  e: { thumb: 0.48, index: 0.82, middle: 0.84, ring: 0.86, pinky: 0.88, thumbMode: "under" },
  fist: { thumb: 0.72, index: 1, middle: 1, ring: 1, pinky: 1, thumbMode: "across" },
  point: { thumb: 0.55, index: 0, middle: 1, ring: 1, pinky: 1, thumbMode: "across" },
  two: { thumb: 0.58, index: 0, middle: 0, ring: 1, pinky: 1, thumbMode: "across" },
  three: { thumb: 0.04, index: 0, middle: 0, ring: 1, pinky: 1, number: true },
  four: { thumb: 0.78, index: 0, middle: 0, ring: 0, pinky: 0, thumbMode: "across" },
  five: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
  zero: {
    thumb: 0.34,
    index: 0.42,
    middle: 0.44,
    ring: 0.46,
    pinky: 0.48,
    number: true,
    thumbContact: "zero",
    spread: { Thumb: -0.08, Index: -0.08, Middle: -0.02, Ring: 0.04, Pinky: 0.1 },
  },
  // Number forms deliberately keep their open fingers separated in a front view.
  // They are separate from alphabet forms because ASL number readability depends
  // on the thumb placement and a clean silhouette, not only the finger count.
  numberOne: { thumb: 0.72, index: 0, middle: 1, ring: 1, pinky: 1, thumbMode: "across", number: true },
  numberTwo: { thumb: 0.66, index: 0, middle: 0, ring: 1, pinky: 1, thumbMode: "across", number: true },
  numberThree: { thumb: 0.03, index: 0, middle: 0, ring: 1, pinky: 1, number: true },
  numberFour: { thumb: 0.78, index: 0, middle: 0, ring: 0, pinky: 0, thumbMode: "across", number: true },
  numberFive: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0, number: true },
  six: {
    thumb: 0.4,
    index: 0,
    middle: 0,
    ring: 0,
    pinky: 0.52,
    number: true,
    thumbContact: "six",
    spread: { Thumb: 0.14, Index: -0.1, Middle: -0.03, Ring: 0.04, Pinky: 0.02 },
  },
  seven: {
    thumb: 0.4,
    index: 0,
    middle: 0,
    ring: 0.62,
    pinky: 0,
    number: true,
    thumbContact: "seven",
    spread: { Thumb: 0.07, Index: -0.1, Middle: -0.03, Ring: 0.02, Pinky: 0.1 },
  },
  eight: {
    thumb: 0.4,
    index: 0,
    middle: 0.62,
    ring: 0,
    pinky: 0,
    number: true,
    thumbContact: "eight",
    spread: { Thumb: 0, Index: -0.1, Middle: -0.02, Ring: 0.04, Pinky: 0.1 },
  },
  nine: {
    thumb: 0.4,
    index: 0.56,
    middle: 0,
    ring: 0,
    pinky: 0,
    number: true,
    thumbContact: "nine",
    spread: { Thumb: -0.08, Index: -0.04, Middle: -0.03, Ring: 0.04, Pinky: 0.1 },
  },
  y: { thumb: 0, index: 1, middle: 1, ring: 1, pinky: 0 },
  l: { thumb: 0, index: 0, middle: 1, ring: 1, pinky: 1 },
  c: { thumb: 0.28, index: 0.38, middle: 0.38, ring: 0.42, pinky: 0.5 },
  o: { thumb: 0.44, index: 0.5, middle: 0.5, ring: 0.52, pinky: 0.58 },
  f: {
    thumb: 0.38,
    index: 0.62,
    middle: 0,
    ring: 0,
    pinky: 0,
    thumbContact: "f",
    spread: { Thumb: -0.08, Index: -0.04, Middle: -0.03, Ring: 0.04, Pinky: 0.1 },
  },
  i: { thumb: 0.7, index: 1, middle: 1, ring: 1, pinky: 0, thumbMode: "across" },
  m: { thumb: 0.36, index: 0.94, middle: 0.94, ring: 0.94, pinky: 1, thumbMode: "underThree" },
  n: { thumb: 0.38, index: 0.94, middle: 0.94, ring: 1, pinky: 1, thumbMode: "underTwo" },
  s: { thumb: 0.62, index: 1, middle: 1, ring: 1, pinky: 1, thumbMode: "under" },
  t: { thumb: 0.35, index: 0.98, middle: 0.95, ring: 1, pinky: 1, thumbMode: "betweenIndexMiddle" },
  x: { thumb: 0.62, index: 0.58, middle: 1, ring: 1, pinky: 1, thumbMode: "across" },
  r: { thumb: 0.62, index: 0, middle: 0, ring: 1, pinky: 1, cross: true, thumbMode: "across" },
  k: { thumb: 0.08, index: 0, middle: 0, ring: 1, pinky: 1, split: true },
  thumbUp: { thumb: 0, index: 1, middle: 1, ring: 1, pinky: 1 },
};

const LETTER_SHAPES = {
  A: "a", B: "b", C: "c", D: "d", E: "e", F: "f",
  G: "point", H: "two", I: "i", J: "i", K: "k", L: "l",
  M: "m", N: "n", O: "o", P: "k", Q: "point", R: "r",
  S: "s", T: "t", U: "two", V: "two", W: "three", X: "x",
  Y: "y", Z: "point",
};

const NUMBER_SHAPES = {
  "0": "zero", "1": "numberOne", "2": "numberTwo", "3": "numberThree", "4": "numberFour",
  "5": "numberFive", "6": "six", "7": "seven", "8": "eight", "9": "nine",
};

// Calibrated against Ch09_nonPBR.fbx. Each pose stores local Euler deltas for
// [upper arm, forearm], keeping both hands in front of the body instead of relying on
// generic Mixamo axis assumptions that vary between FBX exports.
const ARM_POSES = {
  restLeft: {
    upper: [-1.25196, 0.65649, 1.67241],
    lower: [0.69361, -0.8422, 1.10181],
  },
  restRight: {
    upper: [-2.41954, -0.31375, -2.13869],
    lower: [-1.43009, 1.63122, 0.75909],
  },
  centerLeft: {
    upper: [-1.6819, 0.43442, 1.58259],
    lower: [-0.761, -0.19455, 0.06744],
  },
  centerRight: {
    upper: [1.55587, 0.26908, -1.66701],
    lower: [0.72002, 0.15932, 0.41531],
  },
  forwardRight: {
    upper: [0.50641, 0.14351, -1.42202],
    lower: [-1.65482, -1.44128, -2.18105],
  },
  highRight: {
    upper: [-0.16055, 0.40279, -1.12564],
    lower: [0.4878, 1.1671, -0.55847],
  },
  helpLeft: {
    upper: [-1.8365, 0.26948, 1.62203],
    lower: [-0.718, -0.99272, 0.13941],
  },
  helpRight: {
    upper: [1.81866, 0.27034, -1.83316],
    lower: [-0.78667, 0.87106, 1.90025],
  },
  displayRight: {
    upper: [1.03, 0.32, -1.36],
    lower: [-0.1, 0.24, -0.38],
  },
};

const WRIST_POSES = {
  highRight: [0.02, 0.04, 0.12],
  displayRight: [0.08, -0.12, -0.08],
  centerRight: [0.77562, -0.39664, -1.63696],
  centerLeft: [-0.95641, -0.12687, 1.63146],
  forwardRight: [-0.30317, 0.59282, 0.30059],
  helpLeft: [-0.55973, 0.26864, -0.50865],
  helpRight: [-1.43452, -2.69908, -2.3862],
};

// Dedicated BdSL manual-alphabet poses based on the chart supplied for this
// project. Unlike the one-handed ASL alphabet above, many Bangla letters use
// both hands and contact between a pointing/curved hand and an open palm.
const BANGLA_HAND_POSES = {
  BN_AW: {
    left: { arm: "centerLeft", wrist: [-0.66, -0.12, 1.34], shape: "open" },
    right: { arm: "centerRight", wrist: [0.7, 0.16, -1.24], shape: "open" },
    motion: "tap",
  },
  BN_AA: {
    left: { arm: "centerLeft", wrist: [-0.7, -0.16, 1.36], shape: "open" },
    right: { arm: "centerRight", wrist: [0.58, 0.06, -1.42], shape: "two" },
    motion: "tap",
  },
  BN_I: {
    left: { arm: "centerLeft", wrist: [-0.62, -0.12, 1.28], shape: "open" },
    right: { arm: "centerRight", wrist: [0.82, 0.08, -1.18], shape: "open" },
    motion: "slide",
  },
  BN_U: {
    left: { arm: "centerLeft", wrist: [-0.42, -0.3, 1.08], shape: "two" },
    right: { arm: "centerRight", wrist: [0.42, 0.3, -1.08], shape: "two" },
    motion: "tap",
  },
  BN_E: {
    left: { arm: "centerLeft", wrist: [-0.48, -0.28, 1.12], shape: "c" },
    right: { arm: "centerRight", wrist: [0.48, 0.28, -1.12], shape: "c" },
    motion: "tap",
  },
  BN_O: {
    left: { arm: "centerLeft", wrist: [-0.44, -0.24, 1.08], shape: "f" },
    right: { arm: "centerRight", wrist: [0.44, 0.24, -1.08], shape: "f" },
    motion: "twist",
  },
  BN_KA: {
    right: { arm: "displayRight", wrist: [0.08, -0.16, -0.08], shape: "c" },
  },
  BN_KHA: {
    left: { arm: "centerLeft", wrist: [-0.52, -0.24, 1.2], shape: "c" },
    right: { arm: "displayRight", wrist: [0.08, -0.76, 0.04], shape: "point" },
    motion: "tap",
  },
  BN_GA: {
    left: { arm: "centerLeft", wrist: [-0.2, -0.18, 1.46], shape: "point" },
    right: { arm: "displayRight", wrist: [0.08, -0.78, 0.02], shape: "point" },
    motion: "tap",
  },
  BN_GHA: {
    right: { arm: "displayRight", wrist: [0.08, -0.1, -0.08], shape: "o" },
    motion: "twist",
  },
  BN_CA: {
    left: { arm: "centerLeft", wrist: [-0.14, -0.76, 1.5], shape: "point" },
    right: { arm: "displayRight", wrist: [0.14, -0.22, 1.2], shape: "point" },
    motion: "tap",
  },
  BN_CHA: {
    left: { arm: "centerLeft", wrist: [-0.1, -0.72, 1.44], shape: "l" },
    right: { arm: "displayRight", wrist: [0.08, -0.2, 1.3], shape: "l" },
    motion: "slide",
  },
  BN_JA: {
    left: { arm: "centerLeft", wrist: [-0.46, -0.26, 1.12], shape: "c" },
    right: { arm: "centerRight", wrist: [0.46, 0.26, -1.12], shape: "c" },
    motion: "twist",
  },
  BN_JHA: {
    left: { arm: "centerLeft", wrist: [-0.16, -0.14, 1.5], shape: "open" },
    right: { arm: "displayRight", wrist: [0.18, -0.42, 0.74], shape: "f" },
    motion: "slide",
  },
  BN_TTA: {
    left: { arm: "centerLeft", wrist: [-0.18, -0.12, 1.5], shape: "fist" },
    right: { arm: "displayRight", wrist: [0.2, -0.26, 1.18], shape: "point" },
    motion: "tap",
  },
  BN_TTHA: {
    left: { arm: "centerLeft", wrist: [-0.16, -0.08, 1.5], shape: "open" },
    right: { arm: "displayRight", wrist: [0.12, -0.18, 1.32], shape: "point" },
    motion: "tap",
  },
  BN_DDA: {
    left: { arm: "centerLeft", wrist: [-0.16, -0.1, 1.48], shape: "open" },
    right: { arm: "displayRight", wrist: [0.1, -0.82, 0.04], shape: "l" },
    motion: "tap",
  },
  BN_DDHA: {
    left: { arm: "centerLeft", wrist: [-0.42, -0.36, 1.18], shape: "point" },
    right: { arm: "centerRight", wrist: [0.42, 0.36, -1.18], shape: "point" },
    motion: "twist",
  },
  BN_TA: {
    right: { arm: "displayRight", wrist: [0.08, -0.28, -0.04], shape: "y" },
    motion: "twist",
  },
  BN_THA: {
    left: { arm: "centerLeft", wrist: [-0.1, -0.72, 1.46], shape: "point" },
    right: { arm: "displayRight", wrist: [0.16, -0.24, 1.2], shape: "point" },
    motion: "tap",
  },
  BN_DA: {
    left: { arm: "centerLeft", wrist: [-0.12, -0.08, 1.52], shape: "thumbUp" },
    right: { arm: "displayRight", wrist: [0.12, -0.28, 1.16], shape: "point" },
    motion: "tap",
  },
  BN_DHA: {
    left: { arm: "centerLeft", wrist: [-0.34, -0.28, 1.2], shape: "o" },
    right: { arm: "centerRight", wrist: [0.34, 0.28, -1.2], shape: "thumbUp" },
    motion: "tap",
  },
  BN_NA: {
    left: { arm: "centerLeft", wrist: [-0.58, -0.16, 1.28], shape: "open" },
    right: { arm: "centerRight", wrist: [0.58, 0.16, -1.28], shape: "open" },
    motion: "slide",
  },
  BN_PA: {
    left: { arm: "centerLeft", wrist: [-0.46, -0.18, 1.18], shape: "open" },
    right: { arm: "centerRight", wrist: [0.46, 0.18, -1.18], shape: "f" },
    motion: "tap",
  },
  BN_PHA: {
    left: { arm: "centerLeft", wrist: [-0.08, -0.82, 1.48], shape: "open" },
    right: { arm: "displayRight", wrist: [0.08, -0.06, -0.12], shape: "open" },
    motion: "tap",
  },
  BN_BA: {
    left: { arm: "centerLeft", wrist: [-0.48, -0.2, 1.16], shape: "fist" },
    right: { arm: "centerRight", wrist: [0.48, 0.2, -1.16], shape: "open" },
    motion: "tap",
  },
  BN_BHA: {
    left: { arm: "centerLeft", wrist: [-0.44, -0.26, 1.16], shape: "c" },
    right: { arm: "displayRight", wrist: [0.08, -0.7, 0.04], shape: "point" },
    motion: "tap",
  },
  BN_MA: {
    left: { arm: "centerLeft", wrist: [-0.58, -0.16, 1.26], shape: "open" },
    right: { arm: "centerRight", wrist: [0.58, 0.16, -1.26], shape: "open" },
    motion: "twist",
  },
  BN_YA: {
    left: { arm: "centerLeft", wrist: [-0.44, -0.12, 1.2], shape: "open" },
    right: { arm: "centerRight", wrist: [0.44, 0.12, -1.2], shape: "open" },
    motion: "tap",
  },
  BN_RA: {
    left: { arm: "centerLeft", wrist: [-0.38, -0.24, 1.12], shape: "open" },
    right: { arm: "centerRight", wrist: [0.38, 0.24, -1.12], shape: "open" },
    motion: "twist",
  },
  BN_LA: {
    left: { arm: "centerLeft", wrist: [-0.52, -0.16, 1.28], shape: "open" },
    right: { arm: "centerRight", wrist: [0.52, 0.16, -1.28], shape: "open" },
    motion: "slide",
  },
  BN_SA: {
    left: { arm: "centerLeft", wrist: [-0.12, -0.76, 1.46], shape: "point" },
    right: { arm: "displayRight", wrist: [0.12, -0.14, -0.06], shape: "fist" },
    motion: "tap",
  },
  BN_HA: {
    left: { arm: "centerLeft", wrist: [-0.12, -0.08, 1.5], shape: "open" },
    right: { arm: "displayRight", wrist: [0.18, -0.5, 0.7], shape: "open" },
    motion: "slide",
  },
  BN_RRA: {
    left: { arm: "centerLeft", wrist: [-0.34, -0.26, 1.18], shape: "thumbUp" },
    right: { arm: "centerRight", wrist: [0.34, 0.26, -1.18], shape: "point" },
    motion: "circle",
  },
  BN_ANUSVARA: {
    left: { arm: "centerLeft", wrist: [-0.4, -0.24, 1.16], shape: "o" },
    right: { arm: "centerRight", wrist: [0.4, 0.24, -1.16], shape: "two" },
    motion: "tap",
  },
  BN_VISARGA: {
    right: { arm: "displayRight", wrist: [0.08, -0.1, -0.08], shape: "o" },
    motion: "double",
  },
};

// Front-view closure limits. The original calibration was captured at an
// oblique angle and drove fingertips through the palm when viewed head-on.
const CLOSED_FINGER_ANGLES = {
  Index: [0.92, 1.04, 0.58],
  Middle: [0.98, 1.08, 0.62],
  Ring: [1.0, 1.1, 0.62],
  Pinky: [0.96, 1.06, 0.56],
};

// Keep the small front-safe thumb tucks that distinguish E/M/N/S/T. The old
// full-palm "across" override stays disabled because it stretched through the
// closed fingers in two-hand Bangla poses.
const THUMB_TUCK_POSES = {
  under: [
    [-0.24, 0.34, 0.72],
    [0.84, -0.43, -0.48],
    [0.03, 0.2, -0.12],
  ],
  underTwo: [
    [-0.2, 0.43, 0.78],
    [0.86, -0.44, -0.5],
    [0.04, 0.22, -0.13],
  ],
  underThree: [
    [-0.18, 0.5, 0.82],
    [0.9, -0.47, -0.52],
    [0.04, 0.24, -0.14],
  ],
  betweenIndexMiddle: [
    [-0.12, 0.58, 0.7],
    [0.84, -0.5, -0.46],
    [0.02, 0.18, -0.1],
  ],
};

// Calibrated directly against the Ch09 finger-end bones. The thumb tip meets
// the correct fingertip for ASL 6-9 instead of using a generic curl that can
// look reversed from the front. Zero reuses the index contact and rounds the
// remaining fingers into a readable O.
const CONTACT_HAND_POSES = {
  zero: {
    Thumb: [
      [-0.14, 0.06, 0.66],
      [-0.18, -0.04, 0.035],
      [0.005, 0, 0.135],
    ],
    Index: [[0, -0.37539, 0.30206], [0, 0, 1.23342], [0, 0, 1.14176]],
    Middle: [[0, -0.04, 0.5], [0, 0, 0.82], [0, 0, 0.52]],
    Ring: [[0, 0.02, 0.56], [0, 0, 0.86], [0, 0, 0.54]],
    Pinky: [[0, 0.08, 0.62], [0, 0, 0.9], [0, 0, 0.56]],
  },
  six: {
    Thumb: [
      [-0.015, 0.06, 1.18],
      [-0.145, 0.085, -0.015],
      [-0.17, 0.035, 0.11],
    ],
    Pinky: [[0, -0.55, 0.54608], [0, 0, 1.5], [0, 0, 1.17355]],
  },
  seven: {
    Thumb: [
      [-0.24251, -0.07654, 1.3],
      [0.02391, -0.05366, -0.24248],
      [-0.17612, -0.06078, 0.00771],
    ],
    Ring: [[0, 0.55, 0.31279], [0, 0, 1.5], [0, 0, 1.19853]],
  },
  eight: {
    Thumb: [
      [-0.0428, 0.00847, 1.15729],
      [-0.08138, -0.0624, -0.34178],
      [0.04747, -0.02189, 0.11186],
    ],
    Middle: [[0, 0.55, 0.34878], [0, 0, 1.44959], [0, 0, 1.00245]],
  },
  nine: {
    Thumb: [
      [0.14618, -0.08284, 0.71626],
      [-0.23354, 0.02372, 0.06459],
      [-0.06292, 0.13638, 0.18403],
    ],
    Index: [[0, -0.37539, 0.30206], [0, 0, 1.23342], [0, 0, 1.14176]],
  },
  f: {
    Thumb: [
      [-0.25882, -0.32284, 0.95626],
      [0.24646, 0.02372, -0.31041],
      [0.13208, 0.04638, 0.28903],
    ],
    Index: [[0, -0.37539, 0.30206], [0, 0, 1.23342], [0, 0, 1.14176]],
  },
};

function cleanBoneName(name) {
  return String(name || "")
    .replace(/^.*:/, "")
    .replace(/^mixamorig\d*/i, "")
    .toLowerCase();
}

function indexSkeleton(root) {
  const bones = new Map();
  root.traverse((node) => {
    if (node.isBone) bones.set(cleanBoneName(node.name), node);
  });
  return bones;
}

function getBone(bones, name) {
  return bones.get(cleanBoneName(name)) || null;
}

function buildRig(root) {
  const bones = indexSkeleton(root);
  const controlled = [
    "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
  ];

  for (const side of ["Left", "Right"]) {
    for (const finger of FINGERS) {
      for (let joint = 1; joint <= 3; joint += 1) {
        controlled.push(`${side}Hand${finger}${joint}`);
      }
    }
  }

  const rest = new Map();
  controlled.forEach((name) => {
    const bone = getBone(bones, name);
    if (bone) rest.set(cleanBoneName(name), bone.quaternion.clone());
  });

  const fingerNames = [];
  for (const side of ["Left", "Right"]) {
    for (const finger of FINGERS) {
      for (let joint = 1; joint <= 3; joint += 1) {
        fingerNames.push(`${side}Hand${finger}${joint}`);
      }
    }
  }

  return {
    bones,
    rest,
    controlled,
    fingerBoneCount: fingerNames.filter((name) => getBone(bones, name)).length,
  };
}

const deltaEuler = new THREE.Euler();
const deltaQuaternion = new THREE.Quaternion();

function setBoneDelta(rig, name, x = 0, y = 0, z = 0) {
  const bone = getBone(rig.bones, name);
  const base = rig.rest.get(cleanBoneName(name));
  if (!bone || !base) return;

  deltaEuler.set(x, y, z, "XYZ");
  deltaQuaternion.setFromEuler(deltaEuler);
  bone.quaternion.copy(base).multiply(deltaQuaternion);
}

function resetRig(rig) {
  rig.controlled.forEach((name) => {
    const bone = getBone(rig.bones, name);
    const base = rig.rest.get(cleanBoneName(name));
    if (bone && base) bone.quaternion.copy(base);
  });
}

function applyFinger(rig, side, finger, curl, spread = 0) {
  const curlSign = side === "Left" ? -1 : 1;
  const spreadSign = side === "Left" ? -1 : 1;
  const angles = finger === "Thumb"
    ? [0.52, 0.72, 0.58]
    : [0.82, 1.02, 0.74];

  // Add only a small amount of lateral spread while closing. Larger values made
  // curled fingers cross through one another when the palm faced the camera.
  const closureSpread = spread * (1 + curl * 0.25);

  // Smoothly ramp from the small-angle linear model toward the calibrated
  // fully-closed fist angles as curl approaches 1, instead of hard-switching
  // at a fixed threshold. A hard cutoff (curl >= 0.75) caused a visible
  // snap/pop — real mocap-captured curl varies continuously frame to frame
  // and crosses a fixed threshold constantly, unlike the old hand-authored
  // presets which mostly sat clearly on one side of it.
  const closeBlend = finger !== "Thumb"
    ? Math.max(0, Math.min(1, (curl - 0.55) / 0.4))
    : 0;

  for (let joint = 1; joint <= 3; joint += 1) {
    const isFirst = joint === 1;
    const thumbOpposition = finger === "Thumb" && isFirst ? curl * 0.5 : 0;
    const linearAngle = angles[joint - 1] * curl;
    const closedAngle = CLOSED_FINGER_ANGLES[finger]?.[joint - 1] ?? linearAngle;
    const blendedAngle = linearAngle + (closedAngle - linearAngle) * closeBlend;
    // The Ch09 finger chains flex on local X when the palm is front-facing.
    // Rotating non-thumb curls on Z made them fold sideways across the palm.
    setBoneDelta(
      rig,
      `${side}Hand${finger}${joint}`,
      finger === "Thumb" ? thumbOpposition : blendedAngle * curlSign,
      isFirst ? closureSpread * spreadSign : 0,
      finger === "Thumb" ? blendedAngle * curlSign : 0
    );
  }
}

function applyThumbTuck(rig, side, mode) {
  const pose = THUMB_TUCK_POSES[mode];
  if (!pose) return;

  const mirror = side === "Left" ? -1 : 1;
  pose.forEach((rotation, index) => {
    setBoneDelta(
      rig,
      `${side}HandThumb${index + 1}`,
      rotation[0],
      rotation[1] * mirror,
      rotation[2] * mirror
    );
  });
}

function applyContactThumbPose(rig, side, poseName) {
  const rotations = CONTACT_HAND_POSES[poseName]?.Thumb;
  if (!rotations) return;

  const mirror = side === "Left" ? -1 : 1;
  rotations.forEach((rotation, index) => {
    setBoneDelta(
      rig,
      `${side}HandThumb${index + 1}`,
      rotation[0],
      rotation[1] * mirror,
      rotation[2] * mirror
    );
  });
}

function applyHandshape(rig, side, shapeName, overrides = {}) {
  const shape = { ...(HANDSHAPES[shapeName] || HANDSHAPES.relaxed), ...overrides };
  const spreads = {
    Thumb: -0.22,
    Index: shape.cross ? 0.11 : shape.split ? -0.12 : shape.number ? -0.09 : -0.045,
    Middle: shape.cross ? -0.11 : shape.split ? 0.12 : shape.number ? -0.025 : -0.012,
    Ring: shape.number ? 0.035 : 0.02,
    Pinky: shape.number ? 0.1 : 0.06,
    ...(shape.spread || {}),
  };

  applyFinger(rig, side, "Thumb", shape.thumb, spreads.Thumb);
  applyFinger(rig, side, "Index", shape.index, spreads.Index);
  applyFinger(rig, side, "Middle", shape.middle, spreads.Middle);
  applyFinger(rig, side, "Ring", shape.ring, spreads.Ring);
  applyFinger(rig, side, "Pinky", shape.pinky, spreads.Pinky);
  if (shape.thumbMode && shape.thumbMode !== "across") {
    applyThumbTuck(rig, side, shape.thumbMode);
  }
  if (shape.thumbContact) applyContactThumbPose(rig, side, shape.thumbContact);
}

function mixArray(a, b, t) {
  return a.map((value, index) => value + (b[index] - value) * t);
}

function applyArmPose(rig, side, pose) {
  setBoneDelta(rig, `${side}Arm`, ...pose.upper);
  setBoneDelta(rig, `${side}ForeArm`, ...pose.lower);
}

function applyBlendedArmPose(rig, side, from, to, t) {
  applyArmPose(rig, side, {
    upper: mixArray(from.upper, to.upper, t),
    lower: mixArray(from.lower, to.lower, t),
  });
}

function applySigningRest(rig, time) {
  const breath = Math.sin(time * 1.35) * 0.018;
  setBoneDelta(rig, "Spine1", breath, 0, 0);
  setBoneDelta(rig, "Spine2", breath * 0.7, 0, 0);
  setBoneDelta(rig, "Head", 0, Math.sin(time * 0.55) * 0.025, 0);

  applyArmPose(rig, "Left", ARM_POSES.restLeft);
  applyArmPose(rig, "Right", ARM_POSES.restRight);
  setBoneDelta(rig, "LeftHand", 0.04, 0.02, -0.06);
  setBoneDelta(rig, "RightHand", 0.04, -0.02, 0.06);
  applyHandshape(rig, "Left", "relaxed");
  applyHandshape(rig, "Right", "relaxed");
}

function applyNonDominantSupport(rig, time) {
  // One-handed ASL signs keep the non-dominant hand available but neutral. A
  // small counterbalance motion makes the humanoid feel alive without turning
  // a one-handed sign or number into an incorrect two-handed sign.
  const sway = Math.sin(time * 1.8) * 0.055;
  const support = 0.17;
  applyBlendedArmPose(rig, "Left", ARM_POSES.restLeft, ARM_POSES.centerLeft, support);
  setBoneDelta(rig, "LeftHand", 0.05 + sway * 0.32, 0.01 - sway * 0.14, -0.08 + sway);
  applyHandshape(rig, "Left", "relaxed", {
    thumb: 0.2 + Math.sin(time * 1.8) * 0.025,
    index: 0.1 + Math.cos(time * 1.8) * 0.02,
  });
}

function applyDisplayHand(rig, shapeName, gesture, time) {
  const pulse = Math.sin(time * 2.8);
  applyNonDominantSupport(rig, time);
  applyArmPose(rig, "Right", ARM_POSES.displayRight);
  setBoneDelta(rig, "RightHand", ...WRIST_POSES.displayRight);

  if (["G", "H"].includes(gesture)) {
    setBoneDelta(rig, "RightHand", 0.1, -0.82, 0.05);
  } else if (["P", "Q"].includes(gesture)) {
    setBoneDelta(rig, "RightHand", 0.15, -0.28, 1.28);
  } else if (gesture === "J") {
    setBoneDelta(rig, "RightHand", 0.08, pulse * 0.22, 0.12 + pulse * 0.2);
  } else if (gesture === "Z") {
    setBoneDelta(rig, "RightHand", 0.02, pulse * 0.34, pulse * 0.12);
  } else if (/^[0-9]$/.test(gesture)) {
    setBoneDelta(rig, "RightHand", 0.04, -0.08, -0.16);
  } else if (["A", "E", "M", "N", "S", "T"].includes(gesture)) {
    setBoneDelta(rig, "RightHand", 0.08, -0.08, -0.2);
  }

  applyHandshape(rig, "Right", shapeName);
}

function applyBanglaGesture(rig, gesture, time) {
  const pose = BANGLA_HAND_POSES[gesture];
  if (!pose) return;

  if (!pose.left) applyNonDominantSupport(rig, time);

  const wave = Math.sin(time * 3.4);
  const slow = (Math.sin(time * 2.4) + 1) / 2;

  for (const side of ["Left", "Right"]) {
    const hand = pose[side.toLowerCase()];
    if (!hand) continue;

    if (pose.motion === "double" && side === "Right") {
      applyBlendedArmPose(
        rig,
        side,
        ARM_POSES.displayRight,
        ARM_POSES.highRight,
        slow * 0.55
      );
    } else {
      applyArmPose(rig, side, ARM_POSES[hand.arm]);
    }

    const wrist = [...hand.wrist];
    if (pose.motion === "tap") {
      wrist[2] += (side === "Left" ? -1 : 1) * slow * 0.08;
    } else if (pose.motion === "slide") {
      wrist[1] += (side === "Left" ? -1 : 1) * wave * 0.09;
    } else if (pose.motion === "twist") {
      wrist[1] += (side === "Left" ? -1 : 1) * wave * 0.12;
    } else if (pose.motion === "circle") {
      wrist[0] += Math.sin(time * 3.2) * 0.08;
      wrist[2] += Math.cos(time * 3.2) * 0.08;
    } else if (pose.motion === "double") {
      wrist[2] += wave * 0.08;
    }

    setBoneDelta(rig, `${side}Hand`, ...wrist);
    applyHandshape(rig, side, hand.shape, hand.overrides);
  }
}

function applyCommonGesture(rig, gesture, time) {
  const wave = Math.sin(time * 6.2);
  const slow = (Math.sin(time * 2.8) + 1) / 2;
  const circle = Math.sin(time * 4.2);
  const cosine = Math.cos(time * 4.2);

  applyNonDominantSupport(rig, time);

  switch (gesture) {
    case "HELLO":
      applyArmPose(rig, "Right", ARM_POSES.highRight);
      setBoneDelta(
        rig,
        "RightHand",
        WRIST_POSES.highRight[0],
        WRIST_POSES.highRight[1],
        WRIST_POSES.highRight[2] + wave * 0.28
      );
      applyMocapOrHandshape(rig, "Right", "HELLO", "open", time);
      break;
    case "THANK":
      applyBlendedArmPose(
        rig,
        "Right",
        ARM_POSES.highRight,
        ARM_POSES.forwardRight,
        slow
      );
      setBoneDelta(
        rig,
        "RightHand",
        ...mixArray(WRIST_POSES.highRight, WRIST_POSES.forwardRight, slow)
      );
      applyMocapOrHandshape(rig, "Right", "THANK", "open", time);
      break;
    case "YOU":
      applyArmPose(rig, "Right", ARM_POSES.forwardRight);
      setBoneDelta(rig, "RightHand", ...WRIST_POSES.forwardRight);
      applyMocapOrHandshape(rig, "Right", "YOU", "point", time);
      break;
    case "ME":
    case "I":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "RightHand", 0.46, -0.12, -1.35);
      applyMocapOrHandshape(rig, "Right", gesture, "point", time);
      break;
    case "YES":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(
        rig,
        "RightHand",
        WRIST_POSES.centerRight[0],
        WRIST_POSES.centerRight[1],
        WRIST_POSES.centerRight[2] + wave * 0.1
      );
      applyMocapOrHandshape(rig, "Right", "YES", "fist", time);
      break;
    case "NO":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "RightHand", ...WRIST_POSES.centerRight);
      applyMocapOrHandshape(rig, "Right", "NO", "two", time);
      break;
    case "WHAT":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.72, -0.18, 1.38 + wave * 0.08);
      setBoneDelta(rig, "RightHand", 0.72, 0.18, -1.38 - wave * 0.08);
      applyMocapOrHandshape(rig, "Left", "WHAT", "open", time);
      applyMocapOrHandshape(rig, "Right", "WHAT", "open", time);
      break;
    case "WHERE":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "RightHand", 0.18, -0.28 + wave * 0.16, -0.92);
      applyMocapOrHandshape(rig, "Right", "WHERE", "point", time);
      break;
    case "WHEN":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", ...WRIST_POSES.centerLeft);
      setBoneDelta(rig, "RightHand", 0.34 + circle * 0.1, -0.25, -1.28 + Math.cos(time * 4.2) * 0.1);
      applyMocapOrHandshape(rig, "Left", "WHEN", "point", time);
      applyMocapOrHandshape(rig, "Right", "WHEN", "point", time);
      break;
    case "WHY":
      applyArmPose(rig, "Right", ARM_POSES.highRight);
      setBoneDelta(rig, "RightHand", 0.08, -0.16, -0.16 + wave * 0.05);
      applyMocapOrHandshape(rig, "Right", "WHY", "y", time);
      break;
    case "HOW":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.82, -0.1 + circle * 0.1, 1.24);
      setBoneDelta(rig, "RightHand", 0.82, 0.1 - circle * 0.1, -1.24);
      applyMocapOrHandshape(rig, "Left", "HOW", "fist", time);
      applyMocapOrHandshape(rig, "Right", "HOW", "fist", time);
      break;
    case "HELP":
      applyArmPose(rig, "Left", ARM_POSES.helpLeft);
      applyArmPose(rig, "Right", ARM_POSES.helpRight);
      setBoneDelta(rig, "LeftHand", ...WRIST_POSES.helpLeft);
      setBoneDelta(rig, "RightHand", ...WRIST_POSES.helpRight);
      applyMocapOrHandshape(rig, "Left", "HELP", "open", time);
      applyMocapOrHandshape(rig, "Right", "HELP", "thumbUp", time);
      break;
    case "PLEASE":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(
        rig,
        "RightHand",
        WRIST_POSES.centerRight[0],
        WRIST_POSES.centerRight[1],
        WRIST_POSES.centerRight[2] + wave * 0.08
      );
      applyMocapOrHandshape(rig, "Right", "PLEASE", "open", time);
      break;
    case "SORRY":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(
        rig,
        "RightHand",
        WRIST_POSES.centerRight[0] + circle * 0.1,
        WRIST_POSES.centerRight[1],
        WRIST_POSES.centerRight[2] + Math.cos(time * 4.2) * 0.1
      );
      applyMocapOrHandshape(rig, "Right", "SORRY", "fist", time);
      break;
    case "GOOD":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(
        rig,
        "RightHand",
        WRIST_POSES.centerRight[0],
        WRIST_POSES.centerRight[1],
        WRIST_POSES.centerRight[2] + wave * 0.1
      );
      applyMocapOrHandshape(rig, "Right", "GOOD", "thumbUp", time);
      break;
    case "OK":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "RightHand", ...WRIST_POSES.centerRight);
      applyMocapOrHandshape(rig, "Right", "OK", "f", time);
      break;
    case "BAD":
      applyBlendedArmPose(rig, "Right", ARM_POSES.highRight, ARM_POSES.centerRight, slow);
      setBoneDelta(rig, "RightHand", 0.2 + slow * 0.55, -0.18, -0.35 - slow * 1.15);
      applyMocapOrHandshape(rig, "Right", "BAD", "open", time);
      break;
    case "KNOW":
    case "THINK":
      applyArmPose(rig, "Right", ARM_POSES.highRight);
      setBoneDelta(rig, "RightHand", 0.05, -0.18, -0.1);
      applyMocapOrHandshape(rig, "Right", gesture, "point", time);
      break;
    case "LEARN":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyBlendedArmPose(rig, "Right", ARM_POSES.centerRight, ARM_POSES.highRight, slow);
      setBoneDelta(rig, "LeftHand", ...WRIST_POSES.centerLeft);
      setBoneDelta(rig, "RightHand", 0.08, -0.12, -0.2);
      applyMocapOrHandshape(rig, "Left", "LEARN", "open", time);
      applyMocapOrHandshape(rig, "Right", "LEARN", "f", time);
      break;
    case "SIGN":
    case "ASL":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.45 + circle * 0.12, -0.2, 1.08);
      setBoneDelta(rig, "RightHand", 0.45 - circle * 0.12, 0.2, -1.08);
      applyMocapOrHandshape(rig, "Left", gesture, "point", time);
      applyMocapOrHandshape(rig, "Right", gesture, "point", time);
      break;
    case "WANT":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.5, -0.18 - slow * 0.12, 1.2);
      setBoneDelta(rig, "RightHand", 0.5, 0.18 + slow * 0.12, -1.2);
      applyMocapOrHandshape(rig, "Left", "WANT", "open", time, { index: slow * 0.32, middle: slow * 0.32, ring: slow * 0.32, pinky: slow * 0.32 });
      applyMocapOrHandshape(rig, "Right", "WANT", "open", time, { index: slow * 0.32, middle: slow * 0.32, ring: slow * 0.32, pinky: slow * 0.32 });
      break;
    case "SEE":
    case "LOOK":
      applyArmPose(rig, "Right", ARM_POSES.forwardRight);
      setBoneDelta(rig, "RightHand", 0.12, -0.46, 0.02);
      applyMocapOrHandshape(rig, "Right", gesture, "two", time);
      break;
    case "GO":
    case "COME":
    case "GIVE":
    case "SHOW":
    case "EXPLAIN":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyBlendedArmPose(rig, "Right", ARM_POSES.centerRight, ARM_POSES.forwardRight, slow);
      setBoneDelta(rig, "LeftHand", ...WRIST_POSES.centerLeft);
      setBoneDelta(rig, "RightHand", ...mixArray(WRIST_POSES.centerRight, WRIST_POSES.forwardRight, slow));
      applyMocapOrHandshape(rig, "Left", gesture, gesture === "EXPLAIN" ? "open" : "relaxed", time);
      applyMocapOrHandshape(rig, "Right", gesture, gesture === "SHOW" || gesture === "EXPLAIN" ? "open" : "point", time);
      break;
    case "AREA":
    case "GRAPH":
    case "RECTANGLE":
    case "RECTANGLES":
    case "CIRCLE":
    case "SHAPE":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.7 + circle * 0.08, -0.15, 1.34);
      setBoneDelta(rig, "RightHand", 0.7 - circle * 0.08, 0.15, -1.34);
      applyMocapOrHandshape(rig, "Left", gesture, "open", time);
      applyMocapOrHandshape(rig, "Right", gesture, "open", time);
      break;
    case "FUNCTION":
    case "FORMULA":
    case "RULE":
    case "CALCULUS":
    case "DERIVATIVE":
    case "DERIVATIVES":
    case "DX":
    case "DR":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.displayRight);
      setBoneDelta(rig, "LeftHand", ...WRIST_POSES.centerLeft);
      setBoneDelta(rig, "RightHand", 0.1 + circle * 0.12, -0.22, -0.1 + cosine * 0.1);
      applyMocapOrHandshape(rig, "Left", gesture, "open", time);
      applyMocapOrHandshape(rig, "Right", gesture, "point", time);
      break;
    case "SUM":
    case "TOTAL":
    case "ADD":
    case "COMBINE":
    case "TOGETHER":
    case "PRODUCT":
    case "TIMES":
      applyBlendedArmPose(rig, "Left", ARM_POSES.centerLeft, ARM_POSES.helpLeft, slow * 0.45);
      applyBlendedArmPose(rig, "Right", ARM_POSES.centerRight, ARM_POSES.helpRight, slow * 0.45);
      setBoneDelta(rig, "LeftHand", -0.72, -0.14, 1.26 + slow * 0.16);
      setBoneDelta(rig, "RightHand", 0.72, 0.14, -1.26 - slow * 0.16);
      applyMocapOrHandshape(rig, "Left", gesture, "open", time);
      applyMocapOrHandshape(rig, "Right", gesture, "open", time);
      break;
    case "POINT":
    case "HERE":
    case "THERE":
    case "WAY":
    case "PLACE":
      applyArmPose(rig, "Right", ARM_POSES.forwardRight);
      setBoneDelta(rig, "RightHand", ...WRIST_POSES.forwardRight);
      applyMocapOrHandshape(rig, "Right", gesture, "point", time);
      break;
    case "SMALL":
    case "SMALLER":
    case "TINY":
    case "LITTLE":
    case "LESS":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.52, -0.18, 1.18);
      setBoneDelta(rig, "RightHand", 0.52, 0.18, -1.18);
      applyMocapOrHandshape(rig, "Left", gesture, "open", time, { index: 0.2, middle: 0.2, ring: 0.2, pinky: 0.2 });
      applyMocapOrHandshape(rig, "Right", gesture, "open", time, { index: 0.2, middle: 0.2, ring: 0.2, pinky: 0.2 });
      break;
    case "BIG":
    case "MANY":
    case "ALL":
    case "SOME":
    case "EACH":
    case "BETWEEN":
    case "UNDER":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.75 - slow * 0.12, -0.12, 1.22);
      setBoneDelta(rig, "RightHand", 0.75 + slow * 0.12, 0.12, -1.22);
      applyMocapOrHandshape(rig, "Left", gesture, "open", time);
      applyMocapOrHandshape(rig, "Right", gesture, "open", time);
      break;
    case "CHANGE":
    case "DIFFERENT":
    case "DIFFERENCE":
    case "IF":
    case "OR":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "LeftHand", -0.42, -0.28 + wave * 0.08, 1.08);
      setBoneDelta(rig, "RightHand", 0.42, 0.28 - wave * 0.08, -1.08);
      applyMocapOrHandshape(rig, "Left", gesture, "point", time);
      applyMocapOrHandshape(rig, "Right", gesture, "point", time);
      break;
    case "FIND":
    case "GET":
    case "TAKE":
    case "MAKE":
    case "USE":
    case "WORK":
    case "NEED":
    case "CAN":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "RightHand", 0.62, -0.22, -1.18 + wave * 0.08);
      applyMocapOrHandshape(rig, "Right", gesture, gesture === "CAN" ? "fist" : "f", time);
      break;
    case "START":
    case "STOP":
    case "FINISH":
    case "RIGHT":
    case "WRONG":
    case "TRUE":
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(rig, "RightHand", 0.7, -0.22, -1.35 + wave * 0.09);
      applyMocapOrHandshape(rig, "Right", gesture, ["RIGHT", "TRUE"].includes(gesture) ? "thumbUp" : "fist", time);
      break;
    case "LOVE":
      applyArmPose(rig, "Left", ARM_POSES.helpLeft);
      applyArmPose(rig, "Right", ARM_POSES.helpRight);
      setBoneDelta(rig, "LeftHand", ...WRIST_POSES.helpLeft);
      setBoneDelta(rig, "RightHand", ...WRIST_POSES.helpRight);
      applyMocapOrHandshape(rig, "Left", "LOVE", "fist", time);
      applyMocapOrHandshape(rig, "Right", "LOVE", "fist", time);
      break;
    case "MORE":
      applyArmPose(rig, "Left", ARM_POSES.centerLeft);
      applyArmPose(rig, "Right", ARM_POSES.centerRight);
      setBoneDelta(
        rig,
        "LeftHand",
        WRIST_POSES.centerLeft[0],
        WRIST_POSES.centerLeft[1],
        WRIST_POSES.centerLeft[2] + wave * 0.06
      );
      setBoneDelta(
        rig,
        "RightHand",
        WRIST_POSES.centerRight[0],
        WRIST_POSES.centerRight[1],
        WRIST_POSES.centerRight[2] + wave * 0.06
      );
      applyMocapOrHandshape(rig, "Left", "MORE", "o", time);
      applyMocapOrHandshape(rig, "Right", "MORE", "o", time);
      break;
    default:
      break;
  }
}

function animateGesture(rig, gesture, time) {
  resetRig(rig);
  applySigningRest(rig, time);

  if (gesture === "RELAXED") return;

  if (isBanglaGesture(gesture)) {
    applyBanglaGesture(rig, gesture, time);
    return;
  }

  if (gesture.startsWith("SPELL_")) {
    const letters = gesture.slice(6).replace(/[^A-Z0-9]/g, "").split("");
    const spellRate = letters.length > 6 ? 4.8 : 3.9;
    const letter = letters.length ? letters[Math.floor((time + 0.18) * spellRate) % letters.length] : "A";
    const shape = /[0-9]/.test(letter)
      ? NUMBER_SHAPES[letter]
      : LETTER_SHAPES[letter] || "relaxed";
    applyDisplayHand(rig, shape, letter, time);
    return;
  }

  if (/^[A-Z]$/.test(gesture)) {
    applyDisplayHand(rig, LETTER_SHAPES[gesture] || "relaxed", gesture, time);
    return;
  }

  if (/^NUM_[0-9]$/.test(gesture)) {
    const number = gesture.slice(-1);
    applyDisplayHand(rig, NUMBER_SHAPES[number], number, time);
    return;
  }

  applyCommonGesture(rig, gesture, time);
}

function fitModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = size.y ? 3.35 / size.y : 1;
  root.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  root.position.sub(center);
  root.position.y -= 0.08;
}

export default function MixamoAvatar({
  gesture = "HELLO",
  viewMode = "hands",
  isPlaying = true,
  onRigReport,
}) {
  const canvasRef = useRef(null);
  const gestureRef = useRef(gesture);
  const viewModeRef = useRef(viewMode);
  const isPlayingRef = useRef(isPlaying);
  const gestureElapsedRef = useRef(0);
  const gestureChangedRef = useRef(true);
  const cameraModeChangedRef = useRef(true);
  const resetViewRef = useRef(null);

  useEffect(() => {
    gestureRef.current = gesture;
    gestureElapsedRef.current = 0;
    gestureChangedRef.current = true;
    if (viewModeRef.current === "hands") {
      resetViewRef.current?.();
    }
  }, [gesture]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    cameraModeChangedRef.current = true;
  }, [viewMode]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090b0d");
    scene.fog = new THREE.Fog("#090b0d", 5.5, 10);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0.06, 6.5);

    const cameraGoal = new THREE.Vector3();
    const targetGoal = new THREE.Vector3();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 2.4;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.45;

    function getStandardView() {
      if (viewModeRef.current === "body") {
        return {
          cameraPosition: cameraGoal.set(0, 0.06, 6.5).clone(),
          targetPosition: targetGoal.set(0, -0.14, 0).clone(),
        };
      }
      return {
        cameraPosition: cameraGoal.set(0, 0.34, 3.9).clone(),
        targetPosition: targetGoal.set(0, 0.24, 0).clone(),
      };
    }

    function resetCameraView() {
      const isBodyView = viewModeRef.current === "body";
      controls.enablePan = isBodyView;
      controls.enableZoom = isBodyView;
      controls.enableRotate = isBodyView;
      const standard = getStandardView();
      camera.position.copy(standard.cameraPosition);
      controls.target.copy(standard.targetPosition);
      camera.lookAt(controls.target);
      controls.update();
    }

    resetViewRef.current = resetCameraView;
    resetCameraView();

    const key = new THREE.DirectionalLight("#fff7e8", 3.3);
    key.position.set(2.6, 4.2, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const fill = new THREE.DirectionalLight("#9fc4d8", 1.6);
    fill.position.set(-3, 2, 2);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight("#e8f0f4", "#16191c", 1.35));

    const rim = new THREE.PointLight("#e0ff6b", 1.8, 7);
    rim.position.set(-2.4, 1.7, -1.8);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 64),
      new THREE.MeshStandardMaterial({
        color: "#111519",
        roughness: 0.88,
        metalness: 0.08,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.77;
    floor.receiveShadow = true;
    scene.add(floor);

    let rig = null;
    let model = null;
    let disposed = false;

    const loader = new FBXLoader();
    loader.load(
      MODEL_URL,
      (object) => {
        if (disposed) return;
        model = object;
        fitModel(model);
        model.traverse((node) => {
          node.frustumCulled = false;
          if (node.isMesh || node.isSkinnedMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((material) => {
              if (!material) return;
              material.side = THREE.FrontSide;
              material.needsUpdate = true;
            });
          }
        });
        scene.add(model);
        rig = buildRig(model);
        onRigReport?.({
          loaded: true,
          fingerBoneCount: rig.fingerBoneCount,
          totalFingerBones: 30,
          modelName: "Ch09_nonPBR.fbx",
        });
      },
      undefined,
      (error) => {
        console.error("[MixamoAvatar] Could not load FBX model:", error);
        onRigReport?.({
          loaded: false,
          error: "Could not load the Mixamo FBX model.",
          fingerBoneCount: 0,
          totalFingerBones: 30,
        });
      }
    );

    const clock = new THREE.Clock();
    let frameId = 0;

    function resize() {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      resize();
      const delta = Math.min(clock.getDelta(), 0.1);
      if (rig && isPlayingRef.current) {
        gestureElapsedRef.current += delta;
        animateGesture(rig, gestureRef.current, gestureElapsedRef.current);
        gestureChangedRef.current = false;
      } else if (rig && gestureChangedRef.current) {
        // A seek while paused may select a new word. Apply that static pose once,
        // then keep every bone frozen until playback resumes.
        animateGesture(rig, gestureRef.current, gestureElapsedRef.current);
        gestureChangedRef.current = false;
      }

      if (viewModeRef.current === "body") {
        cameraGoal.set(0, 0.06, 6.5);
        targetGoal.set(0, -0.14, 0);
      } else {
        cameraGoal.set(0, 0.34, 3.9);
        targetGoal.set(0, 0.24, 0);
      }
      if (cameraModeChangedRef.current) {
        resetCameraView();
        cameraModeChangedRef.current = false;
      }
      controls.update();

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resetViewRef.current = null;
      controls.dispose();
      renderer.dispose();
      scene.traverse((node) => {
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material?.dispose?.());
      });
    };
  }, [onRigReport]);

  return (
    <div className="mixamo-avatar">
      <canvas
        ref={canvasRef}
        className="mixamo-avatar-canvas"
        aria-label="Mixamo humanoid demonstrating articulated finger gestures"
      />
      <button
        type="button"
        className="mixamo-reset-view"
        onClick={() => resetViewRef.current?.()}
        title="Reset 3D view"
      >
        Reset view
      </button>
      <div className="mixamo-floor-glow" />
    </div>
  );
}
