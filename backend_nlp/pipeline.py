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
    """
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
