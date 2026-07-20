function tokenUnitCount(token) {
  const raw = String(token || "");
  const bangla = raw.match(/^\[BANGLA:(.+)\]$/u);
  if (bangla) {
    return Math.max(
      1,
      [...bangla[1].normalize("NFC")].filter((character) =>
        /[\u0980-\u09FF]/u.test(character) && !["্", "়"].includes(character)
      ).length
    );
  }

  const spelling = raw.match(/^\[(?:FINGERSPELL|CONCEPT|NUMBER):(.+)\]$/i);
  if (spelling) {
    return Math.max(1, spelling[1].replace(/[^A-Za-z0-9]/g, "").length);
  }

  return 1;
}

export function captionSigningUnitMs(caption) {
  const duration = Math.max(1, Number(caption?.end) - Number(caption?.start));
  const units = (caption?.words || []).reduce(
    (total, word) => total + tokenUnitCount(word),
    0
  );
  return units > 0 ? duration / units : duration;
}

export function recommendedPlaybackRate(captions, minimumVisibleMs = 650) {
  const samples = (captions || [])
    .filter((caption) => caption?.words?.length && caption.end > caption.start)
    .map(captionSigningUnitMs)
    .sort((a, b) => a - b);

  if (!samples.length) return 1;
  // Pace for the denser caption windows instead of the median so short,
  // fingerspelled words do not flash by even when surrounding captions are slow.
  const denseSample = samples[Math.floor((samples.length - 1) * 0.25)];
  return [1, 0.75, 0.5, 0.25].find(
    (rate) => denseSample / rate >= minimumVisibleMs
  ) || 0.25;
}

export function attachSpokenTimings(captions, spokenWords) {
  if (!spokenWords?.length) return captions;
  return (captions || []).map((caption) => {
    const spokenTimings = spokenWords.filter(
      (word) => word.startMs >= caption.start && word.startMs < caption.end
    );
    return spokenTimings.length >= 2
      ? { ...caption, spokenTimings }
      : caption;
  });
}
