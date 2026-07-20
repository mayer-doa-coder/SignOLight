import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { effectiveNMM, resolveSignState } from "../services/timelineScheduler";
import "./SignAvatar.css";

const VRM_MODEL_URL = "/models/sign.vrm";
const signClipCache = new Map();

// Recolor the avatar's default white top. VRoid names the shirt material "...Tops..._CLOTH"
// (or "Onepiece" for dresses); we tint those material colors after load. Change this hex to
// pick a different outfit color.
const CLOTHING_COLOR = "#1f6feb"; // blue
function tintVrmClothing(vrm, colorHex) {
  const color = new THREE.Color(colorHex);
  vrm.scene.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m) return;
      const name = (m.name || "").toLowerCase();
      if (/tops|onepiece|dress|shirt|coat|jacket/.test(name)) {
        if (m.color) m.color.copy(color);
        if (m.uniforms?.litFactor?.value) m.uniforms.litFactor.value.copy(color);
        if (m.shadeColorFactor) m.shadeColorFactor.copy(color).multiplyScalar(0.85);
        m.needsUpdate = true;
      }
    });
  });
}

const SIGN_MOTIONS = {
  HELLO: { label: "Hello", motion: "wave", color: "#00d4ff", expression: "smile" },
  THANK: { label: "Thank You", motion: "chin-forward", color: "#10b981", expression: "soft" },
  YOU: { label: "You", motion: "point-out", color: "#7c3aed", expression: "focus" },
  ME: { label: "Me", motion: "point-self", color: "#f59e0b", expression: "focus" },
  YES: { label: "Yes", motion: "nod", color: "#10b981", expression: "smile" },
  NO: { label: "No", motion: "shake", color: "#ef4444", expression: "firm" },
  LEARN: { label: "Learn", motion: "asl-learn", color: "#00d4ff", expression: "focus" },
  KNOW: { label: "Know", motion: "asl-know", color: "#f59e0b", expression: "focus" },
  UNDERSTAND: { label: "Understand", motion: "asl-understand", color: "#7c3aed", expression: "smile" },
  GOOD: { label: "Good", motion: "thumbs", color: "#10b981", expression: "smile" },
  BAD: { label: "Bad", motion: "thumbs-down", color: "#ef4444", expression: "firm" },
  HELP: { label: "Help", motion: "lift", color: "#00d4ff", expression: "soft" },
  PLEASE: { label: "Please", motion: "circle-chest", color: "#f59e0b", expression: "soft" },
  SORRY: { label: "Sorry", motion: "fist-circle", color: "#8b5cf6", expression: "sad" },
  WHAT: { label: "What", motion: "asl-what", color: "#f59e0b", expression: "question" },
  WHERE: { label: "Where", motion: "waggle", color: "#f59e0b", expression: "question" },
  WHEN: { label: "When", motion: "circle-wrist", color: "#f59e0b", expression: "question" },
  HOW: { label: "How", motion: "knuckles", color: "#7c3aed", expression: "question" },
  WHY: { label: "Why", motion: "y-hand", color: "#f59e0b", expression: "question" },
  BECAUSE: { label: "Because", motion: "index-temple", color: "#00d4ff", expression: "focus" },
  SIGN: { label: "Sign", motion: "sign", color: "#00d4ff", expression: "smile" },
  ASL: { label: "ASL", motion: "sign", color: "#00d4ff", expression: "focus" },

  // === Academic / CS / Neural Networks domain vocabulary ===
  // These are educational gesture representations — not yet validated by an ASL community reviewer.
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
  IMAGE:       { label: "Image",       motion: "picture",       color: "#f59e0b", expression: "focus" },
  CLASSIFY:    { label: "Classify",    motion: "waggle",        color: "#6366f1", expression: "focus" },
  ACCURACY:    { label: "Accuracy",    motion: "thumbs",        color: "#10b981", expression: "smile" },
  PROBABILITY: { label: "Probability", motion: "shrug",         color: "#f59e0b", expression: "focus" },
  DEEP:        { label: "Deep",        motion: "tap-head",      color: "#a78bfa", expression: "focus" },
  CONNECT:     { label: "Connect",     motion: "connect",       color: "#22d3ee", expression: "focus" },
  NODE:        { label: "Node",        motion: "point-self",    color: "#6366f1", expression: "focus" },
  SIGNAL:      { label: "Signal",      motion: "wave",          color: "#22d3ee", expression: "focus" },
  PIXEL:       { label: "Pixel",       motion: "snap",          color: "#a78bfa", expression: "focus" },
  EXAMPLE:     { label: "Example",     motion: "teach",         color: "#7c3aed", expression: "focus" },
  PROCESS:     { label: "Process",     motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  STEP:        { label: "Step",        motion: "index-temple",  color: "#f59e0b", expression: "focus" },
  RESULT:      { label: "Result",      motion: "chin-forward",  color: "#10b981", expression: "smile" },
  PROBLEM:     { label: "Problem",     motion: "problem",       color: "#ef4444", expression: "firm"  },
  SOLUTION:    { label: "Solution",    motion: "thumbs",        color: "#10b981", expression: "smile" },
  COMPUTER:    { label: "Computer",    motion: "computer",      color: "#a78bfa", expression: "focus" },
  PROGRAM:     { label: "Program",     motion: "tap-head",      color: "#6366f1", expression: "focus" },

  // === General-purpose vocabulary (added for broader ASL caption coverage) ===
  // Reuses the same motion primitives above — approximate glosses, not literal ASL signs.
  I:           { label: "I",           motion: "point-self",    color: "#f59e0b", expression: "focus" },
  WE:          { label: "We",          motion: "circle-chest",  color: "#f59e0b", expression: "focus" },
  THEY:        { label: "They",        motion: "point-out",     color: "#f59e0b", expression: "focus" },
  HE:          { label: "He",          motion: "point-out",     color: "#7c3aed", expression: "focus" },
  SHE:         { label: "She",         motion: "point-out",     color: "#7c3aed", expression: "focus" },
  IT:          { label: "It",          motion: "point-out",     color: "#7c3aed", expression: "focus" },
  WANT:        { label: "Want",        motion: "asl-want",      color: "#00d4ff", expression: "focus" },
  LIKE:        { label: "Like",        motion: "asl-like",      color: "#10b981", expression: "smile" },
  THINK:       { label: "Think",       motion: "asl-think",     color: "#a78bfa", expression: "focus" },
  GO:          { label: "Go",          motion: "point-out",     color: "#22d3ee", expression: "focus" },
  COME:        { label: "Come",        motion: "point-self",    color: "#22d3ee", expression: "focus" },
  MAKE:        { label: "Make",        motion: "knuckles",      color: "#6366f1", expression: "focus" },
  USE:         { label: "Use",         motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  WORK:        { label: "Work",        motion: "knuckles",      color: "#10b981", expression: "focus" },
  NEED:        { label: "Need",        motion: "lift",          color: "#f59e0b", expression: "focus" },
  START:       { label: "Start",       motion: "snap",          color: "#10b981", expression: "focus" },
  STOP:        { label: "Stop",        motion: "shake",         color: "#ef4444", expression: "firm" },
  CHANGE:      { label: "Change",      motion: "waggle",        color: "#a78bfa", expression: "focus" },
  SHOW:        { label: "Show",        motion: "chin-forward",  color: "#00d4ff", expression: "focus" },
  EXPLAIN:     { label: "Explain",     motion: "spread-hands",  color: "#00d4ff", expression: "focus" },
  ASK:         { label: "Ask",         motion: "y-hand",        color: "#f59e0b", expression: "question" },
  ANSWER:      { label: "Answer",      motion: "chin-forward",  color: "#10b981", expression: "focus" },
  TEACH:       { label: "Teach",       motion: "teach",         color: "#7c3aed", expression: "focus" },
  STUDY:       { label: "Study",       motion: "asl-learn",     color: "#7c3aed", expression: "focus" },
  WRITE:       { label: "Write",       motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  READ:        { label: "Read",        motion: "flat-hand",     color: "#22d3ee", expression: "focus" },
  LOOK:        { label: "Look",        motion: "asl-see",       color: "#6366f1", expression: "focus" },
  SEE:         { label: "See",         motion: "asl-see",       color: "#6366f1", expression: "focus" },
  FIND:        { label: "Find",        motion: "picture",       color: "#22d3ee", expression: "focus" },
  GIVE:        { label: "Give",        motion: "lift",          color: "#10b981", expression: "soft" },
  TAKE:        { label: "Take",        motion: "point-self",    color: "#f59e0b", expression: "focus" },
  PUT:         { label: "Put",         motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  KEEP:        { label: "Keep",        motion: "circle-chest",  color: "#10b981", expression: "focus" },
  TRY:         { label: "Try",         motion: "knuckles",      color: "#f59e0b", expression: "focus" },
  CALL:        { label: "Call",        motion: "wave",          color: "#22d3ee", expression: "focus" },
  TIME:        { label: "Time",        motion: "circle-wrist",  color: "#f59e0b", expression: "focus" },
  DAY:         { label: "Day",         motion: "spread-hands",  color: "#f59e0b", expression: "focus" },
  YEAR:        { label: "Year",        motion: "circle-chest",  color: "#a78bfa", expression: "focus" },
  PEOPLE:      { label: "People",      motion: "spread-hands",  color: "#6366f1", expression: "focus" },
  THING:       { label: "Thing",       motion: "flat-hand",     color: "#64748b", expression: "focus" },
  WAY:         { label: "Way",         motion: "point-out",     color: "#22d3ee", expression: "focus" },
  PART:        { label: "Part",        motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  PLACE:       { label: "Place",       motion: "point-out",     color: "#10b981", expression: "focus" },
  WORD:        { label: "Word",        motion: "chin-forward",  color: "#7c3aed", expression: "focus" },
  IDEA:        { label: "Idea",        motion: "tap-head",      color: "#00d4ff", expression: "smile" },
  QUESTION:    { label: "Question",    motion: "shrug",         color: "#f59e0b", expression: "question" },
  REASON:      { label: "Reason",      motion: "index-temple",  color: "#a78bfa", expression: "focus" },
  TYPE:        { label: "Type",        motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  GROUP:       { label: "Group",       motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  LEVEL:       { label: "Level",       motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  SYSTEM:      { label: "System",      motion: "circle-wrist",  color: "#6366f1", expression: "focus" },
  WORLD:       { label: "World",       motion: "circle-chest",  color: "#10b981", expression: "focus" },
  NUMBER:      { label: "Number",      motion: "asl-number",    color: "#f59e0b", expression: "focus" },
  BIG:         { label: "Big",         motion: "spread-hands",  color: "#10b981", expression: "focus" },
  SMALL:       { label: "Small",       motion: "flat-hand",     color: "#22d3ee", expression: "focus" },
  MANY:        { label: "Many",        motion: "spread-hands",  color: "#f59e0b", expression: "focus" },
  MORE:        { label: "More",        motion: "asl-more",      color: "#10b981", expression: "focus" },
  LESS:        { label: "Less",        motion: "flat-hand",     color: "#ef4444", expression: "focus" },
  SAME:        { label: "Same",        motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  DIFFERENT:   { label: "Different",   motion: "waggle",        color: "#a78bfa", expression: "focus" },
  NEW:         { label: "New",         motion: "snap",          color: "#00d4ff", expression: "smile" },
  OLD:         { label: "Old",         motion: "tap-head",      color: "#64748b", expression: "focus" },
  IMPORTANT:   { label: "Important",   motion: "knuckles",      color: "#ef4444", expression: "firm" },
  EASY:        { label: "Easy",        motion: "flat-hand",     color: "#10b981", expression: "smile" },
  HARD:        { label: "Hard",        motion: "knuckles",      color: "#ef4444", expression: "firm" },
  TRUE:        { label: "True",        motion: "nod",           color: "#10b981", expression: "smile" },
  RIGHT:       { label: "Right",       motion: "thumbs",        color: "#10b981", expression: "smile" },
  WRONG:       { label: "Wrong",       motion: "thumbs-down",   color: "#ef4444", expression: "firm" },
  AND:         { label: "And",         motion: "circle-wrist",  color: "#64748b", expression: "neutral" },
  BUT:         { label: "But",         motion: "waggle",        color: "#64748b", expression: "neutral" },
  OR:          { label: "Or",          motion: "shrug",         color: "#64748b", expression: "question" },
  IF:          { label: "If",          motion: "shrug",         color: "#f59e0b", expression: "question" },
  SO:          { label: "So",          motion: "chin-forward",  color: "#64748b", expression: "neutral" },
  NOW:         { label: "Now",         motion: "point-self",    color: "#22d3ee", expression: "focus" },
  HERE:        { label: "Here",        motion: "point-self",    color: "#10b981", expression: "focus" },
  THERE:       { label: "There",       motion: "point-out",     color: "#10b981", expression: "focus" },
  ALSO:        { label: "Also",        motion: "lift",          color: "#64748b", expression: "focus" },
  VERY:        { label: "Very",        motion: "knuckles",      color: "#f59e0b", expression: "focus" },
  ALWAYS:      { label: "Always",      motion: "circle-chest",  color: "#10b981", expression: "focus" },
  AGAIN:       { label: "Again",       motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  ADD:         { label: "Add",         motion: "lift",          color: "#10b981", expression: "focus" },
  REMEMBER:    { label: "Remember",    motion: "asl-know",      color: "#7c3aed", expression: "focus" },
  BUILD:       { label: "Build",       motion: "knuckles",      color: "#6366f1", expression: "focus" },
  CONTINUE:    { label: "Continue",    motion: "point-out",     color: "#22d3ee", expression: "focus" },
  FINISH:      { label: "Finish",      motion: "chin-forward",  color: "#10b981", expression: "smile" },

  // === High-frequency words identified from the real demo lecture transcript ===
  // (backend/cache/aircAruvnKk.json) that had no dictionary sign at all — each
  // motion below is referenced against its real ASL sign, not a generic reuse.
  ONE:         { label: "One",         motion: "one",           color: "#f59e0b", expression: "focus" },
  ALL:         { label: "All",         motion: "all",           color: "#10b981", expression: "focus" },
  SOME:        { label: "Some",        motion: "some",          color: "#22d3ee", expression: "focus" },
  EACH:        { label: "Each",        motion: "each",          color: "#a78bfa", expression: "focus" },
  BETWEEN:     { label: "Between",     motion: "between",       color: "#6366f1", expression: "focus" },
  NOT:         { label: "Not",         motion: "asl-not",       color: "#ef4444", expression: "firm"  },
  OTHER:       { label: "Other",       motion: "other",         color: "#7c3aed", expression: "focus" },
  ANY:         { label: "Any",         motion: "any",           color: "#f59e0b", expression: "focus" },
  UP:          { label: "Up",          motion: "up",            color: "#10b981", expression: "focus" },
  DOWN:        { label: "Down",        motion: "down",          color: "#ef4444", expression: "focus" },

  // === Batch 2: next-highest-frequency transcript words with distinct authored signs ===
  FOR:         { label: "For",         motion: "asl-for",       color: "#6366f1", expression: "focus" },
  INTO:        { label: "Into",        motion: "into",          color: "#22d3ee", expression: "focus" },
  OUT:         { label: "Out",         motion: "out",           color: "#f59e0b", expression: "focus" },
  BACK:        { label: "Back",        motion: "back",          color: "#a78bfa", expression: "focus" },
  SUM:         { label: "Sum",         motion: "combine",       color: "#10b981", expression: "focus" },
  TOTAL:       { label: "Total",       motion: "combine",       color: "#10b981", expression: "focus" },
  COMBINE:     { label: "Combine",     motion: "combine",       color: "#10b981", expression: "focus" },
  TOGETHER:    { label: "Together",    motion: "combine",       color: "#10b981", expression: "focus" },
  MEAN:        { label: "Mean",        motion: "mean",          color: "#6366f1", expression: "focus" },
  POSITIVE:    { label: "Positive",    motion: "positive",      color: "#10b981", expression: "smile" },
  NEGATIVE:    { label: "Negative",    motion: "negative",      color: "#ef4444", expression: "firm"  },
  CAN:         { label: "Can",         motion: "can",           color: "#10b981", expression: "focus" },
  ABOUT:       { label: "About",       motion: "about",         color: "#22d3ee", expression: "focus" },
  FIRST:       { label: "First",       motion: "first",         color: "#f59e0b", expression: "focus" },
  REPRESENT:   { label: "Represent",   motion: "represent",     color: "#7c3aed", expression: "focus" },
  TWO:         { label: "Two",         motion: "fingerspell",   color: "#f59e0b", expression: "focus", letters: "2" },
  ZERO:        { label: "Zero",        motion: "fingerspell",   color: "#f59e0b", expression: "focus", letters: "0" },

  // === Batch 3: common words mapped to the closest existing motion primitive. ===
  // These are approximations (reused motion shapes), not individually validated ASL
  // signs — they exist so frequent words get a coherent gesture instead of fingerspelling.
  JUST:        { label: "Just",        motion: "flat-hand",     color: "#64748b", expression: "focus" },
  EVEN:        { label: "Even",        motion: "flat-hand",     color: "#64748b", expression: "focus" },
  THAN:        { label: "Than",        motion: "flat-hand",     color: "#64748b", expression: "focus" },
  LITTLE:      { label: "Little",      motion: "flat-hand",     color: "#22d3ee", expression: "focus" },
  LONG:        { label: "Long",        motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  LINE:        { label: "Line",        motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  EDGE:        { label: "Edge",        motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  HIDDEN:      { label: "Hidden",      motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  BASICALLY:   { label: "Basically",   motion: "flat-hand",     color: "#64748b", expression: "focus" },
  LINEAR:      { label: "Linear",      motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  HAND:        { label: "Hand",        motion: "flat-hand",     color: "#f0b28c", expression: "focus" },
  THESE:       { label: "These",       motion: "point-out",     color: "#22d3ee", expression: "focus" },
  THOSE:       { label: "Those",       motion: "point-out",     color: "#22d3ee", expression: "focus" },
  THEIR:       { label: "Their",       motion: "point-out",     color: "#22d3ee", expression: "focus" },
  THATS:       { label: "That's",      motion: "point-out",     color: "#22d3ee", expression: "focus" },
  SPECIFIC:    { label: "Specific",    motion: "point-out",     color: "#6366f1", expression: "focus" },
  PARTICULAR:  { label: "Particular",  motion: "point-out",     color: "#6366f1", expression: "focus" },
  POINT:       { label: "Point",       motion: "point-out",     color: "#f59e0b", expression: "focus" },
  PICK:        { label: "Pick",        motion: "point-out",     color: "#10b981", expression: "focus" },
  SECOND:      { label: "Second",      motion: "point-out",     color: "#f59e0b", expression: "focus" },
  DIGIT:       { label: "Digit",       motion: "knuckles",      color: "#f59e0b", expression: "focus" },
  CERTAIN:     { label: "Certain",     motion: "knuckles",      color: "#10b981", expression: "focus" },
  REALLY:      { label: "Really",      motion: "knuckles",      color: "#ef4444", expression: "firm"  },
  STRUCTURE:   { label: "Structure",   motion: "knuckles",      color: "#6366f1", expression: "focus" },
  CLOSE:       { label: "Close",       motion: "knuckles",      color: "#22d3ee", expression: "focus" },
  DO:          { label: "Do",          motion: "knuckles",      color: "#6366f1", expression: "focus" },
  DID:         { label: "Did",         motion: "shrug",         color: "#6366f1", expression: "focus" },
  NEURAL:      { label: "Neural",      motion: "tap-head",      color: "#22d3ee", expression: "focus" },
  BRAIN:       { label: "Brain",       motion: "asl-know",      color: "#22d3ee", expression: "focus" },
  RECOGNIZE:   { label: "Recognize",   motion: "asl-know",      color: "#7c3aed", expression: "focus" },
  HOPE:        { label: "Hope",        motion: "tap-head",      color: "#10b981", expression: "soft"  },
  MOTIVATED:   { label: "Motivated",   motion: "tap-head",      color: "#f59e0b", expression: "focus" },
  SAY:         { label: "Say",         motion: "chin-forward",  color: "#00d4ff", expression: "focus" },
  TELL:        { label: "Tell",        motion: "chin-forward",  color: "#00d4ff", expression: "focus" },
  FEED:        { label: "Feed",        motion: "chin-forward",  color: "#10b981", expression: "focus" },
  NEXT:        { label: "Next",        motion: "out",  color: "#22d3ee", expression: "focus" },
  THEN:        { label: "Then",        motion: "chin-forward",  color: "#64748b", expression: "focus" },
  WHO:         { label: "Who",         motion: "chin-forward",  color: "#f59e0b", expression: "question" },
  WELL:        { label: "Well",        motion: "spread-hands",  color: "#64748b", expression: "focus" },
  MUCH:        { label: "Much",        motion: "spread-hands",  color: "#f59e0b", expression: "focus" },
  LOT:         { label: "Lot",         motion: "spread-hands",  color: "#f59e0b", expression: "focus" },
  REGION:      { label: "Region",      motion: "spread-hands",  color: "#6366f1", expression: "focus" },
  KIND:        { label: "Kind",        motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  SORT:        { label: "Sort",        motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  FORM:        { label: "Form",        motion: "circle-chest",  color: "#a78bfa", expression: "focus" },
  OUR:         { label: "Our",         motion: "circle-chest",  color: "#10b981", expression: "focus" },
  INVOLVE:     { label: "Involve",     motion: "circle-chest",  color: "#6366f1", expression: "focus" },
  LOOP:        { label: "Loop",        motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  AROUND:      { label: "Around",      motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  MOMENT:      { label: "Moment",      motion: "circle-wrist",  color: "#f59e0b", expression: "focus" },
  EXACTLY:     { label: "Exactly",     motion: "snap",          color: "#22d3ee", expression: "focus" },
  FIRING:      { label: "Firing",      motion: "snap",          color: "#ef4444", expression: "focus" },
  ACTIVE:      { label: "Active",      motion: "snap",          color: "#22d3ee", expression: "smile" },
  ACTUALLY:    { label: "Actually",    motion: "y-hand",        color: "#f59e0b", expression: "focus" },
  AS:          { label: "As",          motion: "y-hand",        color: "#64748b", expression: "focus" },
  LAST:        { label: "Last",        motion: "y-hand",        color: "#a78bfa", expression: "focus" },
  WHICH:       { label: "Which",       motion: "shrug",         color: "#f59e0b", expression: "question" },
  WHETHER:     { label: "Whether",     motion: "shrug",         color: "#f59e0b", expression: "question" },
  MAYBE:       { label: "Maybe",       motion: "shrug",         color: "#f59e0b", expression: "question" },
  VALUE:       { label: "Value",       motion: "thumbs",        color: "#f59e0b", expression: "focus" },
  ABLE:        { label: "Able",        motion: "thumbs",        color: "#10b981", expression: "focus" },
  VIDEO:       { label: "Video",       motion: "computer",      color: "#f59e0b", expression: "focus" },
  IM:          { label: "I'm",         motion: "point-self",    color: "#f59e0b", expression: "focus" },
  ILL:         { label: "I'll",        motion: "point-self",    color: "#f59e0b", expression: "focus" },
  OWN:         { label: "Own",         motion: "point-self",    color: "#f59e0b", expression: "focus" },
  CONNECTION:  { label: "Connection",  motion: "connect",       color: "#22d3ee", expression: "focus" },
  RELEVANT:    { label: "Relevant",    motion: "connect",       color: "#22d3ee", expression: "focus" },
  VARIANT:     { label: "Variant",     motion: "waggle",        color: "#a78bfa", expression: "focus" },
  VARIOUS:     { label: "Various",     motion: "waggle",        color: "#a78bfa", expression: "focus" },
  LETS:        { label: "Let's",       motion: "lift",          color: "#10b981", expression: "focus" },
  HOLD:        { label: "Hold",        motion: "lift",          color: "#f59e0b", expression: "focus" },
  GET:         { label: "Get",         motion: "index-temple",  color: "#10b981", expression: "focus" },
  GIVEN:       { label: "Given",       motion: "lift",          color: "#10b981", expression: "soft"  },
  TOP:         { label: "Top",         motion: "up",            color: "#10b981", expression: "focus" },
  LOW:         { label: "Low",         motion: "down",          color: "#ef4444", expression: "focus" },
  COUPLE:      { label: "Couple",      motion: "some",          color: "#22d3ee", expression: "focus" },
  CHALLENGE:   { label: "Challenge",   motion: "problem",       color: "#ef4444", expression: "firm"  },
  DIFFICULT:   { label: "Difficult",   motion: "problem",       color: "#ef4444", expression: "firm"  },
  ONCE:        { label: "Once",        motion: "one",           color: "#f59e0b", expression: "focus" },
  BEFORE:      { label: "Before",      motion: "back",          color: "#a78bfa", expression: "focus" },
  BY:          { label: "By",          motion: "flat-hand",     color: "#64748b", expression: "focus" },
  ACCORDING:   { label: "According",   motion: "flat-hand",     color: "#64748b", expression: "focus" },
  YOUR:        { label: "Your",        motion: "point-out",     color: "#22d3ee", expression: "focus" },
  BREAK:       { label: "Break",       motion: "problem",       color: "#ef4444", expression: "focus" },
  COURSE:      { label: "Course",      motion: "learn",         color: "#00d4ff", expression: "focus" },
  DONT:        { label: "Don't",       motion: "asl-not",       color: "#ef4444", expression: "firm"  },
  ASSOCIATED:  { label: "Associated",  motion: "connect",       color: "#22d3ee", expression: "focus" },
  CORRESPOND:  { label: "Correspond",  motion: "connect",       color: "#22d3ee", expression: "focus" },
  JUMP:        { label: "Jump",        motion: "snap",          color: "#22d3ee", expression: "focus" },

  // === Batch 4: remaining common words from the transcript (jargon/names stay fingerspelled).
  MACHINE:     { label: "Machine",     motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  MATH:        { label: "Math",        motion: "tap-head",      color: "#a78bfa", expression: "focus" },
  FEEL:        { label: "Feel",        motion: "circle-chest",  color: "#10b981", expression: "focus" },
  COMPONENT:   { label: "Component",   motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  END:         { label: "End",         motion: "chin-forward",  color: "#64748b", expression: "focus" },
  TOWARDS:     { label: "Towards",     motion: "point-out",     color: "#22d3ee", expression: "focus" },
  MODERN:      { label: "Modern",      motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  STILL:       { label: "Still",       motion: "point-self",    color: "#64748b", expression: "focus" },
  INSIDE:      { label: "Inside",      motion: "into",          color: "#22d3ee", expression: "focus" },
  HIGH:        { label: "High",        motion: "up",            color: "#10b981", expression: "focus" },
  LIGHT:       { label: "Light",       motion: "snap",          color: "#f59e0b", expression: "smile" },
  BRING:       { label: "Bring",       motion: "lift",          color: "#10b981", expression: "focus" },
  LET:         { label: "Let",         motion: "lift",          color: "#10b981", expression: "focus" },
  AFTER:       { label: "After",       motion: "up",            color: "#64748b", expression: "focus" },
  TALK:        { label: "Talk",        motion: "chin-forward",  color: "#00d4ff", expression: "focus" },
  EXPECT:      { label: "Expect",      motion: "point-out",     color: "#f59e0b", expression: "focus" },
  MIDDLE:      { label: "Middle",      motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  ANOTHER:     { label: "Another",     motion: "other",         color: "#7c3aed", expression: "focus" },
  OFF:         { label: "Off",         motion: "down",          color: "#ef4444", expression: "focus" },
  THIRD:       { label: "Third",       motion: "point-out",     color: "#f59e0b", expression: "focus" },
  FINAL:       { label: "Final",       motion: "chin-forward",  color: "#10b981", expression: "smile" },
  GOAL:        { label: "Goal",        motion: "point-out",     color: "#f59e0b", expression: "focus" },
  IMAGINE:     { label: "Imagine",     motion: "tap-head",      color: "#00d4ff", expression: "smile" },
  RECOGNITION: { label: "Recognition", motion: "asl-know",      color: "#7c3aed", expression: "focus" },
  COMPUTE:     { label: "Compute",     motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  ALMOST:      { label: "Almost",      motion: "flat-hand",     color: "#64748b", expression: "focus" },
  CARE:        { label: "Care",        motion: "knuckles",      color: "#10b981", expression: "focus" },
  COMMON:      { label: "Common",      motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  BIGGER:      { label: "Bigger",      motion: "spread-hands",  color: "#10b981", expression: "focus" },
  SAID:        { label: "Said",        motion: "chin-forward",  color: "#00d4ff", expression: "focus" },
  FULL:        { label: "Full",        motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  PRODUCT:     { label: "Product",     motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  SERIES:      { label: "Series",      motion: "spread-hands",  color: "#6366f1", expression: "focus" },
  EXPRESSION:  { label: "Expression",  motion: "spread-hands",  color: "#a78bfa", expression: "focus" },
  ENTIRE:      { label: "Entire",      motion: "all",           color: "#10b981", expression: "focus" },
  PREVIOUS:    { label: "Previous",    motion: "back",          color: "#a78bfa", expression: "focus" },
  SIMPLE:      { label: "Simple",      motion: "flat-hand",     color: "#10b981", expression: "smile" },
  PIECE:       { label: "Piece",       motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  DETERMINE:   { label: "Determine",   motion: "knuckles",      color: "#6366f1", expression: "focus" },
  MECHANISM:   { label: "Mechanism",   motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  BEHAVE:      { label: "Behave",      motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  CHOICE:      { label: "Choice",      motion: "thumbs",        color: "#f59e0b", expression: "focus" },
  CHOSE:       { label: "Chose",       motion: "thumbs",        color: "#f59e0b", expression: "focus" },
  CHOOSE:      { label: "Choose",      motion: "thumbs",        color: "#f59e0b", expression: "focus" },
  NICE:        { label: "Nice",        motion: "flat-hand",     color: "#10b981", expression: "smile" },
  EXPERIMENT:  { label: "Experiment",  motion: "knuckles",      color: "#a78bfa", expression: "focus" },
  WRAP:        { label: "Wrap",        motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  BUNCH:       { label: "Bunch",       motion: "spread-hands",  color: "#f59e0b", expression: "focus" },
  CAUSE:       { label: "Cause",       motion: "knuckles",      color: "#6366f1", expression: "focus" },
  INFLUENCE:   { label: "Influence",   motion: "connect",       color: "#22d3ee", expression: "focus" },
  REASONABLE:  { label: "Reasonable",  motion: "index-temple",  color: "#a78bfa", expression: "focus" },
  SETTING:     { label: "Setting",     motion: "flat-hand",     color: "#6366f1", expression: "focus" },
  RATHER:      { label: "Rather",      motion: "shrug",         color: "#64748b", expression: "focus" },
  ORGANIZE:    { label: "Organize",    motion: "knuckles",      color: "#6366f1", expression: "focus" },
  DIAL:        { label: "Dial",        motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  KNOB:        { label: "Knob",        motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  INDICATE:    { label: "Indicate",    motion: "point-out",     color: "#f59e0b", expression: "focus" },
  SURROUNDING: { label: "Surrounding", motion: "circle-wrist",  color: "#22d3ee", expression: "focus" },
  INACTIVE:    { label: "Inactive",    motion: "thumbs-down",   color: "#ef4444", expression: "firm"  },
  HANDWRITTEN: { label: "Handwritten", motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  PARAMETER:   { label: "Parameter",   motion: "circle-wrist",  color: "#6366f1", expression: "focus" },
  LETTER:      { label: "Letter",      motion: "flat-hand",     color: "#a78bfa", expression: "focus" },
  BEHAVIOR:    { label: "Behavior",    motion: "circle-chest",  color: "#22d3ee", expression: "focus" },
  EXTREME:     { label: "Extreme",     motion: "knuckles",      color: "#ef4444", expression: "firm"  },
  BRIGHT:      { label: "Bright",      motion: "snap",          color: "#f59e0b", expression: "smile" },
  STAY:        { label: "Stay",        motion: "point-self",    color: "#64748b", expression: "focus" },
  EITHER:      { label: "Either",      motion: "shrug",         color: "#f59e0b", expression: "question" },
  YEAH:        { label: "Yeah",        motion: "nod",           color: "#10b981", expression: "smile" },
  SUBSCRIBE:   { label: "Subscribe",   motion: "knuckles",      color: "#6366f1", expression: "focus" },
  COMPLICATED: { label: "Complicated", motion: "problem",       color: "#ef4444", expression: "firm"  },
  ANALOGY:     { label: "Analogy",     motion: "connect",       color: "#22d3ee", expression: "focus" },
  YOUVE:       { label: "You've",      motion: "point-out",     color: "#22d3ee", expression: "focus" },
  YOURE:       { label: "You're",      motion: "point-out",     color: "#22d3ee", expression: "focus" },

  // === Physics / mechanics domain vocabulary (lecture caption expansion) ===
  FORCE: { label: "Force", motion: "knuckles", color: "#3b82f6", expression: "focus" },
  MOTION: { label: "Motion", motion: "circle-wrist", color: "#3b82f6", expression: "focus" },
  OBJECT: { label: "Object", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  MOVE: { label: "Move", motion: "waggle", color: "#3b82f6", expression: "focus" },
  PUSH: { label: "Push", motion: "out", color: "#3b82f6", expression: "focus" },
  PULL: { label: "Pull", motion: "into", color: "#3b82f6", expression: "focus" },
  PRESSURE: { label: "Pressure", motion: "problem", color: "#3b82f6", expression: "focus" },
  AREA: { label: "Area", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  VELOCITY: { label: "Velocity", motion: "snap", color: "#3b82f6", expression: "focus" },
  SPEED: { label: "Speed", motion: "snap", color: "#3b82f6", expression: "focus" },
  ACCELERATE: { label: "Accelerate", motion: "up", color: "#3b82f6", expression: "focus" },
  MASS: { label: "Mass", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  INERTIA: { label: "Inertia", motion: "problem", color: "#ef4444", expression: "firm" },
  FRICTION: { label: "Friction", motion: "waggle", color: "#ef4444", expression: "firm" },
  RESISTANCE: { label: "Resistance", motion: "shake", color: "#ef4444", expression: "firm" },
  RESIST: { label: "Resist", motion: "shake", color: "#ef4444", expression: "firm" },
  GRAVITY: { label: "Gravity", motion: "down", color: "#3b82f6", expression: "focus" },
  BALANCE: { label: "Balance", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  STATIONARY: { label: "Stationary", motion: "point-self", color: "#3b82f6", expression: "focus" },
  REST: { label: "Rest", motion: "point-self", color: "#3b82f6", expression: "focus" },
  UNIFORM: { label: "Uniform", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  CONSTANT: { label: "Constant", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  INCREASE: { label: "Increase", motion: "up", color: "#3b82f6", expression: "focus" },
  DECREASE: { label: "Decrease", motion: "down", color: "#3b82f6", expression: "focus" },
  NORMAL: { label: "Normal", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  DIRECTION: { label: "Direction", motion: "point-out", color: "#3b82f6", expression: "focus" },
  MAGNITUDE: { label: "Magnitude", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  DISPLACEMENT: { label: "Displacement", motion: "y-hand", color: "#3b82f6", expression: "focus" },
  SURFACE: { label: "Surface", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  GROUND: { label: "Ground", motion: "down", color: "#3b82f6", expression: "focus" },
  WALL: { label: "Wall", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  NAIL: { label: "Nail", motion: "point-out", color: "#3b82f6", expression: "focus" },
  HAMMER: { label: "Hammer", motion: "knuckles", color: "#3b82f6", expression: "focus" },
  TIP: { label: "Tip", motion: "y-hand", color: "#3b82f6", expression: "focus" },
  SHARP: { label: "Sharp", motion: "snap", color: "#3b82f6", expression: "focus" },
  FLAT: { label: "Flat", motion: "combine", color: "#3b82f6", expression: "focus" },
  CONTACT: { label: "Contact", motion: "connect", color: "#3b82f6", expression: "focus" },
  APPLY: { label: "Apply", motion: "circle-wrist", color: "#3b82f6", expression: "focus" },
  ACT: { label: "Act", motion: "fist-circle", color: "#3b82f6", expression: "focus" },
  EXERT: { label: "Exert", motion: "circle-wrist", color: "#3b82f6", expression: "focus" },
  INTERACT: { label: "Interact", motion: "connect", color: "#3b82f6", expression: "focus" },
  CAR: { label: "Car", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  ENGINE: { label: "Engine", motion: "computer", color: "#3b82f6", expression: "focus" },
  WHEEL: { label: "Wheel", motion: "circle-wrist", color: "#3b82f6", expression: "focus" },
  TRACK: { label: "Track", motion: "picture", color: "#3b82f6", expression: "focus" },
  SHIP: { label: "Ship", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  SPACESHIP: { label: "Spaceship", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  PLANE: { label: "Plane", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  BALL: { label: "Ball", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  PUCK: { label: "Puck", motion: "one", color: "#3b82f6", expression: "focus" },
  ICE: { label: "Ice", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  SNOW: { label: "Snow", motion: "picture", color: "#3b82f6", expression: "focus" },
  SLIPPERY: { label: "Slippery", motion: "waggle", color: "#3b82f6", expression: "focus" },
  GLIDE: { label: "Glide", motion: "waggle", color: "#3b82f6", expression: "focus" },
  ROLL: { label: "Roll", motion: "circle-wrist", color: "#3b82f6", expression: "focus" },
  THROW: { label: "Throw", motion: "out", color: "#3b82f6", expression: "focus" },
  KICK: { label: "Kick", motion: "out", color: "#3b82f6", expression: "focus" },
  KNIFE: { label: "Knife", motion: "knuckles", color: "#3b82f6", expression: "focus" },
  AXE: { label: "Axe", motion: "knuckles", color: "#3b82f6", expression: "focus" },
  DRILL: { label: "Drill", motion: "knuckles", color: "#3b82f6", expression: "focus" },
  PENETRATE: { label: "Penetrate", motion: "into", color: "#3b82f6", expression: "focus" },
  PIERCE: { label: "Pierce", motion: "into", color: "#3b82f6", expression: "focus" },
  CUT: { label: "Cut", motion: "into", color: "#3b82f6", expression: "focus" },
  VACUUM: { label: "Vacuum", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  PLANET: { label: "Planet", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  STAR: { label: "Star", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  ASTEROID: { label: "Asteroid", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  SATELLITE: { label: "Satellite", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  SPACE: { label: "Space", motion: "spread-hands", color: "#3b82f6", expression: "focus" },
  FLOOR: { label: "Floor", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  TABLE: { label: "Table", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  HORIZONTAL: { label: "Horizontal", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  STRAIGHT: { label: "Straight", motion: "flat-hand", color: "#3b82f6", expression: "focus" },
  PATH: { label: "Path", motion: "point-out", color: "#3b82f6", expression: "focus" },
  REFERENCE: { label: "Reference", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  FRAME: { label: "Frame", motion: "combine", color: "#3b82f6", expression: "focus" },
  CRASH: { label: "Crash", motion: "problem", color: "#ef4444", expression: "firm" },
  IMPACT: { label: "Impact", motion: "problem", color: "#ef4444", expression: "firm" },
  ACCIDENT: { label: "Accident", motion: "problem", color: "#ef4444", expression: "firm" },
  RUN: { label: "Run", motion: "out", color: "#3b82f6", expression: "focus" },
  LEFT: { label: "Left", motion: "point-out", color: "#3b82f6", expression: "focus" },
  SIDE: { label: "Side", motion: "point-out", color: "#3b82f6", expression: "focus" },
  TOUCH: { label: "Touch", motion: "connect", color: "#3b82f6", expression: "focus" },
  STRONG: { label: "Strong", motion: "knuckles", color: "#3b82f6", expression: "focus" },
  HIT: { label: "Hit", motion: "knuckles", color: "#3b82f6", expression: "firm" },
  METER: { label: "Meter", motion: "asl-number", color: "#3b82f6", expression: "focus" },
  CASE: { label: "Case", motion: "circle-chest", color: "#3b82f6", expression: "focus" },
  HAPPEN: { label: "Happen", motion: "waggle", color: "#3b82f6", expression: "focus" },

  // === Biology domain vocabulary (lecture caption expansion) ===
  PLANT: { label: "Plant", motion: "up", color: "#22c55e", expression: "focus" },
  ENERGY: { label: "Energy", motion: "wave", color: "#22c55e", expression: "focus" },
  CYCLE: { label: "Cycle", motion: "circle-wrist", color: "#22c55e", expression: "focus" },
  INDEPENDENT: { label: "Independent", motion: "point-self", color: "#22c55e", expression: "focus" },
  ADAPTATION: { label: "Adaptation", motion: "waggle", color: "#22c55e", expression: "focus" },
  ANIMAL: { label: "Animal", motion: "circle-chest", color: "#22c55e", expression: "focus" },
  HUMAN: { label: "Human", motion: "circle-chest", color: "#22c55e", expression: "focus" },
  ORGANISM: { label: "Organism", motion: "circle-chest", color: "#22c55e", expression: "focus" },
  WATER: { label: "Water", motion: "flat-hand", color: "#22c55e", expression: "focus" },
  LEAF: { label: "Leaf", motion: "flat-hand", color: "#22c55e", expression: "focus" },
  FLY: { label: "Fly", motion: "up", color: "#22c55e", expression: "focus" },
  ABILITY: { label: "Ability", motion: "thumbs", color: "#22c55e", expression: "smile" },
  BENEFIT: { label: "Benefit", motion: "thumbs", color: "#22c55e", expression: "smile" },
  GREATLY: { label: "Greatly", motion: "knuckles", color: "#22c55e", expression: "focus" },
  BODY: { label: "Body", motion: "circle-chest", color: "#22c55e", expression: "focus" },
  EARTH: { label: "Earth", motion: "spread-hands", color: "#22c55e", expression: "focus" },
  WIND: { label: "Wind", motion: "waggle", color: "#22c55e", expression: "focus" },
  ATMOSPHERE: { label: "Atmosphere", motion: "some", color: "#22c55e", expression: "focus" },

  // === AI/LLM + general vocabulary (lecture caption expansion) ===
  TEXT: { label: "Text", motion: "flat-hand", color: "#6366f1", expression: "focus" },
  TRANSFORMER: { label: "Transformer", motion: "spread-hands", color: "#6366f1", expression: "focus" },
  ATTENTION: { label: "Attention", motion: "point-out", color: "#6366f1", expression: "focus" },
  PREFER: { label: "Prefer", motion: "thumbs", color: "#6366f1", expression: "smile" },
  LARGE: { label: "Large", motion: "spread-hands", color: "#6366f1", expression: "focus" },
  USEFUL: { label: "Useful", motion: "thumbs", color: "#6366f1", expression: "smile" },
  LANGUAGE: { label: "Language", motion: "sign", color: "#6366f1", expression: "focus" },
  GENERATE: { label: "Generate", motion: "snap", color: "#6366f1", expression: "focus" },
  POWER: { label: "Power", motion: "knuckles", color: "#6366f1", expression: "focus" },
  FEEDBACK: { label: "Feedback", motion: "chin-forward", color: "#6366f1", expression: "focus" },
  CHIP: { label: "Chip", motion: "flat-hand", color: "#6366f1", expression: "focus" },
  PERSON: { label: "Person", motion: "point-out", color: "#6366f1", expression: "focus" },
  ASSISTANT: { label: "Assistant", motion: "lift", color: "#6366f1", expression: "focus" },
  AI: { label: "AI", motion: "sign", color: "#6366f1", expression: "focus" },
  CHATBOT: { label: "Chatbot", motion: "computer", color: "#6366f1", expression: "focus" },
  INTERNET: { label: "Internet", motion: "spread-hands", color: "#6366f1", expression: "focus" },
  SCRIPT: { label: "Script", motion: "flat-hand", color: "#6366f1", expression: "focus" },
  LIST: { label: "List", motion: "flat-hand", color: "#6366f1", expression: "focus" },
  THOUSAND: { label: "Thousand", motion: "asl-number", color: "#6366f1", expression: "focus" },
  BILLION: { label: "Billion", motion: "asl-number", color: "#6366f1", expression: "focus" },
  FEW: { label: "Few", motion: "some", color: "#6366f1", expression: "focus" },
  GAVE: { label: "Gave", motion: "lift", color: "#6366f1", expression: "focus" },
  ONLY: { label: "Only", motion: "point-self", color: "#6366f1", expression: "focus" },
  BOTH: { label: "Both", motion: "combine", color: "#6366f1", expression: "focus" },
  THROUGH: { label: "Through", motion: "into", color: "#6366f1", expression: "focus" },

  // Common general-content verbs (simpleGloss's verbSet lists these for SOV reordering,
  // so a real sign must exist or they fall to [CONCEPT:x] — WINNER etc. lemmatize to these).
  WIN: { label: "Win", motion: "thumbs", color: "#6366f1", expression: "smile" },
  LOSE: { label: "Lose", motion: "thumbs-down", color: "#6366f1", expression: "firm" },
  PLAY: { label: "Play", motion: "snap", color: "#6366f1", expression: "smile" },
  LIVE: { label: "Live", motion: "point-self", color: "#6366f1", expression: "focus" },
  LOVE: { label: "Love", motion: "circle-chest", color: "#6366f1", expression: "smile" },
  HATE: { label: "Hate", motion: "thumbs-down", color: "#6366f1", expression: "firm" },
  SING: { label: "Sing", motion: "chin-forward", color: "#6366f1", expression: "smile" },
  BUY: { label: "Buy", motion: "lift", color: "#6366f1", expression: "focus" },
  SPEAK: { label: "Speak", motion: "chin-forward", color: "#6366f1", expression: "focus" },
  OPEN: { label: "Open", motion: "out", color: "#6366f1", expression: "focus" },
  WATCH: { label: "Watch", motion: "asl-see", color: "#6366f1", expression: "focus" },

  // Remaining verbSet entries missing a real sign (same reasoning as above) plus DESCENT,
  // the noun half of "gradient descent" — core to the project's own neural-network demo.
  DEFINE: { label: "Define", motion: "y-hand", color: "#6366f1", expression: "focus" },
  MINIMIZE: { label: "Minimize", motion: "down", color: "#6366f1", expression: "focus" },
  MAXIMIZE: { label: "Maximize", motion: "up", color: "#6366f1", expression: "focus" },
  OPTIMIZE: { label: "Optimize", motion: "knuckles", color: "#6366f1", expression: "focus" },
  ADJUST: { label: "Adjust", motion: "waggle", color: "#6366f1", expression: "focus" },
  UPDATE: { label: "Update", motion: "snap", color: "#6366f1", expression: "focus" },
  CONVERT: { label: "Convert", motion: "waggle", color: "#6366f1", expression: "focus" },
  PRODUCE: { label: "Produce", motion: "knuckles", color: "#6366f1", expression: "focus" },
  BECOME: { label: "Become", motion: "waggle", color: "#6366f1", expression: "focus" },
  ALLOW: { label: "Allow", motion: "thumbs", color: "#6366f1", expression: "smile" },
  PASS: { label: "Pass", motion: "out", color: "#6366f1", expression: "focus" },
  DESCENT: { label: "Descent", motion: "down", color: "#6366f1", expression: "focus" },
};

const FINGER_NAMES = ["thumb", "index", "middle", "ring", "pinky"];

// Reclaims dictionary signs for common inflected forms (plurals, -ing/-ed, -tion) that
// don't exact-match a SIGN_MOTIONS key — e.g. "NEURONS"/"WEIGHTS"/"ACTIVATIONS" should
// sign as NEURON/WEIGHT/ACTIVATE rather than fall through to fingerspelling. Measured
// against the actual demo lecture transcript, this alone recovers ~6.5% of all word
// occurrences with zero new hand-authored motions.
function lemmatizeForDictionary(word) {
  const candidates = [];
  if (word.endsWith("IES")) candidates.push(word.slice(0, -3) + "Y");
  if (word.endsWith("TIONS")) candidates.push(word.slice(0, -5) + "TE");
  if (word.endsWith("TION")) candidates.push(word.slice(0, -4) + "TE");
  // -ION/-IONS off a base verb: CONNECTIONS→CONNECTION→CONNECT (base is in dict).
  if (word.endsWith("IONS")) candidates.push(word.slice(0, -4));
  if (word.endsWith("ION")) candidates.push(word.slice(0, -3));
  if (word.endsWith("ES")) candidates.push(word.slice(0, -2));
  if (word.endsWith("S") && word.length > 3) candidates.push(word.slice(0, -1));
  if (word.endsWith("ING")) {
    candidates.push(word.slice(0, -3));
    candidates.push(word.slice(0, -3) + "E");
    // Doubled final consonant: GETTING→GET, RUNNING→RUN, SETTING→SET.
    const stem = word.slice(0, -3);
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) candidates.push(stem.slice(0, -1));
  }
  if (word.endsWith("ED")) {
    candidates.push(word.slice(0, -2));
    candidates.push(word.slice(0, -1));
    const stem = word.slice(0, -2);
    if (stem.length > 1 && stem[stem.length - 1] === stem[stem.length - 2]) candidates.push(stem.slice(0, -1));
  }
  if (word.endsWith("LY")) candidates.push(word.slice(0, -2));
  if (word.endsWith("ER") && word.length > 3) {
    candidates.push(word.slice(0, -2));   // TEACHER→TEACH
    candidates.push(word.slice(0, -1));   // SIMPLER→SIMPLE
    const s = word.slice(0, -2);          // BIGGER→BIG (doubled consonant)
    if (s.length > 1 && s[s.length - 1] === s[s.length - 2]) candidates.push(s.slice(0, -1));
  }
  if (word.endsWith("EST") && word.length > 4) {
    candidates.push(word.slice(0, -3));   // FASTEST→FAST
    candidates.push(word.slice(0, -2));   // SIMPLEST→SIMPLE
  }
  for (const candidate of candidates) {
    if (SIGN_MOTIONS[candidate]) return SIGN_MOTIONS[candidate];
  }
  return null;
}

// Extract the spellable characters from any gloss token, for fingerspelling.
// [FINGERSPELL:GPT] -> "GPT", [NUMBER:42] -> "42", [CONCEPT:mathematics] -> "MATHEMATICS",
// HELLO -> "HELLO". Returns "" when nothing spellable remains.
function glossWordToLetters(word) {
  const s = String(word || "").trim().toUpperCase();
  const tag = s.match(/^\[(?:FINGERSPELL|CONCEPT|NUMBER):(.+)\]$/);
  const inner = tag ? tag[1] : s;
  return inner.replace(/[^A-Z0-9]/g, "");
}

function getSignInfo(word, fingerspellMode = false) {
  const s = String(word || "").trim().toUpperCase();
  if (!s) {
    return { label: "Ready", motion: "idle", color: "#64748b", expression: "neutral" };
  }

  const fsMatch = s.match(/^\[FINGERSPELL:([A-Z0-9]+)\]$/);
  const conceptMatch = s.match(/^\[CONCEPT:(.+)\]$/);
  const numMatch = s.match(/^\[NUMBER:(\d+)\]$/);

  // Fingerspell mode: every word is spelled out letter-by-letter so the viewer can
  // verify each handshape. Even concept/number tags are spelled by their inner text.
  if (fingerspellMode) {
    const letters = glossWordToLetters(s);
    if (letters) {
      return { label: letters, motion: "fingerspell", color: "#38bdf8", expression: "focus", letters };
    }
    return { label: s, motion: "idle", color: "#64748b", expression: "neutral" };
  }

  // Normal mode: proper nouns, numbers, and concepts without an authored sign
  // fingerspell automatically so an unknown word never becomes a silent avatar pause.
  if (fsMatch || numMatch || conceptMatch) {
    const letters = glossWordToLetters(s);
    return { label: letters, motion: "fingerspell", color: "#38bdf8", expression: "focus", letters };
  }

  const upper = s.replace(/[^A-Z]/g, "");
  if (SIGN_MOTIONS[upper]) return SIGN_MOTIONS[upper];
  const lemma = lemmatizeForDictionary(upper);
  if (lemma) return lemma;

  // No dictionary sign available for this word (and no inflected form matched one either).
  // Spell it rather than pausing silently.
  return {
    label: upper || s.slice(0, 20),
    motion: "fingerspell",
    color: "#38bdf8",
    expression: "focus",
    letters: upper,
  };
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

// JSON clips (public/signs/*.json) were authored against an incorrect rest-pose assumption
// (arms out in a T-pose) and render broken on this VRM rig. Until they are re-authored to the
// corrected signing-space convention, they are disabled and every word uses the procedural
// gesture system in applyVrmMotion, which keeps the avatar consistent. Files are kept intact;
// flip this flag to re-enable clip playback once the clips are fixed.
const SIGN_CLIPS_ENABLED = false;

async function loadSignClip(word) {
  if (!SIGN_CLIPS_ENABLED) return null;
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
    // ASL number handshapes (2,3,5–9) — approximated with single-axis finger curl;
    // the rig can't model true thumb-to-fingertip contact for 6–9, so those use the
    // matching finger curled toward center as the closest available approximation.
    two: { thumb: 0.5, index: 0.0, middle: 0.0, ring: 1.2, pinky: 1.2 },
    three: { thumb: -0.3, index: 0.0, middle: 0.0, ring: 1.2, pinky: 1.2 },
    five: { thumb: 0.15, index: 0.0, middle: 0.0, ring: 0.0, pinky: 0.05 },
    six: { thumb: 0.6, index: 0.0, middle: 0.0, ring: 0.0, pinky: 1.1 },
    seven: { thumb: 0.55, index: 0.0, middle: 0.0, ring: 0.9, pinky: 0.0 },
    eight: { thumb: 0.5, index: 0.0, middle: 0.85, ring: 0.0, pinky: 0.0 },
    nine: { thumb: 0.5, index: 0.85, middle: 0.0, ring: 0.0, pinky: 0.0 },
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
// These are NOT validated ASL manual alphabet shapes — the letter ticker carries the meaning.
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

// Real ASL number handshapes 0–9 (standard convention: 1–5 count up on extended
// fingers, 6–9 are thumb touching a fingertip — approximated per the pose comment
// above). Held with a neutral wrist, unlike fingerspelled letters, matching how
// ASL numbers are actually signed (steady handshape, not wrist-oriented).
const NUMBER_HANDSHAPES = {
  0: { pose: "spell", wristX: 0, wristY: 0, wristZ: 0 },
  1: { pose: "point", wristX: 0, wristY: 0, wristZ: 0 },
  2: { pose: "two",   wristX: 0, wristY: 0, wristZ: 0 },
  3: { pose: "three", wristX: 0, wristY: 0, wristZ: 0 },
  4: { pose: "flat",  wristX: 0, wristY: 0, wristZ: 0 },
  5: { pose: "five",  wristX: 0, wristY: 0, wristZ: 0 },
  6: { pose: "six",   wristX: 0, wristY: 0, wristZ: 0 },
  7: { pose: "seven", wristX: 0, wristY: 0, wristZ: 0 },
  8: { pose: "eight", wristX: 0, wristY: 0, wristZ: 0 },
  9: { pose: "nine",  wristX: 0, wristY: 0, wristZ: 0 },
};

// Map a word's progress (0→1 across its time window) to the current fingerspelled letter.
// Using progress instead of global animation time guarantees EVERY letter is shown within
// the window, evenly spaced — the old `Math.floor(time * 3)` cycling dropped letters whenever
// a word's window was shorter than letters/3 seconds, so long words never fully spelled out.
// Returns [letterIndex, intraLetterPhase(0→1), handshape].
function fingerspellFrame(signInfo, progress) {
  const letters = (signInfo.letters || "A")
    .toUpperCase()
    .split("")
    .filter((l) => /[A-Z0-9]/.test(l));
  const n = letters.length || 1;
  const clamped = Math.max(0, Math.min(0.999999, progress || 0));
  const raw = clamped * n;
  const idx = Math.min(n - 1, Math.floor(raw));
  const intra = raw - Math.floor(raw);
  const ch = letters[idx] || "A";
  const shape =
    (/[0-9]/.test(ch) ? NUMBER_HANDSHAPES[ch] : FINGERSPELL_HANDSHAPES[ch]) ||
    FINGERSPELL_HANDSHAPES.A;
  return [idx, intra, shape];
}

function applyMotion(parts, signInfo, time, progress = 0) {
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
    // COMPUTER — referenced ASL sign: non-dominant hand flat/palm-down, dominant hand
    // forms a "C" and brushes in a small circle on the wrist (lifeprint.com/asl101).
    case "computer":
      setEuler(parts.left.shoulder, -0.35, 0.05, 0.65);
      setEuler(parts.left.elbow, -0.15, 0.0, -0.05);
      parts.left.hand.rotation.set(0.1, 0, 0.1);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.45, -0.15, -0.5);
      setEuler(parts.right.elbow, -0.55, 0.0, 0.15);
      parts.right.hand.position.x = -0.18 + Math.cos(time * 5) * 0.05;
      parts.right.hand.position.z = 0.05 + Math.sin(time * 5) * 0.05;
      setFingerPose(parts.right.hand, "spell");
      break;
    // CONNECT — referenced ASL sign: both hands (hooked index fingers) start apart
    // and move together at chest center until they link.
    case "connect": {
      const converge = (Math.sin(time * 2.2) + 1) / 2;
      setEuler(parts.left.shoulder, -0.35, 0.1, 0.55);
      setEuler(parts.right.shoulder, -0.35, -0.1, -0.55);
      parts.left.hand.position.x = 0.16 - converge * 0.16;
      parts.right.hand.position.x = -0.16 + converge * 0.16;
      setFingerPose(parts.left.hand, "point");
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // PROBLEM — referenced ASL sign: both fists' knuckles meet in front of the body
    // and twist against each other.
    case "problem":
      setEuler(parts.left.shoulder, -0.55, 0.1, 0.5);
      setEuler(parts.left.elbow, -0.7, 0.0, -0.1);
      setEuler(parts.right.shoulder, -0.55, -0.1, -0.5);
      setEuler(parts.right.elbow, -0.7, 0.0, 0.1);
      parts.left.hand.rotation.z = Math.sin(time * 7) * 0.25;
      parts.right.hand.rotation.z = -Math.sin(time * 7) * 0.25;
      setFingerPose(parts.left.hand, "fist");
      setFingerPose(parts.right.hand, "fist");
      break;
    // PICTURE/IMAGE — referenced ASL sign: non-dominant hand held flat as a "frame",
    // dominant hand moves from near the face outward to meet it, camera-like.
    case "picture": {
      const click = Math.max(0, Math.sin(time * 3));
      setEuler(parts.left.shoulder, -0.3, 0.2, 0.75);
      setEuler(parts.left.elbow, -0.65, 0.0, -0.05);
      parts.left.hand.rotation.set(0, 0, 0.15);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -1.05, -0.1, -0.55);
      setEuler(parts.right.elbow, -0.55 - click * 0.35, 0.0, 0.1);
      parts.right.hand.rotation.set(0, 0, -0.15);
      setFingerPose(parts.right.hand, "flat");
      break;
    }
    // TEACH — referenced ASL sign: both hands start near the head/temples and
    // pulse outward twice, as if giving knowledge outward.
    case "teach": {
      const out = Math.max(0, Math.sin(time * 4));
      setEuler(parts.left.shoulder, -1.1, 0.15, 0.35 + out * 0.3);
      setEuler(parts.left.elbow, -1.15, 0.0, -out * 0.2);
      setEuler(parts.right.shoulder, -1.1, -0.15, -0.35 - out * 0.3);
      setEuler(parts.right.elbow, -1.15, 0.0, out * 0.2);
      setFingerPose(parts.left.hand, "spell");
      setFingerPose(parts.right.hand, "spell");
      break;
    }
    // ONE — real ASL sign: index finger extended and held up (same handshape as the digit).
    case "one":
      setEuler(parts.right.shoulder, -1.05, -0.05, -0.5);
      setEuler(parts.right.elbow, -0.85, 0.0, 0.05);
      parts.right.hand.rotation.set(-0.1, 0, 0);
      setFingerPose(parts.right.hand, "point");
      break;
    // ALL — real ASL sign: flat hand sweeps in a horizontal circle in front of the body.
    case "all":
      setEuler(parts.right.shoulder, -0.55, -0.1, -0.6);
      setEuler(parts.right.elbow, -0.75, 0.0, 0.1);
      parts.right.hand.position.x = -0.05 + Math.cos(time * 3) * 0.1;
      parts.right.hand.position.z = 0.08 + Math.sin(time * 3) * 0.1;
      parts.right.hand.rotation.set(0.1, 0, 0);
      setFingerPose(parts.right.hand, "flat");
      break;
    // SOME — real ASL sign: dominant hand's edge slides across the base hand's palm.
    case "some": {
      const slide = (Math.sin(time * 2.5) + 1) / 2;
      setEuler(parts.left.shoulder, -0.3, 0.1, 0.6);
      parts.left.hand.rotation.set(0.2, 0, 0.1);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.35, -0.15, -0.55);
      setEuler(parts.right.elbow, -0.55, 0, 0.1);
      parts.right.hand.position.x = -0.22 + slide * 0.14;
      parts.right.hand.rotation.set(0.15, 0, -0.1);
      setFingerPose(parts.right.hand, "flat");
      break;
    }
    // EACH — real ASL sign: dominant hand taps sequentially along the base hand.
    case "each": {
      const tap = Math.max(0, Math.sin(time * 6));
      setEuler(parts.left.shoulder, -0.3, 0.1, 0.6);
      parts.left.hand.rotation.set(0.2, 0, 0.1);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.5, -0.15, -0.55);
      setEuler(parts.right.elbow, -0.75 - tap * 0.15, 0, 0.1);
      parts.right.hand.rotation.set(-0.2, 0, -0.1);
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // BETWEEN — real ASL sign: spread hand oscillates in the space in front of the base hand.
    case "between":
      setEuler(parts.left.shoulder, -0.25, 0.1, 0.7);
      parts.left.hand.rotation.set(0.1, 0, 0.3);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.3, -0.15, -0.55);
      setEuler(parts.right.elbow, -0.6, 0, 0.05);
      parts.right.hand.position.z = 0.05 + Math.sin(time * 4) * 0.08;
      setFingerPose(parts.right.hand, "open");
      break;
    // NOT — real ASL sign: hand starts near the chin and flicks forward/down away from it.
    case "not": {
      const flick = Math.max(0, Math.sin(time * 5));
      setEuler(parts.right.shoulder, -1.3, -0.1, -0.4);
      setEuler(parts.right.elbow, -1.2 + flick * 0.35, 0, 0.1);
      parts.right.hand.rotation.set(-0.1, 0, 0);
      setFingerPose(parts.right.hand, "thumb");
      break;
    }
    // OTHER — real ASL sign: hand twists at the wrist from palm-in to palm-out.
    case "other":
      setEuler(parts.right.shoulder, -0.65, -0.1, -0.55);
      setEuler(parts.right.elbow, -0.75, 0, 0.1);
      parts.right.hand.rotation.set(-0.2, Math.sin(time * 4) * 0.5, 0);
      setFingerPose(parts.right.hand, "thumb");
      break;
    // ANY — real ASL sign: hand sweeps side to side.
    case "any":
      setEuler(parts.right.shoulder, -0.55, -0.1 + Math.sin(time * 3) * 0.25, -0.55);
      setEuler(parts.right.elbow, -0.7, 0, 0.1);
      setFingerPose(parts.right.hand, "thumb");
      break;
    // UP — real ASL sign: index finger points and moves upward.
    case "up": {
      const lift = Math.max(0, Math.sin(time * 3));
      setEuler(parts.right.shoulder, -1.3 - lift * 0.3, -0.05, -0.4);
      setEuler(parts.right.elbow, -0.5, 0, 0.05);
      parts.right.hand.rotation.set(-0.3, 0, 0);
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // DOWN — real ASL sign: index finger points and moves downward.
    case "down": {
      const drop = Math.max(0, Math.sin(time * 3));
      setEuler(parts.right.shoulder, -0.35 + drop * 0.3, -0.05, -0.5);
      setEuler(parts.right.elbow, -0.5, 0, 0.05);
      parts.right.hand.rotation.set(0.3, 0, 0);
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // FOR — real ASL sign: index finger touches the temple then twists to point forward.
    case "for": {
      const twist = (Math.sin(time * 3) + 1) / 2;
      setEuler(parts.right.shoulder, -1.15, -0.15 + twist * 0.2, -0.5);
      setEuler(parts.right.elbow, -1.0, 0, 0.15);
      parts.right.hand.rotation.set(-0.3, twist * 0.6, -0.2);
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // INTO — real ASL sign: fingers of one hand slide into the cupped opening of the other.
    case "into": {
      const push = (Math.sin(time * 2.5) + 1) / 2;
      setEuler(parts.left.shoulder, -0.35, 0.15, 0.55);
      setFingerPose(parts.left.hand, "fist");
      setEuler(parts.right.shoulder, -0.4, -0.15 - push * 0.15, -0.5);
      setEuler(parts.right.elbow, -0.7, 0, 0.1);
      parts.right.hand.position.x = -0.16 + push * 0.12;
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // OUT — real ASL sign: fingers pull upward out of the cupped non-dominant hand.
    case "out": {
      const pull = Math.max(0, Math.sin(time * 3));
      setEuler(parts.left.shoulder, -0.3, 0.15, 0.55);
      setFingerPose(parts.left.hand, "spell");
      setEuler(parts.right.shoulder, -0.55 - pull * 0.35, -0.1, -0.5);
      setEuler(parts.right.elbow, -0.7, 0, 0.1);
      parts.right.hand.position.y = -0.59 + pull * 0.18;
      setFingerPose(parts.right.hand, "spell");
      break;
    }
    // BACK — real ASL sign: thumb points back over the shoulder.
    case "back":
      setEuler(parts.right.shoulder, -0.7, -0.35, -0.75);
      setEuler(parts.right.elbow, -1.1, -0.2, 0.1);
      parts.right.hand.rotation.set(-0.2, -0.4, -0.3);
      setFingerPose(parts.right.hand, "thumb");
      break;
    // COMBINE / SUM / TOGETHER — real ASL sign: both curved hands sweep together and interlace.
    case "combine": {
      const merge = (Math.sin(time * 2.4) + 1) / 2;
      setEuler(parts.left.shoulder, -0.4, 0.1 + merge * 0.2, 0.55 - merge * 0.2);
      setEuler(parts.right.shoulder, -0.4, -0.1 - merge * 0.2, -0.55 + merge * 0.2);
      parts.left.hand.position.x = 0.18 - merge * 0.18;
      parts.right.hand.position.x = -0.18 + merge * 0.18;
      setFingerPose(parts.left.hand, "spell");
      setFingerPose(parts.right.hand, "spell");
      break;
    }
    // MEAN — real ASL sign: bent-V fingertips touch the upturned palm and twist.
    case "mean": {
      const t = Math.sin(time * 4);
      setEuler(parts.left.shoulder, -0.3, 0.1, 0.6);
      parts.left.hand.rotation.set(0.2, 0, 0.1);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.5, -0.1, -0.55);
      setEuler(parts.right.elbow, -0.8, 0, 0.1 + t * 0.2);
      parts.right.hand.rotation.set(-0.3, 0, t * 0.3);
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // POSITIVE — real ASL sign: two index fingers cross to form a "plus".
    case "positive":
      setEuler(parts.left.shoulder, -0.7, 0.2, 0.5);
      setEuler(parts.left.elbow, -0.9, 0, -0.1);
      parts.left.hand.rotation.set(0, 0, 1.4);
      setFingerPose(parts.left.hand, "point");
      setEuler(parts.right.shoulder, -0.7, -0.2, -0.5);
      setEuler(parts.right.elbow, -0.9, 0, 0.1);
      parts.right.hand.rotation.set(0, 0, 0);
      setFingerPose(parts.right.hand, "point");
      break;
    // NEGATIVE — real ASL sign: horizontal index finger held against the upturned palm ("minus").
    case "negative":
      setEuler(parts.left.shoulder, -0.3, 0.1, 0.6);
      parts.left.hand.rotation.set(0.2, 0, 0.1);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.5, -0.15, -0.55);
      setEuler(parts.right.elbow, -0.8, 0, 0.1);
      parts.right.hand.rotation.set(0, 0, 1.4);
      setFingerPose(parts.right.hand, "point");
      break;
    // CAN — real ASL sign: both fists (S-hands) move down decisively together.
    case "can": {
      const chop = Math.max(0, Math.sin(time * 4));
      setEuler(parts.left.shoulder, -0.6 + chop * 0.25, 0.1, 0.5);
      setEuler(parts.right.shoulder, -0.6 + chop * 0.25, -0.1, -0.5);
      setEuler(parts.left.elbow, -0.85, 0, -0.05);
      setEuler(parts.right.elbow, -0.85, 0, 0.05);
      setFingerPose(parts.left.hand, "fist");
      setFingerPose(parts.right.hand, "fist");
      break;
    }
    // ABOUT — real ASL sign: index finger circles around the fingertips of the base hand.
    case "about":
      setEuler(parts.left.shoulder, -0.35, 0.15, 0.55);
      setFingerPose(parts.left.hand, "spell");
      setEuler(parts.right.shoulder, -0.5, -0.12, -0.55);
      setEuler(parts.right.elbow, -0.8, 0, 0.1);
      parts.right.hand.position.x = -0.14 + Math.cos(time * 5) * 0.08;
      parts.right.hand.position.z = 0.05 + Math.sin(time * 5) * 0.08;
      setFingerPose(parts.right.hand, "point");
      break;
    // FIRST — real ASL sign: dominant index taps the extended thumb of the base hand.
    case "first": {
      const tap = Math.max(0, Math.sin(time * 5));
      setEuler(parts.left.shoulder, -0.55, 0.2, 0.55);
      setEuler(parts.left.elbow, -0.85, 0, -0.1);
      setFingerPose(parts.left.hand, "thumb");
      setEuler(parts.right.shoulder, -0.6, -0.15, -0.55);
      setEuler(parts.right.elbow, -0.9 - tap * 0.12, 0, 0.1);
      setFingerPose(parts.right.hand, "point");
      break;
    }
    // REPRESENT — real ASL sign: dominant flat hand moves forward to press against the base palm.
    case "represent": {
      const forward = (Math.sin(time * 2.5) + 1) / 2;
      setEuler(parts.left.shoulder, -0.35, 0.15, 0.6);
      parts.left.hand.rotation.set(0, 0, 0.2);
      setFingerPose(parts.left.hand, "flat");
      setEuler(parts.right.shoulder, -0.5, -0.15, -0.55);
      setEuler(parts.right.elbow, -0.75 - forward * 0.2, 0, 0.1);
      parts.right.hand.position.z = forward * 0.1;
      setFingerPose(parts.right.hand, "point");
      break;
    }
    case "fingerspell": {
      const [, intra, shape] = fingerspellFrame(signInfo, progress);
      setEuler(parts.right.shoulder, -0.95, -0.08, -0.55);
      // Small forward "press" at each letter's onset visually separates consecutive letters.
      const press = Math.sin(Math.min(1, intra * 3) * Math.PI) * 0.08;
      setEuler(parts.right.elbow, -0.82 - press, 0.0, 0.12);
      parts.right.hand.rotation.set(shape.wristX, shape.wristY, shape.wristZ);
      setFingerPose(parts.right.hand, shape.pose);
      setFingerPose(parts.left.hand, "open");
      break;
    }
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

  // Signing-ready rest pose. The VRM normalized rig rests in a T-pose (arms horizontal
  // at rotation 0), so these values rotate the arms DOWN and slightly FORWARD with the
  // elbows bent, putting the hands in front of the torso — calibrated visually against
  // the rendered model. Convention: upperArm.z+ lowers the arm, .x+ swings it forward,
  // lowerArm.x- flexes the elbow. Left arm mirrors (negate y,z).
  setBone(bones, "leftUpperArm", 0.6, -0.2, -1.1);
  setBone(bones, "leftLowerArm", -1.5, 0, 0.4);
  setBone(bones, "leftHand", 0, 0, 0);
  setBone(bones, "rightUpperArm", 0.6, 0.2, 1.1);
  setBone(bones, "rightLowerArm", -1.5, 0, -0.4);
  setBone(bones, "rightHand", 0, 0, 0);

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
    // ASL number handshapes (2,3,5–9) — approximated with single-axis finger curl;
    // the rig can't model true thumb-to-fingertip contact for 6–9, so those use the
    // matching finger curled toward center as the closest available approximation.
    two: { Thumb: 0.5, Index: 0.05, Middle: 0.05, Ring: 1.2, Little: 1.2 },
    three: { Thumb: -0.15, Index: 0.05, Middle: 0.05, Ring: 1.16, Little: 1.14 },
    five: { Thumb: 0.2, Index: 0.05, Middle: 0.05, Ring: 0.05, Little: 0.08 },
    six: { Thumb: 0.6, Index: 0.05, Middle: 0.05, Ring: 0.05, Little: 1.05 },
    seven: { Thumb: 0.55, Index: 0.05, Middle: 0.05, Ring: 0.9, Little: 0.05 },
    eight: { Thumb: 0.5, Index: 0.05, Middle: 0.85, Ring: 0.05, Little: 0.05 },
    nine: { Thumb: 0.5, Index: 0.85, Middle: 0.05, Ring: 0.05, Little: 0.05 },
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

  // NMM mouth morpheme approximation — ASL has mouth-shape components that accompany each NMM type.
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

// === Verified signing-space arm anchors ===
// Each is [upperX, upperY, upperZ, lowerX, lowerY, lowerZ]. The upperArm-X of ±1.57 is the
// 90° roll that orients the arm FORWARD toward the viewer instead of out to the side.
// The left arm does NOT mirror by simple negation on this rig — both arms were calibrated
// independently by reading the hand's world position so each hand sits FORWARD of the chest
// (dz ≈ +0.4-0.5 toward the viewer), roughly centered, at chest height (y ≈ 0.5-0.6).
const ARM_RAISE = [-1.57, 0, 1.0, -1.6, -1.0, -0.6];   // right hand forward, chest center
const ARM_HIGH = [-1.57, 0, 0.85, -1.6, -0.9, -0.25];  // right hand forward, upper chest / chin
const ARM_FORWARD = [-1.3, 0, 0.9, -1.4, -1.0, -0.5];  // right hand forward, lower / extended
const ARM_RAISE_L = [1.57, 0, 1.2, -1.6, -1.0, -0.5];  // left hand forward, chest center
const ARM_HIGH_L = [1.57, 0, 1.05, -1.6, -0.9, -0.15]; // left hand forward, upper chest
const LEFT_ANCHOR = new Map([[ARM_RAISE, ARM_RAISE_L], [ARM_HIGH, ARM_HIGH_L], [ARM_FORWARD, ARM_RAISE_L]]);

function setArmAnchor(bones, side, a, dLowerX = 0) {
  const arr = side === "left" ? (LEFT_ANCHOR.get(a) || a) : a;
  setBone(bones, side === "left" ? "leftUpperArm" : "rightUpperArm", arr[0], arr[1], arr[2]);
  setBone(bones, side === "left" ? "leftLowerArm" : "rightLowerArm", arr[3] + dLowerX, arr[4], arr[5]);
}

// Gesture families: gentle animated variations around the anchors. These are NOT literal
// ASL signs — no procedural rig can render readable ASL without motion-capture data. They
// keep the avatar visibly signing in natural space rather than freezing or T-posing, and
// are paired with distinct handshapes/expressions per word for variety.
function applyGestureFamily(bones, family, time, fingerR, fingerL) {
  // Continuous, clearly-visible signing movement. Amplitudes are large on purpose so the
  // hands are always obviously moving (the previous ±0.08 wiggle read as frozen). `stroke`
  // is the main up/down travel of the forearm; `swing` moves the elbow forward/back; `wrist`
  // articulates the hand so it never looks locked.
  const stroke = Math.sin(time * 3.4) * 0.32;
  const stroke2 = Math.sin(time * 3.4 + Math.PI) * 0.32; // opposite phase for two-hand alternation
  const swing = Math.sin(time * 2.6) * 0.22;
  const wrist = Math.sin(time * 4.2) * 0.35;
  switch (family) {
    case "highR":
      setArmAnchor(bones, "right", ARM_HIGH, stroke);
      setBone(bones, "rightHand", wrist * 0.4, 0, wrist);
      break;
    case "fwdR":
      setArmAnchor(bones, "right", ARM_FORWARD, -Math.abs(stroke));
      setBone(bones, "rightUpperArm", ARM_FORWARD[0], ARM_FORWARD[1], ARM_FORWARD[2] - swing * 0.4);
      setBone(bones, "rightHand", 0, 0, wrist);
      break;
    case "together": {
      // Both hands forward; extra elbow flex draws them together toward center, then apart.
      const conv = Math.abs(Math.sin(time * 2.8)) * 0.5;
      setArmAnchor(bones, "right", ARM_RAISE, -conv);
      setArmAnchor(bones, "left", ARM_RAISE, -conv);
      break;
    }
    case "apart": {
      // Both hands forward, extending outward (less flex) then back — stays in front.
      const sp = Math.abs(Math.sin(time * 2.8)) * 0.5;
      setArmAnchor(bones, "right", ARM_RAISE, sp);
      setArmAnchor(bones, "left", ARM_RAISE, sp);
      break;
    }
    case "alt": // hands move up/down in opposition
      setArmAnchor(bones, "right", ARM_RAISE, stroke);
      setArmAnchor(bones, "left", ARM_RAISE, stroke2);
      setBone(bones, "rightHand", 0, 0, wrist);
      break;
    case "highBoth":
      setArmAnchor(bones, "right", ARM_HIGH, stroke);
      setArmAnchor(bones, "left", ARM_HIGH, stroke);
      break;
    case "raiseR":
    default:
      setArmAnchor(bones, "right", ARM_RAISE, stroke);
      setBone(bones, "rightUpperArm", ARM_RAISE[0], ARM_RAISE[1] + swing * 0.3, ARM_RAISE[2]);
      setBone(bones, "rightHand", 0, 0, wrist);
  }
  setVrmFingerPose(bones, "right", fingerR || "open");
  if (fingerL) setVrmFingerPose(bones, "left", fingerL);
}

// Maps every motion name to a gesture family + right/left handshape.
const MOTION_FAMILY = {
  wave: ["raiseR", "flat"],
  "chin-forward": ["fwdR", "flat"],
  "point-out": ["raiseR", "point"],
  "point-self": ["fwdR", "point"],
  learn: ["highR", "spell"],
  "tap-head": ["highR", "point"],
  "index-temple": ["highR", "point"],
  snap: ["raiseR", "spell"],
  thumbs: ["raiseR", "thumb"],
  "thumbs-down": ["raiseR", "thumb"],
  lift: ["together", "fist", "flat"],
  "circle-chest": ["fwdR", "flat"],
  "fist-circle": ["fwdR", "fist"],
  shrug: ["apart", "open", "open"],
  waggle: ["apart", "open", "open"],
  "circle-wrist": ["raiseR", "point"],
  knuckles: ["together", "fist", "fist"],
  "y-hand": ["raiseR", "y"],
  sign: ["alt", "point", "point"],
  "spread-hands": ["apart", "flat", "flat"],
  "flat-hand": ["fwdR", "flat"],
  computer: ["fwdR", "spell"],
  connect: ["together", "point", "point"],
  problem: ["together", "fist", "fist"],
  picture: ["fwdR", "flat"],
  teach: ["highBoth", "spell", "spell"],
  one: ["raiseR", "point"],
  all: ["apart", "flat", "flat"],
  some: ["fwdR", "flat"],
  each: ["raiseR", "point"],
  between: ["apart", "open", "open"],
  not: ["highR", "thumb"],
  other: ["raiseR", "thumb"],
  any: ["raiseR", "thumb"],
  up: ["highR", "point"],
  down: ["fwdR", "point"],
  for: ["highR", "point"],
  into: ["together", "point", "point"],
  out: ["highR", "spell"],
  back: ["raiseR", "thumb"],
  combine: ["together", "spell", "spell"],
  mean: ["fwdR", "point"],
  positive: ["together", "point", "point"],
  negative: ["fwdR", "point"],
  can: ["together", "fist", "fist"],
  about: ["fwdR", "point"],
  first: ["raiseR", "point"],
  represent: ["fwdR", "point"],
};

// === Authentic reference-based ASL signs ===
// Each "asl-*" motion reproduces the real ASL sign's HANDSHAPE + MOVEMENT, based on standard
// descriptions (Lifeprint / ASL-LEX / HandSpeak). NOTE: this rig places hands reliably only in
// the forward signing space in front of the chest — accurately touching the head/face was not
// achievable, so signs that are anatomically located at the head (THINK, KNOW…) are performed
// in the upper signing space with the correct handshape and movement instead of at the temple.
// These are hand-authored approximations, more sign-accurate than the generic families but not
// motion-capture. Jargon with no established sign stays fingerspelled elsewhere.
function lerpArr(a, b, t) {
  const o = new Array(6);
  for (let i = 0; i < 6; i++) o[i] = a[i] + (b[i] - a[i]) * t;
  return o;
}
function setArmRaw(bones, side, a) {
  setBone(bones, side === "left" ? "leftUpperArm" : "rightUpperArm", a[0], a[1], a[2]);
  setBone(bones, side === "left" ? "leftLowerArm" : "rightLowerArm", a[3], a[4], a[5]);
}

function applyAuthenticSign(bones, motion, time) {
  const tap = Math.sin(time * 6) * 0.18;           // repeated contact/bounce
  const cyc = (Math.sin(time * 2.4) + 1) / 2;      // 0..1 slow movement
  const flick = Math.sin(time * 7) > 0;            // finger flick toggle
  switch (motion) {
    case "asl-think": // index finger, upper space, tapping
      setArmAnchor(bones, "right", ARM_HIGH, -Math.abs(tap));
      setVrmFingerPose(bones, "right", "point");
      return true;
    case "asl-know": // flat hand, upper space, tapping
      setArmAnchor(bones, "right", ARM_HIGH, -Math.abs(tap));
      setVrmFingerPose(bones, "right", "flat");
      return true;
    case "asl-understand": // index flicks open in the upper space
      setArmAnchor(bones, "right", ARM_HIGH);
      setVrmFingerPose(bones, "right", flick ? "point" : "fist");
      return true;
    case "asl-learn": // dominant hand lifts from the open palm and closes as it rises
      setArmRaw(bones, "right", lerpArr(ARM_RAISE, ARM_HIGH, cyc));
      setVrmFingerPose(bones, "right", cyc > 0.5 ? "spell" : "flat");
      setArmAnchor(bones, "left", ARM_RAISE); // non-dominant flat "source" hand
      setVrmFingerPose(bones, "left", "flat");
      return true;
    case "asl-for": // index turns from up to pointing forward
      setArmRaw(bones, "right", lerpArr(ARM_HIGH, ARM_FORWARD, cyc));
      setVrmFingerPose(bones, "right", "point");
      return true;
    case "asl-not": // thumb hand flicks forward and out
      setArmRaw(bones, "right", lerpArr(ARM_HIGH, ARM_FORWARD, Math.max(0, Math.sin(time * 3))));
      setVrmFingerPose(bones, "right", "thumb");
      return true;
    case "asl-see": // V-hand moves forward from the upper space
      setArmRaw(bones, "right", lerpArr(ARM_HIGH, ARM_FORWARD, cyc));
      setVrmFingerPose(bones, "right", "flat");
      return true;
    case "asl-what": { // both open palms, small side-to-side shake
      const sh = Math.sin(time * 5) * 0.15;
      setArmAnchor(bones, "right", ARM_RAISE, sh);
      setArmAnchor(bones, "left", ARM_RAISE, -sh);
      setVrmFingerPose(bones, "right", "open");
      setVrmFingerPose(bones, "left", "open");
      return true;
    }
    case "asl-more": // flattened-O hands tap fingertips together, then apart
      setArmAnchor(bones, "right", ARM_RAISE, -Math.abs(tap) * 2.5);
      setArmAnchor(bones, "left", ARM_RAISE, -Math.abs(tap) * 2.5);
      setVrmFingerPose(bones, "right", "spell");
      setVrmFingerPose(bones, "left", "spell");
      return true;
    case "asl-want": { // both claw hands draw toward the body
      const pull = cyc * 0.6;
      setArmAnchor(bones, "right", ARM_RAISE, -pull);
      setArmAnchor(bones, "left", ARM_RAISE, -pull);
      setVrmFingerPose(bones, "right", "spell");
      setVrmFingerPose(bones, "left", "spell");
      return true;
    }
    case "asl-number": // flattened-O hands touch and twist
      setArmAnchor(bones, "right", ARM_RAISE);
      setArmAnchor(bones, "left", ARM_RAISE);
      setBone(bones, "rightHand", 0, 0, Math.sin(time * 4) * 0.6);
      setBone(bones, "leftHand", 0, 0, -Math.sin(time * 4) * 0.6);
      setVrmFingerPose(bones, "right", "spell");
      setVrmFingerPose(bones, "left", "spell");
      return true;
    case "asl-like": // thumb + middle finger draw outward from the chest
      setArmRaw(bones, "right", lerpArr(ARM_HIGH, ARM_FORWARD, cyc));
      setVrmFingerPose(bones, "right", cyc > 0.5 ? "y" : "spell");
      return true;
    default:
      return false;
  }
}

function applyVrmMotion(parts, signInfo, time, progress = 0) {
  const { bones, vrm } = parts;
  const motion = signInfo.motion;

  resetVrmPose(bones, time);
  applyVrmExpression(vrm, signInfo.expression, time);

  if (motion.startsWith("asl-") && applyAuthenticSign(bones, motion, time)) return;

  if (motion === "idle") return;
  // Head-only signs.
  if (motion === "nod") { setBone(bones, "head", Math.sin(time * 8) * 0.16, 0, 0); return; }
  if (motion === "shake") { setBone(bones, "head", 0, Math.sin(time * 9) * 0.22, 0); return; }

  // Fingerspelling / number handshapes step through letters on the right hand.
  if (motion === "fingerspell") {
    const [, intra, shape] = fingerspellFrame(signInfo, progress);
    setArmAnchor(bones, "right", ARM_RAISE);
    // A small forward "press" at each letter's onset gives visible separation between
    // consecutive letters — and between repeated letters — so the viewer can count them.
    const press = Math.sin(Math.min(1, intra * 3) * Math.PI) * 0.05;
    setBone(bones, "rightHand", shape.wristX - press, shape.wristY, shape.wristZ);
    setVrmFingerPose(bones, "right", shape.pose);
    return;
  }

  const [family, fingerR, fingerL] = MOTION_FAMILY[motion] || ["raiseR", "open", null];
  applyGestureFamily(bones, family, time, fingerR, fingerL);
}

// Development-time invariant: all motion strings declared in SIGN_MOTIONS must be implemented.
if (process.env.NODE_ENV !== "production") {
  const IMPLEMENTED_MOTIONS = new Set([
    "idle", "wave", "chin-forward", "point-out", "point-self", "nod", "shake",
    "learn", "tap-head", "index-temple", "snap", "thumbs", "thumbs-down", "lift",
    "circle-chest", "fist-circle", "shrug", "waggle", "circle-wrist", "knuckles",
    "y-hand", "sign", "spread-hands", "flat-hand", "fingerspell",
    "computer", "connect", "problem", "picture", "teach",
    "one", "all", "some", "each", "between", "not", "other", "any", "up", "down",
    "for", "into", "out", "back", "combine", "mean", "positive", "negative",
    "can", "about", "first", "represent",
  ]);
  Object.entries(SIGN_MOTIONS).forEach(([word, info]) => {
    // "asl-*" motions are handled by applyAuthenticSign, not the family switch.
    if (!info.motion.startsWith("asl-") && !IMPLEMENTED_MOTIONS.has(info.motion)) {
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
          tintVrmClothing(vrm, CLOTHING_COLOR);
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
          applyVrmMotion(vrmParts, info, time, progress);
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
        applyMotion(fallbackParts, info, time, progress);

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

// Primitives shared with the dev-only pose tuner (pages/PoseTunerPage.js). The tuner MUST
// drive bones through these exact functions so that a clip authored in it renders identically
// during playback — the previous clip set was disabled precisely because it was authored
// against a different rest-pose assumption than playback used. Keep this the single code path.
export const tunerApi = {
  VRM_MODEL_URL,
  createVrmParts,
  setBone,
  resetVrmPose,
  setVrmFingerPose,
  applyVrmExpression,
  fitVrmToScene,
  tintVrmClothing,
  CLOTHING_COLOR,
  // Bones a clip keyframe addresses, and the finger/expression vocabularies the tuner offers.
  CLIP_BONES: ["rightUpperArm", "rightLowerArm", "rightHand", "leftUpperArm", "leftLowerArm", "leftHand", "head"],
  FINGER_POSES: ["relaxed", "flat", "fist", "point", "thumb", "y", "spell", "two", "three", "five", "six", "seven", "eight", "nine"],
  EXPRESSIONS: ["neutral", "smile", "soft", "sad", "firm", "question", "focus"],
};

// playbackSpeed < 1 activates learning mode: word timing windows are stretched so the
// avatar signs slower than the video — driven by applySlowPlayback from timelineScheduler.
export default function SignAvatar({ caption, isActive, currentTime = 0, sentenceNMM = NEUTRAL_NMM, playbackSpeed = 1.0, fingerspellMode = false }) {
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
      playbackSpeed,
      fingerspellMode
    );
    return { wordIndex, wordProgress, isCatchingUp };
  }, [caption, currentTime, isActive, playbackSpeed, fingerspellMode]);

  const words = caption?.words ?? [];

  const currentWord = words[wordIndex] || "";
  const signInfo = getSignInfo(currentWord, fingerspellMode);

  // When the current word is being fingerspelled, expose its letters + the active letter
  // (derived from wordProgress, same mapping the avatar uses) so the strip below can show
  // the viewer exactly which letter is on the hand right now and that none were skipped.
  const spellLetters = signInfo.motion === "fingerspell" && signInfo.letters
    ? signInfo.letters.split("")
    : [];
  const activeLetterIdx = spellLetters.length
    ? Math.min(spellLetters.length - 1, Math.floor(Math.max(0, wordProgress) * spellLetters.length))
    : -1;

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
          signClip={signClip}
          wordProgress={wordProgress}
          active={!!isActive}
          activeNMM={activeNMM}
          snapToSign={isCatchingUp}
        />
        <div className="avatar-depth-grid" />
      </div>

      {!isActive ? (
        <p className="idle-label">Waiting for processed captions...</p>
      ) : (
        <>
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

          {spellLetters.length > 0 && (
            <div className="fingerspell-strip" aria-label={`Fingerspelling ${signInfo.label}`}>
              <div className="fingerspell-letters">
                {spellLetters.map((ch, index) => (
                  <span
                    key={`${ch}-${index}`}
                    className={`fs-letter ${index === activeLetterIdx ? "active" : ""} ${
                      index < activeLetterIdx ? "done" : ""
                    }`}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <span className="fingerspell-count">
                letter {activeLetterIdx + 1} of {spellLetters.length}
              </span>
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
