import {
  banglaGestureLabel,
  banglaWordFromToken,
  banglaWordToGestureUnits,
  isBanglaGesture,
  isBanglaWordToken,
} from "./banglaAlphabet";

const COMMON_GESTURES = new Set([
  "HELLO",
  "THANK",
  "YOU",
  "ME",
  "I",
  "YES",
  "NO",
  "WHAT",
  "WHERE",
  "WHEN",
  "WHY",
  "HOW",
  "HELP",
  "PLEASE",
  "SORRY",
  "GOOD",
  "BAD",
  "OK",
  "KNOW",
  "THINK",
  "LEARN",
  "SIGN",
  "ASL",
  "WANT",
  "SEE",
  "LOOK",
  "LOVE",
  "MORE",
  "GO",
  "COME",
  "GIVE",
  "SHOW",
  "EXPLAIN",
  "AREA",
  "GRAPH",
  "RECTANGLE",
  "RECTANGLES",
  "CIRCLE",
  "SHAPE",
  "FUNCTION",
  "FORMULA",
  "RULE",
  "CALCULUS",
  "DERIVATIVE",
  "DERIVATIVES",
  "DX",
  "DR",
  "SUM",
  "TOTAL",
  "ADD",
  "COMBINE",
  "TOGETHER",
  "PRODUCT",
  "TIMES",
  "POINT",
  "HERE",
  "THERE",
  "WAY",
  "PLACE",
  "SMALL",
  "SMALLER",
  "TINY",
  "LITTLE",
  "LESS",
  "BIG",
  "MANY",
  "ALL",
  "SOME",
  "EACH",
  "BETWEEN",
  "UNDER",
  "CHANGE",
  "DIFFERENT",
  "DIFFERENCE",
  "IF",
  "OR",
  "FIND",
  "GET",
  "TAKE",
  "MAKE",
  "USE",
  "WORK",
  "NEED",
  "CAN",
  "START",
  "STOP",
  "FINISH",
  "RIGHT",
  "WRONG",
  "TRUE",
]);

const COMMON_ALIASES = {
  HI: "HELLO",
  HEY: "HELLO",
  THANKS: "THANK",
  THANKYOU: "THANK",
  MYSELF: "ME",
  OKAY: "OK",
  NOPE: "NO",
  YEAH: "YES",
  UNDERSTAND: "KNOW",
  STUDY: "LEARN",
  WATCH: "LOOK",
  LOOKING: "LOOK",
  SEEN: "SEE",
  GIVES: "GIVE",
  GIVEN: "GIVE",
  SHOWS: "SHOW",
  SHOWING: "SHOW",
  EXPLAINS: "EXPLAIN",
  EXPLAINING: "EXPLAIN",
  AREAS: "AREA",
  GRAPHS: "GRAPH",
  GRAPHING: "GRAPH",
  RECTANGLES: "RECTANGLES",
  RECTANGULAR: "RECTANGLE",
  CIRCLES: "CIRCLE",
  RADIUS: "CIRCLE",
  RADII: "CIRCLE",
  RING: "CIRCLE",
  SHAPES: "SHAPE",
  FUNCTIONS: "FUNCTION",
  FORMULAS: "FORMULA",
  RULES: "RULE",
  DERIVATIVES: "DERIVATIVES",
  DERIVING: "DERIVATIVE",
  DIFFERENTIATE: "DERIVATIVE",
  DIFFERENTIATION: "DERIVATIVE",
  CALCULATE: "CALCULUS",
  CALCULATING: "CALCULUS",
  APPROXIMATION: "CALCULUS",
  APPROXIMATE: "CALCULUS",
  APPROXIMATING: "CALCULUS",
  SERIES: "SUM",
  ADDS: "ADD",
  ADDING: "ADD",
  ADDED: "ADD",
  SUMS: "SUM",
  TOTALS: "TOTAL",
  COMBINED: "COMBINE",
  COMBINES: "COMBINE",
  PRODUCTS: "PRODUCT",
  MULTIPLY: "TIMES",
  MULTIPLICATION: "TIMES",
  POINTS: "POINT",
  PARTICULAR: "POINT",
  SPECIFIC: "POINT",
  THESE: "HERE",
  THOSE: "THERE",
  THIS: "HERE",
  THAT: "THERE",
  THATS: "THERE",
  WAYS: "WAY",
  PLACES: "PLACE",
  SMALLISH: "SMALL",
  TINY: "TINY",
  SMALLER: "SMALLER",
  LITTLE: "LITTLE",
  LOT: "MANY",
  MUCH: "MANY",
  MORE: "MORE",
  EVERY: "EACH",
  INSIDE: "UNDER",
  BELOW: "UNDER",
  CHANGES: "CHANGE",
  CHANGING: "CHANGE",
  CHANGED: "CHANGE",
  DIFFERENCES: "DIFFERENCE",
  DIFFERENTLY: "DIFFERENT",
  FINDS: "FIND",
  FINDING: "FIND",
  FOUND: "FIND",
  GETS: "GET",
  GETTING: "GET",
  TAKES: "TAKE",
  TAKING: "TAKE",
  MAKES: "MAKE",
  MAKING: "MAKE",
  USED: "USE",
  USING: "USE",
  WORKS: "WORK",
  WORKING: "WORK",
  NEEDED: "NEED",
  NEEDS: "NEED",
  STARTS: "START",
  STARTING: "START",
  STOPS: "STOP",
  STOPPING: "STOP",
  FINISHED: "FINISH",
  EXACTLY: "TRUE",
  REALLY: "TRUE",
  CORRECT: "RIGHT",
  BETTER: "GOOD",
  PROBLEM: "WRONG",
  PROBLEMS: "WRONG",
  QUESTION: "WHAT",
  QUESTIONS: "WHAT",
  WHICHEVER: "WHAT",
};

