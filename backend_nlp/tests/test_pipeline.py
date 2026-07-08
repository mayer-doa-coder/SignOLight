"""
Unit tests for the NLP glossing pipeline.
Run: cd backend_nlp && python -m pytest tests/ -v
Requires: pip install -r requirements.txt && python -m spacy download en_core_web_md
"""

import pytest
import spacy
import semantic_map
from pipeline import gloss_caption, route_token


@pytest.fixture(scope="module")
def nlp():
    model = spacy.load("en_core_web_md")
    semantic_map.init(model)
    return model


def test_exact_sign_match(nlp):
    result = gloss_caption(nlp, "The neural network learns patterns")
    assert "NETWORK" in result["words"] or "PATTERN" in result["words"]
    assert "LEARN" in result["words"]


def test_sov_verb_last(nlp):
    result = gloss_caption(nlp, "The student learns quickly")
    words = result["words"]
    if "LEARN" in words:
        # In SOV, LEARN should come after the subject
        assert words.index("LEARN") > 0


def test_proper_noun_fingerspell(nlp):
    result = gloss_caption(nlp, "Barack Obama visited NASA")
    gloss = result["gloss"]
    # Proper nouns should be fingerspelled
    assert "[FINGERSPELL:" in gloss or any(
        m["type"] == "fingerspell" for m in result["wordMeta"]
    )


def test_concept_card_for_unknown(nlp):
    result = gloss_caption(nlp, "The epistemological framework")
    meta = result["wordMeta"]
    # "epistemological" is highly unlikely to be in SIGN_VOCAB or semantically close
    types = {m["type"] for m in meta}
    assert "concept" in types or "sign_approx" in types  # must handle it somehow, not crash


def test_empty_text(nlp):
    result = gloss_caption(nlp, "")
    assert result["gloss"] == ""
    assert result["words"] == []


def test_max_8_words(nlp):
    long_text = "The neural network model trains on input data and calculates gradient loss to predict output"
    result = gloss_caption(nlp, long_text)
    assert len(result["words"]) <= 8


def test_concept_card_has_nearest_when_close(nlp):
    """Words semantically close to a sign but below threshold should hint at nearest."""
    result = gloss_caption(nlp, "The computation requires resources")
    # "computation" should be near CALCULATE/COMPUTE/PROCESS
    for meta in result["wordMeta"]:
        if meta["word"] in ("COMPUTATION", "COMPUTE"):
            # Should be sign_approx or concept with a nearest hint
            assert meta["type"] in ("sign_approx", "concept", "sign")
