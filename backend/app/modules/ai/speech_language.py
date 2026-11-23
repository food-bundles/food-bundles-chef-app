"""Speech-to-text language when the app does not send one (global readiness)."""

from __future__ import annotations

APP_LANGUAGES = ("en", "fr", "rw")

# Countries whose kitchens most likely speak French (Francophone Africa, Europe).
_FRENCH_COUNTRIES = {
    "FR", "BE", "CH", "LU", "MC", "CD", "CG", "SN", "CI", "CM", "BI", "BJ", "BF", "ML", "NE",
    "TD", "TG", "GA", "GN", "MG", "DJ", "CF", "KM", "HT",
}  # fmt: skip


def default_speech_language(chef_locale: str | None, country: str | None) -> str:
    """The chef's app language if it is one we speak, else from the kitchen's country
    (RW → rw, French-speaking → fr), else English."""
    base = (chef_locale or "").split("-")[0].lower()
    if base in APP_LANGUAGES:
        return base
    code = (country or "").upper()
    if code == "RW":
        return "rw"
    if code in _FRENCH_COUNTRIES:
        return "fr"
    return "en"
