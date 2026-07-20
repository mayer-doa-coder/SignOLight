// Guards the generated LLM vocabulary against drift from the avatar's real dictionary.
//
// backend/data/sign-vocabulary.json is generated from SIGN_MOTIONS in SignAvatar.js by
// scripts/sync-sign-vocabulary.js. If someone adds a word to SIGN_MOTIONS and forgets to
// re-run the generator, the LLM is never told the avatar can sign it, and every caption
// containing that word glosses to [CONCEPT:x] — a silent pause. That failure is invisible
// at runtime (no error, no warning, the avatar just stops signing), which is exactly the
// bug that let the two lists drift to 143 vs 332 words. This test makes it loud.
//
// Fix a failure here by running: npm run sync:vocab

const fs = require("fs");
const path = require("path");
const { extractSignMotionsBlock, EXCLUDED_FROM_PROMPT } = require("../../scripts/sync-sign-vocabulary");

const AVATAR_SOURCE = path.join(__dirname, "..", "..", "frontend", "src", "components", "SignAvatar.js");
const GENERATED = path.join(__dirname, "..", "data", "sign-vocabulary.json");

function signableWordsFromAvatar() {
  const block = extractSignMotionsBlock(fs.readFileSync(AVATAR_SOURCE, "utf8"));
  const words = [...block.matchAll(/^\s{2}([A-Z][A-Z0-9]*):\s*\{\s*label:/gm)].map((m) => m[1]);
  return [...new Set(words)];
}

describe("generated sign vocabulary", () => {
  const generated = JSON.parse(fs.readFileSync(GENERATED, "utf8"));
  const signable = signableWordsFromAvatar();
  const expected = signable.filter((w) => !EXCLUDED_FROM_PROMPT.has(w)).sort();

  it("is in sync with SIGN_MOTIONS in SignAvatar.js (run `npm run sync:vocab` if this fails)", () => {
    expect(generated.vocabulary).toEqual(expected);
  });

  it("records the true signable total", () => {
    expect(generated.totalSignable).toBe(signable.length);
  });

  it("offers every signable word to the LLM except the documented exclusions", () => {
    const offered = new Set(generated.vocabulary);
    const missing = signable.filter((w) => !offered.has(w) && !EXCLUDED_FROM_PROMPT.has(w));
    expect(missing).toEqual([]);
  });

  it("never offers a word the avatar cannot sign", () => {
    // The reverse drift: a phantom word in the prompt makes the LLM emit a gloss the
    // avatar silently renders as an idle pause.
    const canSign = new Set(signable);
    const phantom = generated.vocabulary.filter((w) => !canSign.has(w));
    expect(phantom).toEqual([]);
  });

  it("excludes contractions and filler from the prompt but keeps them signable", () => {
    // ASL gloss has no contractions; offering IM/YOURE invites non-ASL output. The motions
    // stay in SignAvatar.js so captions containing them still render via another path.
    const canSign = new Set(signable);
    for (const word of EXCLUDED_FROM_PROMPT) {
      expect(canSign.has(word)).toBe(true);
      expect(generated.vocabulary).not.toContain(word);
    }
  });
});
