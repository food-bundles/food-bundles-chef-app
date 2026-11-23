"""Global readiness: the speech-to-text language never defaults to Kinyarwanda blindly."""

from __future__ import annotations

from app.modules.ai.speech_language import default_speech_language


def test_chef_language_wins() -> None:
    assert default_speech_language("fr", "RW") == "fr"
    assert default_speech_language("en-GB", "RW") == "en"


def test_country_when_the_chef_has_no_language() -> None:
    assert default_speech_language(None, "RW") == "rw"
    assert default_speech_language("", "SN") == "fr"
    assert default_speech_language("de", "KE") == "en"
    assert default_speech_language(None, None) == "en"
