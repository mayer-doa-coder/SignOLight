"""
SignOLight NLP microservice — FastAPI + spaCy en_core_web_md.
Exposes:
  POST /nlp/gloss         — single caption gloss
  POST /nlp/gloss/batch   — multiple captions gloss
  GET  /health            — readiness probe
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
