import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import MOCAP_CLIPS from "./mocapClips";
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
  b: { thumb: 1.05, index: 0, middle: 0, ring: 0, pinky: 0 },
  fist: { thumb: 0.72, index: 1, middle: 1, ring: 1, pinky: 1, thumbMode: "across" },
  point: { thumb: 0.55, index: 0, middle: 1, ring: 1, pinky: 1, thumbMode: "across" },
  two: { thumb: 0.58, index: 0, middle: 0, ring: 1, pinky: 1, thumbMode: "across" },
  three: { thumb: 0.04, index: 0, middle: 0, ring: 1, pinky: 1 },
  four: { thumb: 0.78, index: 0, middle: 0, ring: 0, pinky: 0, thumbMode: "across" },
  five: { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 },
  six: { thumb: 0.48, index: 0, middle: 0, ring: 0, pinky: 0.8 },
  seven: { thumb: 0.5, index: 0, middle: 0, ring: 0.78, pinky: 0 },
  eight: { thumb: 0.5, index: 0, middle: 0.78, ring: 0, pinky: 0 },
  nine: { thumb: 0.5, index: 0.78, middle: 0, ring: 0, pinky: 0 },
  y: { thumb: 0, index: 1, middle: 1, ring: 1, pinky: 0 },
  l: { thumb: 0, index: 0, middle: 1, ring: 1, pinky: 1 },
  c: { thumb: 0.28, index: 0.38, middle: 0.38, ring: 0.42, pinky: 0.5 },
  o: { thumb: 0.44, index: 0.5, middle: 0.5, ring: 0.52, pinky: 0.58 },
  f: { thumb: 0.42, index: 0.55, middle: 0, ring: 0, pinky: 0 },
  i: { thumb: 0.7, index: 1, middle: 1, ring: 1, pinky: 0, thumbMode: "across" },
  x: { thumb: 0.62, index: 0.58, middle: 1, ring: 1, pinky: 1, thumbMode: "across" },
  r: { thumb: 0.62, index: 0, middle: 0, ring: 1, pinky: 1, cross: true, thumbMode: "across" },
  k: { thumb: 0.08, index: 0, middle: 0, ring: 1, pinky: 1, split: true },
  thumbUp: { thumb: 0, index: 1, middle: 1, ring: 1, pinky: 1 },
};

const LETTER_SHAPES = {
  A: "a", B: "b", C: "c", D: "point", E: "fist", F: "f",
  G: "point", H: "two", I: "i", J: "i", K: "k", L: "l",
  M: "fist", N: "fist", O: "o", P: "k", Q: "point", R: "r",
  S: "fist", T: "fist", U: "two", V: "two", W: "three", X: "x",
  Y: "y", Z: "point",
};

const NUMBER_SHAPES = {
  "0": "o", "1": "point", "2": "two", "3": "three", "4": "four",
  "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
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
};

const WRIST_POSES = {
  highRight: [0.02, 0.04, 0.12],
  centerRight: [0.77562, -0.39664, -1.63696],
  centerLeft: [-0.95641, -0.12687, 1.63146],
  forwardRight: [-0.30317, 0.59282, 0.30059],
  helpLeft: [-0.55973, 0.26864, -0.50865],
  helpRight: [-1.43452, -2.69908, -2.3862],
};

// Eased ~15% off the raw calibration on joints 1-2 (MCP/PIP) — at full
// magnitude the curl drove fingertips through the palm and into neighboring
// fingers when viewed from the front. Joint 3 (DIP) left as calibrated since
// it was already modest and shapes the natural fingertip curve.
const CLOSED_FINGER_ANGLES = {
  Index: [1.399, 1.577, 0.20517],
  Middle: [1.510, 1.501, 0.75136],
  Ring: [1.526, 1.605, 0.53784],
  Pinky: [1.523, 1.603, 0.36841],
};

