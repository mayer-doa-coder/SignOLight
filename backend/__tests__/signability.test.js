// Verifies the backend's signability enforcement and — critically — that its lemmatizer stays
// in lockstep with the frontend's getSignInfo resolution. If SignAvatar.js changes how it
// resolves inflected words and lib/signability.js does not, this pass would wrap words the
// avatar can actually sign (or keep words it cannot), reintroducing silent pauses. The parity
// test drives the real frontend lemmatizer parsed out of the source, so drift fails loudly.

const fs = require("fs");
const path = require("path");
const { enforceSignability, isSignable, lemmatizeForDictionary, DROP_WORDS } = require("../lib/signability");

const AVATAR_SOURCE = path.join(__dirname, "..", "..", "frontend", "src", "components", "SignAvatar.js");

// Rebuild the frontend's resolver from source: its SIGN_MOTIONS keys + its exact
// lemmatizeForDictionary body, so parity is checked against the shipping implementation.
function buildFrontendResolver() {
  const src = fs.readFileSync(AVATAR_SOURCE, "utf8");
  const motions = new Set([...src.matchAll(/^\s{2}([A-Z][A-Z0-9]*):\s*\{\s*label:/gm)].map((m) => m[1]));
  const body = src.match(/function lemmatizeForDictionary\(word\)\s*\{[\s\S]*?\n\}/)[0]
    .replace("function lemmatizeForDictionary", "function frontendLemma")
    .replace(/if \(SIGN_MOTIONS\[candidate\]\) return SIGN_MOTIONS\[candidate\];/, "if (M.has(candidate)) return candidate;");
  // eslint-disable-next-line no-new-func
  const make = new Function("M", `${body}; return frontendLemma;`);
  const frontendLemma = make(motions);
  return { motions, resolves: (w) => motions.has(w) || frontendLemma(w) != null };
}

describe("signability enforcement", () => {
  it("wraps unknown content words as [CONCEPT:x] instead of leaving a silent pause", () => {
    // These were emitted as bare tokens by the live Groq API and had no sign. ADJUST was
    // one of them too, until the physics/biology vocabulary expansion added it as a real sign.
    const out = enforceSignability(["GRADIENT", "BACKPROPAGATION", "ADJUST", "CALCULABLE", "UNDEFINED"]);
    expect(out).toContain("[CONCEPT:backpropagation]");
    expect(out).toContain("[CONCEPT:calculable]");
    expect(out).toContain("[CONCEPT:undefined]");
    expect(out).toContain("GRADIENT"); // GRADIENT is signable — kept as-is
    expect(out).toContain("ADJUST"); // now signable too — kept as-is
  });

  it("drops leaked function words rather than pausing on them", () => {
    // "NETWORK LEARN FROM DATA" — FROM is a preposition the LLM should have dropped.
    expect(enforceSignability(["NETWORK", "LEARN", "FROM", "DATA"])).toEqual(["NETWORK", "LEARN", "DATA"]);
    expect(enforceSignability(["THE", "MODEL", "IS", "GOOD"])).toEqual(["MODEL", "GOOD"]);
  });

  it("keeps inflected words the avatar resolves at render time", () => {
    // Frontend lemmatizes NEURONS->NEURON, TRAINING->TRAIN, ACTIVATION->ACTIVATE.
    expect(enforceSignability(["NEURONS", "TRAINING", "ACTIVATION"])).toEqual(["NEURONS", "TRAINING", "ACTIVATION"]);
  });

  it("passes bracket-tagged tokens through untouched", () => {
    const tags = ["[FINGERSPELL:DNA]", "[CONCEPT:mathematics]", "[NUMBER:42]"];
    expect(enforceSignability(tags)).toEqual(tags);
  });

  it("never emits a bare word the avatar cannot render", () => {
    const glosses = [
      ["THE", "NEURAL", "NETWORK", "LEARNS", "PATTERNS", "FROM", "TRAINING", "DATA"],
      ["BACKPROPAGATION", "ADJUSTS", "WEIGHTS"],
      ["WHAT", "DOES", "ACTIVATION", "COMPUTE"],
    ];
    for (const g of glosses) {
      for (const token of enforceSignability(g)) {
        if (token.startsWith("[")) continue;
        expect(isSignable(token)).toBe(true);
      }
    }
  });
});

describe("backend lemmatizer parity with frontend getSignInfo", () => {
  const { resolves: frontendResolves } = buildFrontendResolver();

  // A broad spread of inflected forms — plurals, -ing/-ed, -tion, comparatives, doubled
  // consonants — the two resolvers must agree on every one.
  const samples = [
    "NEURONS", "WEIGHTS", "ACTIVATIONS", "TRAINING", "LEARNING", "GETTING", "RUNNING",
    "CONNECTIONS", "PREDICTED", "CLASSIFIED", "SIMPLER", "BIGGER", "FASTEST", "QUICKLY",
    "BACKPROPAGATION", "ADJUST", "CALCULABLE", "UNDEFINED", "FROM", "COMPILER", "TEACHER",
    "STUDIES", "PROCESSES", "MAKES", "GOES", "IDEAS", "FUNCTIONS", "MATRICES", "PIXELS",
  ];

  it.each(samples)("agrees on %s", (word) => {
    expect(isSignable(word)).toBe(frontendResolves(word));
  });
});