const NUMBER_WORDS = {
  ZERO: "0",
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  SEVEN: "7",
  EIGHT: "8",
  NINE: "9",
};

export function displayMixamoWord(word) {
  const raw = String(word || "").trim();
  if (isBanglaGesture(raw)) return banglaGestureLabel(raw);
  if (isBanglaWordToken(raw)) return banglaWordFromToken(raw);

  const value = raw.toUpperCase();
  const fingerspell = value.match(/^\[FINGERSPELL:([A-Z0-9]+)\]$/);
  if (fingerspell) return fingerspell[1];
  const number = value.match(/^\[NUMBER:(\d+)\]$/);
  if (number) return number[1];
  const concept = value.match(/^\[CONCEPT:(.+)\]$/);
  if (concept) return concept[1].replace(/[^A-Z0-9]/g, "");
  return value.replace(/[^A-Z0-9]/g, "");
}

export function spellingUnitsForMixamoWord(word) {
  const raw = String(word || "").trim();
  if (isBanglaWordToken(raw)) return banglaWordToGestureUnits(raw);
  if (isBanglaGesture(raw)) return [];

  const value = raw.toUpperCase();
  const tagged = value.match(/^\[(?:FINGERSPELL|CONCEPT|NUMBER):(.+)\]$/);
  const label = tagged
    ? tagged[1].replace(/[^A-Z0-9]/g, "")
    : displayMixamoWord(value);
  if (!label) return [];

  const commonGesture = COMMON_ALIASES[label] || label;
  const hasAuthoredGesture =
    COMMON_GESTURES.has(commonGesture) ||
    NUMBER_WORDS[label] ||
    /^[A-Z]$/.test(label) ||
    /^[0-9]$/.test(label);

  if (!tagged && hasAuthoredGesture) return [];

  return label.split("").map((character) => ({
    label: character,
    gesture: /[0-9]/.test(character) ? `NUM_${character}` : character,
  }));
}

export function gestureForMixamoWord(word, wordProgress = 0) {
  const raw = String(word || "").trim();
  if (isBanglaGesture(raw)) return raw;

  const spellingUnits = spellingUnitsForMixamoWord(raw);
  if (spellingUnits.length) {
    const index = Math.min(
      spellingUnits.length - 1,
      Math.floor(Math.max(0, Math.min(0.999999, wordProgress)) * spellingUnits.length)
    );
    return spellingUnits[index].gesture;
  }

  const label = displayMixamoWord(word);
  if (!label) return "RELAXED";
  const commonGesture = COMMON_ALIASES[label] || label;
  if (COMMON_GESTURES.has(commonGesture)) return commonGesture;
  if (NUMBER_WORDS[label]) return `NUM_${NUMBER_WORDS[label]}`;
  if (/^[A-Z]$/.test(label)) return label;
  if (/^[0-9]$/.test(label)) return `NUM_${label}`;
  return `SPELL_${label.slice(0, 14)}`;
}
