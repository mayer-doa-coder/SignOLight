"""
WhisperX word-level timestamp extraction (Phase B2).

Downloads YouTube audio via yt-dlp, runs WhisperX phoneme-level alignment,
and returns per-word { word, startMs, endMs, score } timestamps for the full video.

The Node.js backend (sign.js) calls POST /nlp/timestamps, receives the full word
list, then assigns each caption its slice of spoken words (alignTimestampsToCaption).
The frontend (timelineScheduler.js) uses caption.spokenTimings to compute more
accurate word windows — using actual speech boundaries instead of syllable estimates.

RAM requirements (Hugging Face Spaces free tier has 16GB — all models fit):
  tiny  model (~150MB VRAM, ~500MB RAM total) — fastest inference (~30s / 10-min video)
  base  model (~290MB VRAM, ~900MB RAM total) — recommended: better WER, still fast
  small model (~470MB VRAM, ~1.5GB RAM total) — highest accuracy, ~2× slower
"""

import logging
import os
import subprocess
import tempfile
from typing import Any

log = logging.getLogger("signlight-nlp.timestamps")

# Configurable via env vars so the same image runs on both free and paid tiers.
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")   # "tiny" | "base" | "small"
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = "int8"   # CPU-optimal; use "float16" for GPU


def _download_audio(video_id: str, output_path: str) -> None:
    """Download YouTube audio as WAV using yt-dlp."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "--quiet",
            "-x",
            "--audio-format", "wav",
            "--audio-quality", "0",
            "-o", output_path,
            url,
        ],
        check=True,
        capture_output=True,
        timeout=120,
    )


def extract_word_timestamps(video_id: str) -> list[dict[str, Any]]:
    """
    Download YouTube audio and return word-level timestamps via WhisperX.

    Returns a list sorted by startMs:
      [ { "word": "NEURAL", "startMs": 1240, "endMs": 1680, "score": 0.97 }, ... ]

    Returns an empty list on any error so the caller degrades to syllable timing.
    whisperx is imported lazily so the service starts without it loaded in RAM —
    first call takes ~30s while the model downloads/loads; subsequent calls are fast.
    """
    try:
        import whisperx  # noqa: PLC0415 — lazy import (large torch dependency)
    except ImportError:
        log.error("[timestamps] whisperx is not installed")
        return []

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, f"{video_id}.wav")

            log.info("[timestamps] downloading audio for %s", video_id)
            _download_audio(video_id, audio_path)

            log.info("[timestamps] loading WhisperX model=%s device=%s", WHISPER_MODEL, WHISPER_DEVICE)
            model = whisperx.load_model(
                WHISPER_MODEL,
                WHISPER_DEVICE,
                compute_type=COMPUTE_TYPE,
            )

            audio = whisperx.load_audio(audio_path)
            result = model.transcribe(audio, batch_size=8)
            language = result.get("language", "en")
            log.info("[timestamps] transcription done, language=%s", language)

            # Phoneme-level forced alignment — this is what gives sub-100ms accuracy.
            model_a, metadata = whisperx.load_align_model(
                language_code=language,
                device=WHISPER_DEVICE,
            )
            aligned = whisperx.align(
                result["segments"],
                model_a,
                metadata,
                audio,
                device=WHISPER_DEVICE,
                return_char_alignments=False,
            )

            words: list[dict[str, Any]] = []
            for segment in aligned.get("segments", []):
                for w in segment.get("words", []):
                    start = w.get("start")
                    end = w.get("end")
                    if start is None or end is None:
                        continue
                    clean = (
                        w["word"]
                        .strip()
                        .upper()
                        .replace("'", "")
                        .replace(",", "")
                        .replace(".", "")
                    )
                    if not clean:
                        continue
                    words.append({
                        "word": clean,
                        "startMs": int(start * 1000),
                        "endMs": int(end * 1000),
                        "score": round(float(w.get("score", 1.0)), 3),
                    })

            words.sort(key=lambda x: x["startMs"])
            log.info("[timestamps] extracted %d words for %s", len(words), video_id)
            return {"words": words, "language": language}

    except subprocess.CalledProcessError as exc:
        log.error("[timestamps] yt-dlp failed for %s: %s", video_id, exc.stderr)
        return {"words": [], "language": "en"}
    except Exception as exc:  # noqa: BLE001
        log.error("[timestamps] whisperx failed for %s: %s", video_id, exc)
        return {"words": [], "language": "en"}
