import { banglaTextToWordTokens } from "./banglaAlphabet";

export function buildBanglaCaptions(rawCaptions, englishCaptions = []) {
  let englishIndex = 0;

  return (rawCaptions || []).map((caption) => {
    while (
      englishIndex < englishCaptions.length - 1 &&
      englishCaptions[englishIndex].end <= caption.start
    ) {
      englishIndex += 1;
    }

    const source = englishCaptions[englishIndex];
    const words = banglaTextToWordTokens(caption.text);
    return {
      ...caption,
      simplified: caption.text,
      gloss: words.join(" "),
      words,
      confidence: 0.7,
      ...(source?.spokenTimings?.length
        ? { spokenTimings: source.spokenTimings }
        : {}),
    };
  }).filter((caption) => caption.words.length > 0);
}
