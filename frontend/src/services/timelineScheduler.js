/**
 * TimelineScheduler — deterministic sign scheduling service.
 *
 * Architectural inspiration from Moryossef's "Real-Time Multilingual Sign Language Processing":
 *   - sign.mt: dictionary lookup → clip playback pipeline
 *   - CWASA: continuous word-to-animation scheduling
 *   - PAULA/ViSiCAST: timeline-locked avatar playback
 *
 * Key design properties:
 *   1. Deterministic — same input always produces same output
 *   2. Seek-safe — any arbitrary time produces correct state without history
 *   3. Pause-safe — frozen state is exactly re-computable on resume
 *   4. Language-independent — no ASL-specific logic here
 *
 * This module contains PURE FUNCTIONS only — no React state, no side effects.
 * React components call these functions to compute sign state from video time.
 */

// ---------------------------------------------------------------------------
// Word timing computation
// ---------------------------------------------------------------------------

/**
 * Compute word timing windows for a caption.
 *
 * Phase B (active when caption.spokenTimings is set):
 *   Uses WhisperX spoken-word timestamps to derive the actual speech boundaries
 *   (first-word start → last-word end). YouTube captions include up to 400ms of
 *   leading/trailing silence; WhisperX removes it. Gloss words are then distributed
 *   by syllable weight within the real speech span — more accurate than using the
 *   raw caption start/end.
 *
 * Phase A (fallback — when spokenTimings is absent):
 *   Estimates word boundaries from vowel-group syllable count over the full caption
 *   duration. This remains the fallback when NLP_SERVICE_URL is unset.
 *
 * @param {object} caption - { start, end, words: string[], spokenTimings?: Array }
 * @returns {Array<{ word, index, startMs, endMs, durationMs }>}
 */
export function computeWordTimings(caption, fingerspellMode = false) {
  const words = caption?.words ?? [];
  if (words.length === 0) return [];

  const captionStart = caption?.start ?? 0;
  const captionEnd = caption?.end ?? 0;

  // Phase B: use actual speech boundaries from WhisperX.
  // spokenTimings is [ { word, startMs, endMs, score }, ... ] for this caption's
  // spoken English words. We take the first word's start and last word's end as
  // the true speech span, then distribute gloss words by syllable weight within it.
  const spokenTimings = caption?.spokenTimings;
  let effectiveStart = captionStart;
  let effectiveEnd = captionEnd;
  if (spokenTimings?.length >= 2) {
    effectiveStart = spokenTimings[0].startMs;
    effectiveEnd = spokenTimings[spokenTimings.length - 1].endMs;
  }

  const duration = Math.max(1, effectiveEnd - effectiveStart);

  // Fingerspell mode weights each word by its spellable letter count (the bracket tag,
  // e.g. [FINGERSPELL:GPT], is stripped first) so long words get proportionally more of the
  // window to spell out. Normal mode weights by syllable count for natural sign pacing.
  const charCounts = words.map((w) => {
    const raw = String(w);
    const banglaTag = raw.match(/^\[BANGLA:(.+)\]$/u);
    if (banglaTag) {
      return Math.max(
        1,
        [...banglaTag[1].normalize("NFC")].filter((character) =>
          /[\u0980-\u09FF]/u.test(character) && !["্", "়"].includes(character)
        ).length
      );
    }

    const spellingTag = raw.match(/^\[(?:FINGERSPELL|CONCEPT|NUMBER):(.+)\]$/i);
    if (spellingTag) {
      return Math.max(1, spellingTag[1].replace(/[^A-Za-z0-9]/g, "").length);
    }

    if (fingerspellMode) {
      return Math.max(1, raw.replace(/[^A-Za-z0-9]/g, "").length);
    }
    const clean = raw.replace(/[^A-Za-z]/g, "").toUpperCase();
    const syllables = clean.match(/[AEIOU]+/g);
    return Math.max(1, syllables ? syllables.length : 1);
  });
  const totalChars = charCounts.reduce((a, b) => a + b, 0);

  let cumulative = 0;
  return words.map((word, i) => {
    const wordStart = effectiveStart + (cumulative / totalChars) * duration;
    cumulative += charCounts[i];
    const wordEnd = effectiveStart + (cumulative / totalChars) * duration;
    return {
      word: String(word),
      index: i,
      startMs: wordStart,
      endMs: wordEnd,
      durationMs: wordEnd - wordStart,
    };
  });
}

// ---------------------------------------------------------------------------
// Sign state resolution
// ---------------------------------------------------------------------------

// Fraction of a word's window past which the avatar snaps rather than blends.
// If we arrive this late into a word (e.g. after a seek or buffer stall), it is
// not worth spending 100ms blending to a sign that is almost over.
const SNAP_THRESHOLD = 0.65;

/**
 * Resolve active sign state at currentTimeMs.
 *
 * Called on every 100ms time poll from YouTubePlayer.
 * Seek-safe by construction: always computes from current time, never from history.
 *
 * @param {object|null} caption   - current active caption (from findCaption)
 * @param {number} currentTimeMs  - current video time in milliseconds
 * @param {number} [speedFactor]  - playback speed (1.0 = normal, <1 = slow / learning mode)
 * @returns {{ wordIndex, wordProgress, wordTiming, isActive, isCatchingUp }}
 */
