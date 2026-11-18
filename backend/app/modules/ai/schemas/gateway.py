"""Structured schemas for the AI gateway (image classify, menu extract, dish analysis).

Mirrors mobile `src/features/ai/schemas.ts`. `Model*` classes describe what the model
must return; the `*Response` classes are what the API returns after server-side
validation and deterministic enrichment (ingredient matching, price calculation).
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field

ImageKind = Literal["menu", "dish", "receipt", "delivery_note", "stock_shelf", "other"]
ImageQuality = Literal["ok", "too_dark", "blurry", "too_small"]
MenuCategory = Literal["main", "side", "drink", "dessert"]
Confidence = Annotated[float, Field(ge=0.0, le=1.0)]


# ── Feature flags ──────────────────────────────────────────────────────────────


class AiFeaturesResponse(BaseModel):
    image_classify: bool
    menu_scan: bool
    dish_analysis: bool
    document_scan: bool
    assistant: bool
    transcription: bool
    # Only "en", "fr" and "rw" are ever listed, and only after STT evaluation passed.
    transcription_languages: list[str]


# ── What the chef did with an AI result (observability; no content) ────────────


class AiFeedbackRequest(BaseModel):
    request_id: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9-]+$")
    feature: Literal["assistant", "menu_scan", "dish_analysis", "document_scan"]
    outcome: Literal["user_confirmed", "user_edited", "user_rejected", "user_imported"]
    # Optional counts, e.g. items imported out of items suggested
    accepted: int | None = Field(default=None, ge=0, le=1000)
    suggested: int | None = Field(default=None, ge=0, le=1000)


# ── Image classification ──────────────────────────────────────────────────────


class ModelImageClassification(BaseModel):
    kind: ImageKind
    confidence: Confidence
    image_quality: ImageQuality


class ImageClassificationResponse(ModelImageClassification):
    request_id: str
    prompt_version: str


# ── Menu extraction ───────────────────────────────────────────────────────────


class ModelMenuItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: MenuCategory | None = None
    price_text: str | None = Field(
        default=None, description="Price exactly as written, e.g. '2.5k' or 'Frw 3,500'"
    )
    description: str | None = None
    name_confidence: Confidence
    price_confidence: Confidence
    source_text: str | None = None


class ModelMenuExtraction(BaseModel):
    kind: ImageKind
    image_quality: ImageQuality
    items: list[ModelMenuItem] = Field(default_factory=list, max_length=150)


class MenuExtractItem(BaseModel):
    name: str
    category: MenuCategory | None
    price: int | None
    description: str | None
    confidence: float
    name_confidence: float
    price_confidence: float
    source_text: str | None


class MenuExtractionResponse(BaseModel):
    kind: ImageKind
    items: list[MenuExtractItem]
    image_quality: ImageQuality
    request_id: str
    prompt_version: str


# ── Delivery note / receipt extraction ────────────────────────────────────────


class ModelDocumentLine(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity_text: str | None = Field(
        default=None, description="Quantity exactly as written, e.g. '25' or '2,5'"
    )
    unit: str | None = Field(default=None, max_length=30)
    unit_price_text: str | None = Field(default=None, description="Unit price exactly as written")
    line_total_text: str | None = Field(default=None, description="Line total exactly as written")
    confidence: Confidence


class ModelDocumentExtraction(BaseModel):
    kind: ImageKind
    image_quality: ImageQuality
    supplier_name: str | None = Field(default=None, max_length=200)
    document_date: str | None = Field(default=None, description="YYYY-MM-DD, or null")
    lines: list[ModelDocumentLine] = Field(default_factory=list, max_length=100)


class DocumentLine(BaseModel):
    name: str
    # Decimal string parsed deterministically from the text on the document; null if unreadable
    quantity: str | None
    unit: str | None
    # Whole RWF; derived from line total ÷ quantity when only the total is written
    unit_price: int | None
    line_total: int | None
    confidence: float


class DocumentExtractionResponse(BaseModel):
    kind: ImageKind
    supplier_name: str | None
    document_date: str | None
    lines: list[DocumentLine]
    image_quality: ImageQuality
    request_id: str
    prompt_version: str


# ── Dish analysis ─────────────────────────────────────────────────────────────


class ModelDishIngredient(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    qty_per_portion: float = Field(gt=0, le=100_000)
    unit: str = Field(min_length=1, max_length=30)
    ingredient_id: str | None = Field(
        default=None, description="ID from the kitchen ingredient list, or null"
    )
    confidence: Confidence


class ModelDishAnalysis(BaseModel):
    kind: ImageKind
    image_quality: ImageQuality
    dish_name: str | None = None
    dish_name_confidence: Confidence
    category: MenuCategory | None = None
    category_confidence: Confidence
    ingredients: list[ModelDishIngredient] = Field(default_factory=list, max_length=20)


class DishIngredientResponse(BaseModel):
    name: str
    qty_per_portion: str
    unit: str
    ingredient_id: str | None
    confidence: float


class DishPrice(BaseModel):
    low: int
    high: int
    cost_per_portion: float
    food_cost_low_pct: int
    food_cost_high_pct: int
    costed_ingredients: int
    total_ingredients: int


class DishAnalysisResponse(BaseModel):
    kind: ImageKind
    dish_name: str | None
    dish_name_confidence: float
    category: MenuCategory | None
    category_confidence: float
    ingredients: list[DishIngredientResponse]
    price: DishPrice | None
    price_unavailable_reason: Literal["no_matched_costs", "no_ingredients"] | None
    image_quality: ImageQuality
    request_id: str
    prompt_version: str
