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
 *   4. Language-independent — no BdSL-specific logic here
 *
 * This module contains PURE FUNCTIONS only — no React state, no side effects.
 * React components call these functions to compute sign state from video time.
 */

// ---------------------------------------------------------------------------
// Word timing computation
// ---------------------------------------------------------------------------

/**
 * Compute syllable-weighted word timing windows for a caption.
 *
 * Phase A (current): estimates word boundaries from vowel-group syllable count —
 *   a better proxy for signing duration than raw character count.
 * Phase B (WhisperX): replace with actual per-word ASR timestamps.
 *
 * @param {object} caption - { start, end, words: string[] }
 * @returns {Array<{ word, index, startMs, endMs, durationMs }>}
 */
export function computeWordTimings(caption) {
  const words = caption?.words ?? [];
  const captionStart = caption?.start ?? 0;
  const captionEnd = caption?.end ?? 0;
  const duration = Math.max(1, captionEnd - captionStart);

  if (words.length === 0) return [];

  const charCounts = words.map((w) => {
    const clean = String(w).replace(/[^A-Za-z]/g, "").toUpperCase();
    const syllables = clean.match(/[AEIOU]+/g);
    return Math.max(1, syllables ? syllables.length : 1);
  });
  const totalChars = charCounts.reduce((a, b) => a + b, 0);

  let cumulative = 0;
  return words.map((word, i) => {
    const wordStart = captionStart + (cumulative / totalChars) * duration;
    cumulative += charCounts[i];
    const wordEnd = captionStart + (cumulative / totalChars) * duration;
    return {
      word: String(word).toUpperCase().replace(/[^A-Z[\]:]/g, ""),
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

/**
 * Resolve active sign state at currentTimeMs.
 *
 * Called on every 100ms time poll from YouTubePlayer.
 * This is the core scheduling function — always computes from current time,
 * never from accumulated state (seek-safe by construction).
 *
 * @param {object|null} caption - current active caption (from findCaption)
 * @param {number} currentTimeMs - current video time in milliseconds
 * @returns {{ wordIndex, wordProgress, wordTiming, isActive }}
 */
export function resolveSignState(caption, currentTimeMs) {
  if (!caption) {
    return { wordIndex: 0, wordProgress: 0, wordTiming: null, isActive: false };
  }

  const timings = computeWordTimings(caption);

  if (timings.length === 0) {
    return { wordIndex: 0, wordProgress: 0, wordTiming: null, isActive: true };
  }

  // Find which word's time window contains currentTimeMs
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    if (currentTimeMs >= t.startMs && currentTimeMs <= t.endMs) {
      const progress = Math.max(
        0,
        Math.min(1, (currentTimeMs - t.startMs) / Math.max(1, t.durationMs))
      );
      return { wordIndex: i, wordProgress: progress, wordTiming: t, isActive: true };
    }
  }

  // Past last word in caption — stay on last word
  const last = timings[timings.length - 1];
  return { wordIndex: timings.length - 1, wordProgress: 1, wordTiming: last, isActive: true };
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