const THUMB_ACROSS = [
  [-0.34548, 0.51967, 0.60546],
  [1.08183, -0.58959, -0.58767],
  [0.00301, 0.42939, -0.24427],
];

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

  // Widen lateral spread as the finger closes so adjacent curled fingers
  // don't intersect each other — at curl 0 (open hand) this is unchanged
  // from the original spread value; at curl 1 (full fist) spread doubles.
  const closureSpread = spread * (1 + curl);

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
    setBoneDelta(
      rig,
      `${side}Hand${finger}${joint}`,
      thumbOpposition,
      isFirst ? closureSpread * spreadSign : 0,
      blendedAngle * curlSign
    );
  }
}

function applyThumbAcross(rig, side) {
  const mirror = side === "Left" ? -1 : 1;
  THUMB_ACROSS.forEach((rotation, index) => {
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
    Index: shape.cross ? 0.11 : shape.split ? -0.12 : -0.045,
    Middle: shape.cross ? -0.11 : shape.split ? 0.12 : -0.012,
    Ring: 0.02,
    Pinky: 0.06,
  };

  applyFinger(rig, side, "Thumb", shape.thumb, spreads.Thumb);
  applyFinger(rig, side, "Index", shape.index, spreads.Index);
  applyFinger(rig, side, "Middle", shape.middle, spreads.Middle);
  applyFinger(rig, side, "Ring", shape.ring, spreads.Ring);
  applyFinger(rig, side, "Pinky", shape.pinky, spreads.Pinky);
  if (shape.thumbMode === "across") applyThumbAcross(rig, side);
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

function applyDisplayHand(rig, shapeName, gesture, time) {
  const pulse = Math.sin(time * 2.8);
  applyArmPose(rig, "Right", ARM_POSES.highRight);
  setBoneDelta(rig, "RightHand", ...WRIST_POSES.highRight);

  if (["G", "H"].includes(gesture)) {
    setBoneDelta(rig, "RightHand", 0.1, -0.82, 0.05);
  } else if (["P", "Q"].includes(gesture)) {
    setBoneDelta(rig, "RightHand", 0.15, -0.28, 1.28);
  } else if (gesture === "J") {
    setBoneDelta(rig, "RightHand", 0.08, pulse * 0.22, 0.12 + pulse * 0.2);
  } else if (gesture === "Z") {
    setBoneDelta(rig, "RightHand", 0.02, pulse * 0.34, pulse * 0.12);
  }

  applyHandshape(rig, "Right", shapeName);
}

function applyCommonGesture(rig, gesture, time) {
  const wave = Math.sin(time * 6.2);
  const slow = (Math.sin(time * 2.8) + 1) / 2;

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
  onRigReport,
}) {
  const canvasRef = useRef(null);
  const gestureRef = useRef(gesture);
  const viewModeRef = useRef(viewMode);

  useEffect(() => {
    gestureRef.current = gesture;
  }, [gesture]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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
    camera.position.set(0, 0.45, 4.8);

    const target = new THREE.Vector3(0, 0.35, 0);
    const cameraGoal = new THREE.Vector3();
    const targetGoal = new THREE.Vector3();

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
        if (process.env.NODE_ENV !== "production") {
          window.__mixamoRigDebug = {
            rig,
            model,
            reset: () => resetRig(rig),
            setBone: (name, x, y, z) => setBoneDelta(rig, name, x, y, z),
            setHandshape: (side, shape) => applyHandshape(rig, side, shape),
          };
        }
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
      const time = clock.getElapsedTime();

      if (rig && !window.__mixamoPauseDebug) {
        animateGesture(rig, gestureRef.current, time);
      }

      if (viewModeRef.current === "body") {
        cameraGoal.set(0, 0.15, 5.8);
        targetGoal.set(0, -0.05, 0);
      } else {
        cameraGoal.set(0, 0.34, 3.9);
        targetGoal.set(0, 0.24, 0);
      }
      camera.position.lerp(cameraGoal, 0.075);
      target.lerp(targetGoal, 0.075);
      camera.lookAt(target);

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      disposed = true;
      if (process.env.NODE_ENV !== "production") {
        delete window.__mixamoRigDebug;
        delete window.__mixamoPauseDebug;
      }
      cancelAnimationFrame(frameId);
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
      <div className="mixamo-floor-glow" />
    </div>
  );
}
