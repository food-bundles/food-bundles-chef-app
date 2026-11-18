"""AI gateway features: image classification, menu extraction, dish analysis.

The model only perceives (what is in the photo). Everything numeric that the chef
acts on — RWF prices parsed from menu text, ingredient matching to kitchen stock,
and the suggested selling price — is computed here deterministically.
"""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.calculations import (
    convert_quantity,
    parse_quantity,
    parse_rwf_price,
    round_up_price,
    unit_price_from_total,
)
from app.modules.ai.gateway.core import (
    classification_cache,
    image_hash,
    language_name,
    load_prompt,
    structured_call,
)
from app.modules.ai.schemas.gateway import (
    DishAnalysisResponse,
    DishIngredientResponse,
    DishPrice,
    DocumentExtractionResponse,
    DocumentLine,
    ImageClassificationResponse,
    MenuExtractionResponse,
    MenuExtractItem,
    ModelDishAnalysis,
    ModelDocumentExtraction,
    ModelImageClassification,
    ModelMenuExtraction,
)
from app.modules.ingredients.models import Ingredient
from app.modules.ingredients.repository import IngredientRepository
from app.modules.kitchens.models import Kitchen

CLASSIFY_PROMPT = ("classify_image", "v1")
MENU_PROMPT = ("menu_extract", "v1")
DISH_PROMPT = ("dish_analyze", "v1")
DOCUMENT_PROMPT = ("document_extract", "v1")

_MAX_INGREDIENTS_IN_PROMPT = 200


def _normalise(name: str) -> str:
    n = name.strip().lower()
    return n[:-1] if n.endswith("s") and len(n) > 3 else n


class AiGatewayService:
    def __init__(self, db: AsyncSession) -> None:
        self._ingredients = IngredientRepository(db)

    async def classify(
        self, kitchen: Kitchen, image: bytes, mime: str, request_id: str
    ) -> ImageClassificationResponse:
        prompt = load_prompt(*CLASSIFY_PROMPT)
        cache_key = f"{prompt.id}:{image_hash(image)}"
        cached = classification_cache.get(cache_key)
        if isinstance(cached, ModelImageClassification):
            return ImageClassificationResponse(
                **cached.model_dump(), request_id=request_id, prompt_version=prompt.id
            )

        result = await structured_call(
            feature="image_classify",
            prompt=prompt,
            system=prompt.render(),
            user_text="Classify this photo.",
            schema=ModelImageClassification,
            timeout_seconds=settings.AI_CLASSIFY_TIMEOUT_SECONDS,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            model=settings.META_MUSE_SPARK_FAST_MODEL or None,
            image=image,
            image_mime=mime,
        )
        classification_cache.set(cache_key, result)
        return ImageClassificationResponse(
            **result.model_dump(), request_id=request_id, prompt_version=prompt.id
        )

    async def extract_menu(
        self, kitchen: Kitchen, image: bytes, mime: str, language: str, request_id: str
    ) -> MenuExtractionResponse:
        prompt = load_prompt(*MENU_PROMPT)
        result = await structured_call(
            feature="menu_scan",
            prompt=prompt,
            system=prompt.render(language=language_name(language)),
            user_text="List every item on this menu.",
            schema=ModelMenuExtraction,
            timeout_seconds=settings.AI_EXTRACT_TIMEOUT_SECONDS,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            image=image,
            image_mime=mime,
        )
        items: list[MenuExtractItem] = []
        for item in result.items:
            price = parse_rwf_price(item.price_text)
            # An unreadable price text lowers our confidence in the price to zero.
            price_conf = item.price_confidence if price is not None else 0.0
            items.append(
                MenuExtractItem(
                    name=item.name.strip(),
                    category=item.category,
                    price=price,
                    description=item.description,
                    confidence=round(
                        min(
                            item.name_confidence,
                            price_conf if item.price_text else item.name_confidence,
                        ),
                        2,
                    ),
                    name_confidence=item.name_confidence,
                    price_confidence=price_conf,
                    source_text=item.source_text,
                )
            )
        return MenuExtractionResponse(
            kind=result.kind,
            items=items,
            image_quality=result.image_quality,
            request_id=request_id,
            prompt_version=prompt.id,
        )

    async def extract_document(
        self, kitchen: Kitchen, image: bytes, mime: str, language: str, request_id: str
    ) -> DocumentExtractionResponse:
        """Delivery note / receipt → line items for Log Delivery. Nothing is saved here."""
        prompt = load_prompt(*DOCUMENT_PROMPT)
        result = await structured_call(
            feature="document_scan",
            prompt=prompt,
            system=prompt.render(language=language_name(language)),
            user_text="List every delivered line on this document.",
            schema=ModelDocumentExtraction,
            timeout_seconds=settings.AI_EXTRACT_TIMEOUT_SECONDS,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            image=image,
            image_mime=mime,
        )
        lines: list[DocumentLine] = []
        for line in result.lines:
            quantity = parse_quantity(line.quantity_text)
            line_total = parse_rwf_price(line.line_total_text)
            unit_price = parse_rwf_price(line.unit_price_text) or unit_price_from_total(
                line_total, quantity
            )
            # A number we could not read lowers the confidence of the whole line.
            unreadable = (line.quantity_text is not None and quantity is None) or (
                line.unit_price_text is not None and parse_rwf_price(line.unit_price_text) is None
            )
            lines.append(
                DocumentLine(
                    name=line.name.strip(),
                    quantity=format(quantity.normalize(), "f") if quantity is not None else None,
                    unit=(line.unit or "").strip() or None,
                    unit_price=unit_price,
                    line_total=line_total,
                    confidence=round(
                        min(line.confidence, 0.4) if unreadable else line.confidence, 2
                    ),
                )
            )
        return DocumentExtractionResponse(
            kind=result.kind,
            supplier_name=(result.supplier_name or "").strip() or None,
            document_date=_iso_date_or_none(result.document_date),
            lines=lines,
            image_quality=result.image_quality,
            request_id=request_id,
            prompt_version=prompt.id,
        )

    async def analyze_dish(
        self,
        kitchen: Kitchen,
        image: bytes,
        mime: str,
        language: str,
        name_hint: str | None,
        request_id: str,
    ) -> DishAnalysisResponse:
        prompt = load_prompt(*DISH_PROMPT)
        kitchen_ingredients = await self._ingredients.list_for_kitchen(kitchen.id, active_only=True)
        listing = (
            "\n".join(
                f"{ing.id} | {ing.name} | {ing.unit}"
                for ing in kitchen_ingredients[:_MAX_INGREDIENTS_IN_PROMPT]
            )
            or "(none yet)"
        )
        hint_line = (
            f'the chef calls it "{name_hint.strip()}"'
            if name_hint and name_hint.strip()
            else "no name given"
        )

        result = await structured_call(
            feature="dish_analysis",
            prompt=prompt,
            system=prompt.render(
                language=language_name(language),
                ingredient_list=listing,
                name_hint_line=hint_line,
            ),
            user_text="Analyse this dish photo.",
            schema=ModelDishAnalysis,
            timeout_seconds=settings.AI_EXTRACT_TIMEOUT_SECONDS,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            image=image,
            image_mime=mime,
        )

        by_id = {str(ing.id): ing for ing in kitchen_ingredients}
        by_name = {_normalise(ing.name): ing for ing in kitchen_ingredients}
        ingredients: list[DishIngredientResponse] = []
        matched: list[tuple[Ingredient, Decimal, str]] = []
        for ai_ing in result.ingredients:
            # Only trust ids that really belong to this kitchen; otherwise match by name.
            ing = by_id.get(ai_ing.ingredient_id or "") or by_name.get(_normalise(ai_ing.name))
            qty = Decimal(str(ai_ing.qty_per_portion)).quantize(Decimal("0.001"))
            ingredients.append(
                DishIngredientResponse(
                    name=ing.name if ing else ai_ing.name.strip(),
                    qty_per_portion=format(qty.normalize(), "f"),
                    unit=ai_ing.unit,
                    ingredient_id=str(ing.id) if ing else None,
                    confidence=ai_ing.confidence,
                )
            )
            if ing is not None:
                matched.append((ing, qty, ai_ing.unit))

        price, reason = _price_from_costs(matched, total=len(result.ingredients))
        return DishAnalysisResponse(
            kind=result.kind,
            dish_name=(name_hint.strip() if name_hint and name_hint.strip() else result.dish_name),
            dish_name_confidence=1.0
            if name_hint and name_hint.strip()
            else result.dish_name_confidence,
            category=result.category,
            category_confidence=result.category_confidence,
            ingredients=ingredients,
            price=price,
            price_unavailable_reason=reason,
            image_quality=result.image_quality,
            request_id=request_id,
            prompt_version=prompt.id,
        )


