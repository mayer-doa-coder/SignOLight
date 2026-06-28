"""
Semantic similarity engine for vocabulary mapping.
Pre-computes spaCy word vectors for all SIGN_MOTIONS entries at startup.
For any unknown word, finds the nearest dictionary entry by cosine similarity.
Handles the open-vocabulary problem: any word in English (or novel words via
character n-grams) can be compared to the 58-entry sign dictionary.
"""

import numpy as np
import spacy

# The 58-word SIGN_MOTIONS vocabulary (mirrors SignAvatar.js SIGN_MOTIONS keys).
SIGN_VOCAB = [
    # Social
    "hello", "thank", "you", "me", "yes", "no", "learn", "know", "understand",
    "good", "bad", "help", "please", "sorry", "what", "where", "when", "how",
    "why", "because", "sign", "bdsl",
    # Neural-network domain
    "network", "neuron", "layer", "train", "model", "weight", "gradient", "loss",
    "function", "activate", "data", "input", "output", "error", "predict",
    "calculate", "matrix", "vector", "pattern", "image", "classify", "accuracy",
    "probability", "deep", "connect", "node", "signal", "pixel", "example",
    "process", "step", "result", "problem", "solution", "computer", "program",
]

_sign_vectors: dict[str, np.ndarray] = {}
_nlp = None


def init(nlp: spacy.language.Language) -> None:
    """Pre-compute vectors for all SIGN_VOCAB entries. Call once at startup."""
    global _nlp, _sign_vectors
    _nlp = nlp
    for word in SIGN_VOCAB:
        tok = nlp(word)[0]
        if tok.has_vector:
            _sign_vectors[word.upper()] = tok.vector


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def nearest_sign(word: str) -> tuple[str, float]:
    """
    Returns (best_sign_key, cosine_similarity) for any word.
    Uses spaCy en_core_web_md word vectors (685k tokens).
    Unknown words get a character-n-gram approximated vector.
    """
    if not _nlp or not _sign_vectors:
        return ("", 0.0)

    tok = _nlp(word.lower())[0]
    if not tok.has_vector:
        return ("", 0.0)

    vec = tok.vector
    best_key = ""
    best_score = -1.0
    for key, sign_vec in _sign_vectors.items():
        score = cosine(vec, sign_vec)
        if score > best_score:
            best_score = score
            best_key = key

    return (best_key, best_score)


# Thresholds: tune via experimentation on representative lecture vocabulary.
APPROX_THRESHOLD = 0.82   # ≥ this → show nearest sign (annotated ~WORD)
LOW_THRESHOLD    = 0.62   # < this → pure concept card (no nearest hint)
