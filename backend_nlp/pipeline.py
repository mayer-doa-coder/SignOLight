"""
NLP glossing pipeline using spaCy en_core_web_md.
Replaces the regex-based simpleGloss() and Groq gloss prompt for Phase B.

Pipeline per caption:
1. Tokenize
2. POS tag → keep NOUN, VERB, ADJ, ADV, PROPN; drop DET/ADP/AUX/CCONJ/PUNCT
3. Lemmatize (spaCy handles irregular forms: went→go, children→child)
4. Named Entity Recognition → PERSON/ORG/GPE/PRODUCT → [FINGERSPELL:X]
5. Dependency parse → extract nsubj(S), dobj/iobj(O), ROOT(V) for SOV reorder
6. Semantic similarity (via semantic_map) → route unknowns to approx/concept
"""

import re
import spacy
from semantic_map import nearest_sign, APPROX_THRESHOLD, LOW_THRESHOLD, SIGN_VOCAB

SIGN_VOCAB_UPPER = {w.upper() for w in SIGN_VOCAB}

# Detects Bangla/Bengali script (Unicode block U+0980–U+09FF).
_BANGLA_RE = re.compile(r"[ঀ-৿]")


def _has_bangla(text: str) -> bool:
    return bool(_BANGLA_RE.search(text))


def _gloss_mixed_bangla(nlp: spacy.language.Language, text: str) -> dict:
    """
    Fallback pipeline for Bengali or mixed Bangla-English text.
    English spaCy en_core_web_md cannot POS-tag Bengali script — so we route
    each whitespace-split token individually instead of running the full doc pipeline.
    Bengali-script tokens → concept card (honest unknown).
    ASCII tokens → normal route_token path via single-token spaCy doc.
    """
    tokens = text.split()[:8]
    words, word_meta = [], []
    for raw in tokens:
        if _BANGLA_RE.search(raw):
            entry = {"type": "concept", "word": raw, "confidence": 0.0, "nearest": None, "nearestScore": 0.0}
        else:
            doc = nlp(raw.lower())
            tok = doc[0] if doc else None
            entry = route_token(tok) if tok else {"type": "concept", "word": raw, "confidence": 0.0}
        words.append(entry.get("word", raw))
        word_meta.append(entry)
    gloss = " ".join(str(w).upper() for w in words if w)
    return {"gloss": gloss, "words": words, "wordMeta": word_meta, "sovOrder": words}

# POS tags to keep as content words
CONTENT_POS = {"NOUN", "VERB", "ADJ", "ADV", "PROPN", "NUM"}

# NER labels that should be fingerspelled
FINGERSPELL_NER = {"PERSON", "ORG", "GPE", "PRODUCT", "WORK_OF_ART", "FAC", "LOC", "EVENT"}

# Short word length threshold for fingerspelling concrete nouns
FINGERSPELL_SHORT_LEN = 5


def route_token(token: spacy.tokens.Token) -> dict:
    """
    Route a single spaCy token to the appropriate sign output.
    Returns a dict: { type, word, confidence, original?, nearest?, nearestScore? }
    """
    lemma = token.lemma_.upper().strip()
    raw   = token.text.upper().strip()

    # 1. Exact dictionary match on lemma
    if lemma in SIGN_VOCAB_UPPER:
        return {"type": "sign", "word": lemma, "confidence": 1.0}

    # 2. Named entity → fingerspell
    if token.ent_type_ in FINGERSPELL_NER:
        return {"type": "fingerspell", "word": raw, "confidence": 1.0}

    # 3. Short proper noun or abbreviation → fingerspell
    if token.pos_ == "PROPN" or (token.pos_ == "NOUN" and re.match(r"^[A-Z]{2,5}$", raw)):
        if len(lemma) <= FINGERSPELL_SHORT_LEN:
            return {"type": "fingerspell", "word": raw, "confidence": 0.9}

    # 4. Semantic similarity
    best_key, score = nearest_sign(token.lemma_)
    if score >= APPROX_THRESHOLD:
        return {
            "type": "sign_approx",
            "word": best_key,
            "original": lemma,
            "confidence": round(score, 3),
        }

    # 5. Concept card (honest unknown)
    nearest_hint = best_key if score >= LOW_THRESHOLD else None
    out: dict = {"type": "concept", "word": lemma, "confidence": 0.0}
    if nearest_hint:
        out["nearest"] = nearest_hint
        out["nearestScore"] = round(score, 3)
    return out


def sov_reorder(subject_words: list, object_words: list, verb_words: list, other: list) -> list:
    """BdSL SOV: topic/subject first, object next, verb(s) last."""
    return subject_words + other + object_words + verb_words


def gloss_caption(nlp: spacy.language.Language, text: str) -> dict:
    """
    Full NLP pipeline for one caption text.
    Returns:
      {
        gloss: "NETWORK PATTERN [FINGERSPELL:RNA] [CONCEPT:ubiquitous]",
        words: [...],
        wordMeta: [{type, word, confidence, ...}, ...],
        sovOrder: [...]
      }
    Bengali or mixed Bangla-English text is routed to _gloss_mixed_bangla()
    because en_core_web_md cannot POS-tag Bengali script correctly.
    """
    if not text or not text.strip():
        return {"gloss": "", "words": [], "wordMeta": [], "sovOrder": []}
    if _has_bangla(text):
        return _gloss_mixed_bangla(nlp, text)
    doc = nlp(text)

    subjects, objects, verbs, others = [], [], [], []
    word_meta = []

    for token in doc:
        if token.pos_ not in CONTENT_POS:
            continue
        if token.is_stop and token.pos_ not in {"PROPN", "NUM"}:
            continue

        routed = route_token(token)
        word_meta.append(routed)

        # Build gloss token string
        if routed["type"] == "sign" or routed["type"] == "sign_approx":
            gloss_tok = routed["word"]
        elif routed["type"] == "fingerspell":
            gloss_tok = f"[FINGERSPELL:{routed['word']}]"
        else:
            gloss_tok = f"[CONCEPT:{routed['word']}]"

        # SOV bucket by dependency role
        dep = token.dep_
        if dep in ("nsubj", "nsubjpass"):
            subjects.append(gloss_tok)
        elif dep in ("dobj", "iobj", "attr", "pobj"):
            objects.append(gloss_tok)
        elif dep in ("ROOT", "relcl") and token.pos_ == "VERB":
            verbs.append(gloss_tok)
        else:
            others.append(gloss_tok)

    ordered = sov_reorder(subjects, objects, verbs, others)[:8]

    return {
        "gloss": " ".join(ordered),
        "words": ordered,
        "wordMeta": word_meta,
        "sovOrder": ordered,
    }
