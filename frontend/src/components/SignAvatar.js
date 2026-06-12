import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
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
  ASL: { label: "ASL", motion: "fingerspell", color: "#00d4ff", expression: "focus" },
};

const FINGER_NAMES = ["thumb", "index", "middle", "ring", "pinky"];

function getSignInfo(word) {
  const upper = word?.toUpperCase().replace(/[^A-Z]/g, "") || "";
  return (
    SIGN_MOTIONS[upper] || {
      label: upper || "Ready",
      motion: "fingerspell",
      color: "#94a3b8",
      expression: "neutral",
    }
  );
}

function normalizeGlossWord(word) {
  return word?.toUpperCase().replace(/[^A-Z]/g, "") || "";
}

async function loadSignClip(word) {
  const key = normalizeGlossWord(word);
  if (!key) return null;
  if (signClipCache.has(key)) return signClipCache.get(key);

  const promise = fetch(`/signs/${key}.json`)
    .then((response) => (response.ok ? response.json() : null))
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

  return { vrm, bones };
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

function applyVrmExpression(vrm, expression, time) {
  const manager = vrm.expressionManager;
  if (!manager) return;

  ["happy", "sad", "angry", "surprised", "relaxed", "aa", "ih", "ou", "blink"].forEach((name) => {
    manager.setValue(name, 0);
  });

  if (expression === "smile") manager.setValue("happy", 0.65);
  if (expression === "soft") manager.setValue("relaxed", 0.45);
  if (expression === "sad") manager.setValue("sad", 0.65);
  if (expression === "firm") manager.setValue("angry", 0.35);
  if (expression === "question") manager.setValue("surprised", 0.38);
  if (expression === "focus") manager.setValue("aa", 0.08 + Math.max(0, Math.sin(time * 5)) * 0.08);

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
    default:
      setBone(bones, "rightUpperArm", -0.08, -0.2, -0.48);
      setBone(bones, "rightLowerArm", -0.72, Math.cos(time * 8) * 0.08, 0.12);
      setBone(bones, "rightHand", -0.12, Math.sin(time * 8) * 0.12, -0.08);
      setVrmFingerPose(bones, "left", "relaxed");
      setVrmFingerPose(bones, "right", "spell");
      break;
  }
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

function SignAvatar3D({ signInfo, signClip, wordProgress, active }) {
  const canvasRef = useRef(null);
  const vrmPartsRef = useRef(null);
  const fallbackPartsRef = useRef(null);
  const signInfoRef = useRef(signInfo);
  const signClipRef = useRef(signClip);
  const wordProgressRef = useRef(wordProgress);
  const activeRef = useRef(active);

  useEffect(() => {
    signInfoRef.current = signInfo;
    signClipRef.current = signClip;
    wordProgressRef.current = wordProgress;
    activeRef.current = active;
  }, [signInfo, signClip, wordProgress, active]);

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
      const info = activeRef.current ? signInfoRef.current : {
        motion: "idle",
        color: "#64748b",
        expression: "neutral",
      };
      const clip = activeRef.current ? signClipRef.current : null;
      const progress = wordProgressRef.current || 0;

      rim.color.set(info.color);
      const delta = clock.getDelta();
      const vrmParts = vrmPartsRef.current;
      const fallbackParts = fallbackPartsRef.current;

      if (vrmParts) {
        if (!clip || !applyVrmClip(vrmParts, clip, progress, time)) {
          applyVrmMotion(vrmParts, info, time);
        }
        if (!activeRef.current) {
          setBone(vrmParts.bones, "head", 0, Math.sin(time * 0.9) * 0.08, 0);
        }
        vrmParts.vrm.update(delta);
      } else if (fallbackParts) {
        applyExpression(fallbackParts, info.expression, time);
        applyMotion(fallbackParts, info, time);

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

export default function SignAvatar({ caption, isActive, currentTime = 0 }) {
  const [signClip, setSignClip] = useState(null);
  const words = useMemo(() => caption?.words || [], [caption]);
  const wordIndex = useMemo(() => {
    if (!caption || !isActive || words.length === 0) return 0;

    const localMs = currentTime * 1000 - caption.start;
    const duration = Math.max(1, caption.end - caption.start);
    const progress = Math.max(0, Math.min(0.999, localMs / duration));
    return Math.min(words.length - 1, Math.floor(progress * words.length));
  }, [caption, currentTime, isActive, words.length]);
  const wordProgress = useMemo(() => {
    if (!caption || !isActive || words.length === 0) return 0;

    const localMs = currentTime * 1000 - caption.start;
    const duration = Math.max(1, caption.end - caption.start);
    const wordDuration = duration / words.length;
    const wordStart = wordIndex * wordDuration;
    return Math.max(0, Math.min(1, (localMs - wordStart) / wordDuration));
  }, [caption, currentTime, isActive, wordIndex, words.length]);
  const currentWord = words[wordIndex] || "";
  const signInfo = getSignInfo(currentWord);

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

  return (
    <div className="sign-avatar">
      <div className={`avatar-stage ${isActive ? "active" : "idle"}`}>
        <SignAvatar3D
          signInfo={signInfo}
          signClip={signClip}
          wordProgress={wordProgress}
          active={!!isActive}
        />
        <div className="avatar-depth-grid" />
      </div>

      {!isActive ? (
        <p className="idle-label">Waiting for processed captions...</p>
      ) : (
        <>
          <div className="word-indicator" style={{ borderColor: signInfo.color }}>
            <span className="word-text" style={{ color: signInfo.color }}>
              {currentWord || "..."}
            </span>
            <span className="motion-text">{signInfo.label}</span>
          </div>

          {words.length > 1 && (
            <div className="word-progress">
              {words.map((word, index) => (
                <div
                  key={`${word}-${index}`}
                  className={`word-dot ${index === wordIndex ? "active" : ""} ${
                    index < wordIndex ? "done" : ""
                  }`}
                  title={word}
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
                {word}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
