/**
 * Sign notation schema — language-independent sign descriptor.
 *
 * Transferable engineering ideas from Ham2Pose (Shalev-Arkushin, Moryossef & Fried, CVPR 2023):
 *   - Notation abstraction: a language-independent intermediate representation
 *   - Sign metadata schema: separates phonological description from animation
 *   - Evaluation interface: clip quality assessment hooks (Phase B)
 *
 * What is NOT included (not feasible without large corpus):
 *   - Neural pose generation
 *   - Training pipelines
 *   - HamNoSys parser (requires full notation library)
 *   - Supervised learning components
 *
 * What IS implemented here:
 *   - Articulatory parameter space (handshape, location, movement, orientation)
 *   - Structured sign metadata for every SIGN_MOTIONS entry
 *   - Dictionary coverage metrics
 *   - Interfaces for future clip validation
 */

// ---------------------------------------------------------------------------
// Articulatory parameter space
// ---------------------------------------------------------------------------

export const Handshape = {
  FLAT: "flat",
  FIST: "fist",
  POINT: "point",
  Y: "y",
  OPEN: "open",
  SPELL: "spell",
  THUMB: "thumb",
  RELAXED: "relaxed",
};

export const Location = {
  NEUTRAL: "neutral",
  TEMPLE: "temple",
  CHIN: "chin",
  CHEST: "chest",
  SHOULDER: "shoulder",
  ABOVE_HEAD: "above",
  SIDE: "side",
};

export const Movement = {
  STATIC: "static",
  FORWARD: "forward",
  UP: "up",
  DOWN: "down",
  CIRCULAR: "circular",
  WAVE: "wave",
  ALTERNATING: "alt",
  NOD: "nod",
  SHAKE: "shake",
  OUTWARD: "outward",
};

export const Orientation = {
  OUT: "out",
  IN: "in",
  UP: "up",
  DOWN: "down",
  SIDE: "side",
};

// ---------------------------------------------------------------------------
// Sign metadata factory
// ---------------------------------------------------------------------------

export function createSignMetadata({
  gloss,
  label,
  handshapeR = Handshape.OPEN,
  handshapeL = null,
  location = Location.NEUTRAL,
  movement = Movement.STATIC,
  orientationR = Orientation.OUT,
  orientationL = null,
  symmetric = false,
  nmm = null,
  confidence = 0,
  source = "procedural",
  notes = "",
}) {
  return {
    gloss: String(gloss).toUpperCase(),
    label,
    articulation: {
      handshapeR,
      handshapeL: handshapeL ?? (symmetric ? handshapeR : null),
      location,
      movement,
      orientationR,
      orientationL: orientationL ?? (symmetric ? orientationR : null),
      symmetric,
    },
    nmm,
    confidence,
    source,
    notes,
  };
}

// ---------------------------------------------------------------------------
// ASL dictionary metadata
// confidence: 0 = unvalidated educational representation
//             1 = community-validated by Deaf ASL signer
// All current entries are confidence: 0 until a Deaf ASL reviewer confirms them.
// ---------------------------------------------------------------------------

