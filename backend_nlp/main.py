"""
SignOLight NLP microservice — FastAPI + spaCy en_core_web_md.
Exposes:
  POST /nlp/gloss           — single caption gloss
  POST /nlp/gloss/batch     — multiple captions gloss
  POST /nlp/timestamps      — WhisperX word-level timestamps (Phase B2)
  GET  /health              — readiness probe
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

import spacy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import semantic_map
from pipeline import gloss_caption
from timestamps import extract_word_timestamps

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("signlight-nlp")

nlp: Optional[spacy.language.Language] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global nlp
    log.info("Loading spaCy en_core_web_md…")
    nlp = spacy.load("en_core_web_md", exclude=["parser"])
    nlp.enable_pipe("senter")  # sentence segmentation for dependency parse
    # Re-enable parser for dependency roles (SOV reorder)
    if "parser" not in nlp.pipe_names:
        nlp = spacy.load("en_core_web_md")
    semantic_map.init(nlp)
    log.info(f"NLP ready — {len(semantic_map._sign_vectors)} sign vectors pre-computed")
    # Bengali spaCy model — optional; mixed-language tokens fall back to concept cards if unavailable
    try:
        nlp_bn = spacy.load("bn_core_news_sm")
        log.info("Bengali spaCy model loaded: bn_core_news_sm")
    except Exception:
        nlp_bn = None
        log.info("Bengali spaCy model not available — mixed-language tokens routed to concept cards")
    app.state.nlp_bn = nlp_bn
    yield
    log.info("Shutting down NLP service")


app = FastAPI(title="SignOLight NLP", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GlossRequest(BaseModel):
    text: str


class BatchGlossRequest(BaseModel):
    captions: list[dict]   # each has at least { text: str }


class TimestampRequest(BaseModel):
    videoId: str


@app.get("/health")
def health():
    return {"status": "ok", "model": "en_core_web_md", "signs": len(semantic_map._sign_vectors)}


@app.post("/nlp/gloss")
def gloss_single(req: GlossRequest):
    if not nlp:
        raise HTTPException(503, "Model not loaded")
    if not req.text.strip():
        return {"gloss": "", "words": [], "wordMeta": [], "sovOrder": []}
    return gloss_caption(nlp, req.text)


@app.post("/nlp/gloss/batch")
def gloss_batch(req: BatchGlossRequest):
    if not nlp:
        raise HTTPException(503, "Model not loaded")
    results = []
    for cap in req.captions:
        text = str(cap.get("text") or cap.get("simplified") or "").strip()
        if not text:
            results.append({"gloss": "", "words": [], "wordMeta": [], "sovOrder": []})
        else:
            results.append(gloss_caption(nlp, text))
    return {"results": results, "count": len(results)}


@app.post("/nlp/timestamps")
def get_timestamps(req: TimestampRequest):
    """
    Download YouTube audio and extract word-level timestamps via WhisperX.

    This is a slow endpoint (~60-120s for a 10-minute video on CPU).
    The Node backend calls this in parallel with the Groq gloss pipeline
    and attaches results as caption.spokenTimings on each caption.

    Response:
      { "videoId": "...", "words": [ { "word", "startMs", "endMs", "score" }, ... ] }
    """
    video_id = req.videoId.strip()
    if not video_id:
        raise HTTPException(400, "videoId is required")

    result = extract_word_timestamps(video_id)
    words = result.get("words", []) if isinstance(result, dict) else result
    language = result.get("language", "en") if isinstance(result, dict) else "en"
    return {"videoId": video_id, "words": words, "language": language, "count": len(words)}