def _price_from_costs(
    matched: list[tuple[Ingredient, Decimal, str]], total: int
) -> tuple[DishPrice | None, str | None]:
    """Deterministic price range: ingredient cost per portion ÷ target food-cost share."""
    if total == 0:
        return None, "no_ingredients"
    cost = Decimal("0")
    costed = 0
    for ing, qty, unit in matched:
        if ing.cost_per_unit is None or ing.yield_fraction <= 0:
            continue
        qty_in_unit = convert_quantity(qty, unit, ing.unit)
        if qty_in_unit is None:
            continue
        cost += qty_in_unit / ing.yield_fraction * ing.cost_per_unit
        costed += 1
    if costed == 0 or cost <= 0:
        return None, "no_matched_costs"

    low_share = Decimal(str(settings.AI_TARGET_FOOD_COST_LOW))
    high_share = Decimal(str(settings.AI_TARGET_FOOD_COST_HIGH))
    return (
        DishPrice(
            # A higher food-cost share means a lower price, and vice versa.
            low=round_up_price(cost / high_share),
            high=round_up_price(cost / low_share),
            cost_per_portion=float(cost.quantize(Decimal("0.01"))),
            food_cost_low_pct=int(low_share * 100),
            food_cost_high_pct=int(high_share * 100),
            costed_ingredients=costed,
            total_ingredients=total,
        ),
        None,
    )


def _iso_date_or_none(text: str | None) -> str | None:
    """Keep a document date only when it is a real YYYY-MM-DD date."""
    if not text:
        return None
    try:
        return date.fromisoformat(text.strip()).isoformat()
    except ValueError:
        return None


def new_request_id(header_value: str | None) -> str:
    """Use the client's X-Request-ID when it looks like an id, else generate one."""
    if header_value and 8 <= len(header_value) <= 64 and header_value.replace("-", "").isalnum():
        return header_value
    return str(uuid.uuid4())