export const SIGN_METADATA = {
  HELLO: createSignMetadata({
    gloss: "HELLO",
    label: "Hello / Greeting",
    handshapeR: Handshape.FLAT,
    location: Location.TEMPLE,
    movement: Movement.WAVE,
    orientationR: Orientation.OUT,
    source: "procedural",
    notes: "Greeting wave from temple — unvalidated",
  }),
  THANK: createSignMetadata({
    gloss: "THANK",
    label: "Thank You",
    handshapeR: Handshape.FLAT,
    location: Location.CHIN,
    movement: Movement.FORWARD,
    orientationR: Orientation.OUT,
    source: "procedural",
  }),
  YOU: createSignMetadata({
    gloss: "YOU",
    label: "You",
    handshapeR: Handshape.POINT,
    location: Location.NEUTRAL,
    movement: Movement.FORWARD,
    orientationR: Orientation.OUT,
    source: "procedural",
  }),
  ME: createSignMetadata({
    gloss: "ME",
    label: "Me / I",
    handshapeR: Handshape.POINT,
    location: Location.CHEST,
    movement: Movement.STATIC,
    orientationR: Orientation.IN,
    source: "procedural",
  }),
  YES: createSignMetadata({
    gloss: "YES",
    label: "Yes / Affirmation",
    handshapeR: Handshape.FIST,
    location: Location.NEUTRAL,
    movement: Movement.NOD,
    orientationR: Orientation.DOWN,
    nmm: { headNod: true },
    source: "procedural",
  }),
  NO: createSignMetadata({
    gloss: "NO",
    label: "No / Negation",
    handshapeR: Handshape.POINT,
    location: Location.NEUTRAL,
    movement: Movement.SHAKE,
    orientationR: Orientation.OUT,
    nmm: { headShake: true },
    source: "procedural",
  }),
  LEARN: createSignMetadata({
    gloss: "LEARN",
    label: "Learn / Acquire Knowledge",
    handshapeR: Handshape.SPELL,
    handshapeL: Handshape.FLAT,
    location: Location.NEUTRAL,
    movement: Movement.UP,
    orientationR: Orientation.IN,
    source: "clip",
    notes: "Has JSON clip file /signs/LEARN.json",
  }),
  KNOW: createSignMetadata({
    gloss: "KNOW",
    label: "Know",
    handshapeR: Handshape.POINT,
    location: Location.TEMPLE,
    movement: Movement.STATIC,
    orientationR: Orientation.IN,
    source: "procedural",
  }),
  UNDERSTAND: createSignMetadata({
    gloss: "UNDERSTAND",
    label: "Understand",
    handshapeR: Handshape.SPELL,
    location: Location.NEUTRAL,
    movement: Movement.UP,
    orientationR: Orientation.OUT,
    source: "procedural",
  }),
  GOOD: createSignMetadata({
    gloss: "GOOD",
    label: "Good",
    handshapeR: Handshape.THUMB,
    location: Location.NEUTRAL,
    movement: Movement.STATIC,
    orientationR: Orientation.OUT,
    source: "procedural",
  }),
  BAD: createSignMetadata({
    gloss: "BAD",
    label: "Bad",
    handshapeR: Handshape.THUMB,
    location: Location.NEUTRAL,
    movement: Movement.DOWN,
    orientationR: Orientation.DOWN,
    source: "procedural",
  }),
  HELP: createSignMetadata({
    gloss: "HELP",
    label: "Help",
    handshapeR: Handshape.FIST,
    handshapeL: Handshape.FLAT,
    location: Location.NEUTRAL,
    movement: Movement.UP,
    orientationR: Orientation.UP,
    symmetric: false,
    source: "procedural",
  }),
  PLEASE: createSignMetadata({
    gloss: "PLEASE",
    label: "Please",
    handshapeR: Handshape.FLAT,
    location: Location.CHEST,
    movement: Movement.CIRCULAR,
    orientationR: Orientation.IN,
    source: "procedural",
  }),
  SORRY: createSignMetadata({
    gloss: "SORRY",
    label: "Sorry",
    handshapeR: Handshape.FIST,
    location: Location.CHEST,
    movement: Movement.CIRCULAR,
    orientationR: Orientation.IN,
    source: "procedural",
  }),
  WHAT: createSignMetadata({
    gloss: "WHAT",
    label: "What (WH-question)",
    handshapeR: Handshape.OPEN,
    location: Location.NEUTRAL,
    movement: Movement.WAVE,
    nmm: { wh: true },
    source: "procedural",
  }),
  WHERE: createSignMetadata({
    gloss: "WHERE",
    label: "Where (WH-question)",
    handshapeR: Handshape.POINT,
    location: Location.NEUTRAL,
    movement: Movement.WAVE,
    nmm: { wh: true },
    source: "procedural",
  }),
  WHEN: createSignMetadata({
    gloss: "WHEN",
    label: "When (WH-question)",
    handshapeR: Handshape.POINT,
    location: Location.NEUTRAL,
    movement: Movement.CIRCULAR,
    nmm: { wh: true },
    source: "procedural",
  }),
  HOW: createSignMetadata({
    gloss: "HOW",
    label: "How (WH-question)",
    handshapeR: Handshape.FIST,
    location: Location.NEUTRAL,
    movement: Movement.OUTWARD,
    nmm: { wh: true },
    source: "procedural",
  }),
  WHY: createSignMetadata({
    gloss: "WHY",
    label: "Why (WH-question)",
    handshapeR: Handshape.Y,
    location: Location.NEUTRAL,
    movement: Movement.STATIC,
    nmm: { wh: true },
    source: "procedural",
  }),
  NETWORK: createSignMetadata({
    gloss: "NETWORK",
    label: "Network / Connected System",
    handshapeR: Handshape.FLAT,
    handshapeL: Handshape.FLAT,
    location: Location.NEUTRAL,
    movement: Movement.OUTWARD,
    orientationR: Orientation.OUT,
    orientationL: Orientation.OUT,
    symmetric: true,
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
  NEURON: createSignMetadata({
    gloss: "NEURON",
    label: "Neuron / Brain Cell",
    handshapeR: Handshape.POINT,
    location: Location.NEUTRAL,
    movement: Movement.FORWARD,
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
  LAYER: createSignMetadata({
    gloss: "LAYER",
    label: "Layer / Level",
    handshapeR: Handshape.FLAT,
    location: Location.NEUTRAL,
    movement: Movement.STATIC,
    orientationR: Orientation.DOWN,
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
  DATA: createSignMetadata({
    gloss: "DATA",
    label: "Data / Information",
    handshapeR: Handshape.POINT,
    location: Location.CHEST,
    movement: Movement.STATIC,
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
  TRAIN: createSignMetadata({
    gloss: "TRAIN",
    label: "Train / Learn from examples",
    handshapeR: Handshape.POINT,
    location: Location.TEMPLE,
    movement: Movement.STATIC,
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
  MODEL: createSignMetadata({
    gloss: "MODEL",
    label: "Model",
    handshapeR: Handshape.FLAT,
    location: Location.CHEST,
    movement: Movement.CIRCULAR,
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
  ERROR: createSignMetadata({
    gloss: "ERROR",
    label: "Error / Mistake",
    handshapeR: Handshape.POINT,
    location: Location.NEUTRAL,
    movement: Movement.SHAKE,
    nmm: { headShake: true },
    source: "procedural",
    notes: "Educational representation — not ASL-validated",
  }),
};

// ---------------------------------------------------------------------------
// Dictionary query functions
// ---------------------------------------------------------------------------

export function getSignMetadata(word) {
  const key = String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
  return SIGN_METADATA[key] ?? null;
}

/**
 * Compute dictionary coverage across a list of gloss words.
 * Used for the coverage indicator in the player UI.
 */
export function computeDictionaryCoverage(signedCaptions) {
  const words = signedCaptions.flatMap((cap) => cap.words || []);
  const total = words.length;
  if (total === 0) return { covered: 0, total: 0, percentage: 0, validated: 0, unvalidated: 0 };

  let covered = 0;
  let validated = 0;
  let unvalidated = 0;

  for (const word of words) {
    const key = String(word || "").toUpperCase().replace(/[^A-Z]/g, "");
    const meta = SIGN_METADATA[key];
    if (meta) {
      covered++;
      if (meta.confidence >= 1) validated++;
      else unvalidated++;
    }
  }

  return {
    covered,
    total,
    percentage: Math.round((covered / total) * 100),
    validated,
    unvalidated,
  };
}

/**
 * Get validation status label for display.
 */
export function getValidationLabel(confidence) {
  if (confidence >= 1) return "Community-validated";
  if (confidence >= 0.5) return "Partially reviewed";
  return "Educational representation";
}