export function resolveSignState(caption, currentTimeMs, speedFactor = 1.0, fingerspellMode = false) {
  if (!caption) {
    return { wordIndex: 0, wordProgress: 0, wordTiming: null, isActive: false, isCatchingUp: false };
  }

  let timings = computeWordTimings(caption, fingerspellMode);
  if (speedFactor > 0 && speedFactor < 1) {
    timings = applySlowPlayback(timings, speedFactor);
  }

  if (timings.length === 0) {
    return { wordIndex: 0, wordProgress: 0, wordTiming: null, isActive: true, isCatchingUp: false };
  }

  // Before speech starts — can occur when spokenTimings push effectiveStart past captionStart.
  // Without this guard the for-loop finds no match and falls to the "Past last word" handler,
  // incorrectly showing the LAST word at the very START of a caption's silence window.
  if (currentTimeMs < timings[0].startMs) {
    return { wordIndex: 0, wordProgress: 0, wordTiming: timings[0], isActive: true, isCatchingUp: false };
  }

  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    if (currentTimeMs >= t.startMs && currentTimeMs <= t.endMs) {
      const progress = Math.max(
        0,
        Math.min(1, (currentTimeMs - t.startMs) / Math.max(1, t.durationMs))
      );
      return {
        wordIndex: i,
        wordProgress: progress,
        wordTiming: t,
        isActive: true,
        // Arrived in the last 35% of the word window — skip blend, snap directly.
        isCatchingUp: progress >= SNAP_THRESHOLD,
      };
    }
  }

  // Past last word — hold on last word (natural end, not a catch-up).
  const last = timings[timings.length - 1];
  return { wordIndex: timings.length - 1, wordProgress: 1, wordTiming: last, isActive: true, isCatchingUp: false };
}

// ---------------------------------------------------------------------------
// Sign queue (CWASA-inspired)
// ---------------------------------------------------------------------------

/**
 * Build a sign queue from a caption.
 * Produces an ordered list of sign descriptors, one per gloss word.
 * This is the "queue manager" component from Moryossef's architecture.
 *
 * In a full implementation this would handle:
 *   - Sign coarticulation (smooth transitions between signs)
 *   - NMM onset/offset markers in the queue
 *   - Hold frames between signs
 *
 * For Phase A: produces simple word→timing descriptors.
 *
 * @param {object} caption - { words, start, end, gloss, text }
 * @returns {Array<SignQueueEntry>}
 */
export function buildSignQueue(caption) {
  const timings = computeWordTimings(caption);
  return timings.map((timing) => ({
    ...timing,
    totalSigns: timings.length,
    isFirst: timing.index === 0,
    isLast: timing.index === timings.length - 1,
  }));
}

// ---------------------------------------------------------------------------
// Playback control helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether the avatar should actively animate.
 * Avatar is frozen when: paused, idle, or in seeking state (before snap).
 */
export function shouldAvatarAnimate(playerState, caption) {
  return (playerState === "playing" || playerState === "seeking") && caption !== null;
}

/**
 * Compute the effective NMM type for a given word position.
 * Only activates the NMM once the avatar reaches the triggering word.
 *
 * @param {object} nmm - from computeNMM: { type, wordIndex, headY }
 * @param {number} currentWordIndex - current word being signed
 * @returns {object} - effective NMM (may be neutralized if word not yet reached)
 */
export function effectiveNMM(nmm, currentWordIndex) {
  if (!nmm || nmm.type === "neutral") {
    return { type: "neutral", wordIndex: -1, headY: 0 };
  }

  // YN-questions apply from sentence start (wordIndex 0)
  if (nmm.type === "yn-question") {
    return nmm;
  }

  // WH-questions and negation: only activate once we reach the triggering word
  if (currentWordIndex >= nmm.wordIndex) {
    return nmm;
  }

  return { type: "neutral", wordIndex: -1, headY: 0 };
}

// ---------------------------------------------------------------------------
// Slow-playback support
// ---------------------------------------------------------------------------

/**
 * Adjust word timing windows for slow-playback mode.
 * Scales the duration of each word's window by speedFactor.
 * Used in learning mode where the avatar signs at reduced speed.
 *
 * @param {Array} timings - output of computeWordTimings
 * @param {number} speedFactor - 1.0 = normal, 0.5 = half speed
 * @returns {Array} adjusted timings
 */
export function applySlowPlayback(timings, speedFactor) {
  if (speedFactor >= 1 || timings.length === 0) return timings;

  const anchorMs = timings[0].startMs;
  let cursor = anchorMs;

  return timings.map((t) => {
    const scaledDuration = t.durationMs / speedFactor;
    const startMs = cursor;
    const endMs = cursor + scaledDuration;
    cursor = endMs;
    return { ...t, startMs, endMs, durationMs: scaledDuration };
  });
}
