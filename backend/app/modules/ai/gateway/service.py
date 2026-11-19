"""AI gateway features: image classification, menu extraction, dish analysis.

The model only perceives (what is in the photo). Everything numeric that the chef
acts on (prices read from the printed text, units, document arithmetic, ingredient
matching, the suggested selling price) is computed here deterministically, and the
server decides which clarifying question to ask (v2 prompts, Step 2a build step 5).
"""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AiPrimaryFailedError
from app.domain.calculations import convert_quantity
from app.modules.ai.clarifications import ScanAnswers, log_clarifications
from app.modules.ai.gateway.core import (
    classification_cache,
    image_hash,
    language_name,
    load_prompt,
    structured_call,
)
from app.modules.ai.gateway.scans import build_document, build_menu, scan_context, table_rates
from app.modules.ai.schemas.gateway import (
    DishAnalysisResponse,
    DishIngredientResponse,
    DishPrice,
    DocumentExtractionResponse,
    DocumentResolveRequest,
    ImageClassificationResponse,
    MenuExtractionResponse,
    MenuResolveRequest,
    ModelDishAnalysisV2,
    ModelDocumentExtractionV2,
    ModelImageClassification,
    ModelMenuExtractionV2,
)
from app.modules.exchange_rates.costs import KitchenUnitCosts, kitchen_unit_costs
from app.modules.ingredients.models import Ingredient
from app.modules.ingredients.repository import IngredientRepository
from app.modules.kitchens.models import Kitchen
from app.shared.money import Money, price_step, round_up_to_step
from app.shared.schemas.money import MoneyOut

CLASSIFY_PROMPT = ("classify_image", "v1")
MENU_PROMPT = ("menu_extract", "v2")
DISH_PROMPT = ("dish_analyze", "v2")
DOCUMENT_PROMPT = ("document_extract", "v2")

_MAX_INGREDIENTS_IN_PROMPT = 200


def _normalise(name: str) -> str:
    n = name.strip().lower()
    return n[:-1] if n.endswith("s") and len(n) > 3 else n


class AiGatewayService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
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

        try:
            result = await structured_call(
                feature="image_classify",
                prompt=prompt,
                system=prompt.render(),
                user_text="Classify this photo.",
                schema=ModelImageClassification,
                timeout_seconds=settings.AI_TIMEOUT_CLASSIFY_MS / 1000,
                request_id=request_id,
                kitchen_id=str(kitchen.id),
                model=settings.META_MUSE_SPARK_FAST_MODEL or None,
                tier="fast",
                effort=settings.ANTHROPIC_EFFORT_CLASSIFY,
                max_tokens=1024,
                image=image,
                image_mime=mime,
                # If Claude fails or times out, ask the chef (instant, always right)
                # instead of waiting for the slower fallback model.
                policy="no_failover",
            )
        except AiPrimaryFailedError:
            return ImageClassificationResponse(
                status="classify_unavailable",
                kind=None,
                confidence=None,
                image_quality=None,
                request_id=request_id,
                prompt_version=prompt.id,
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
            schema=ModelMenuExtractionV2,
            timeout_seconds=settings.AI_TIMEOUT_EXTRACT_MS / 1000,
            tier="standard",
            effort=settings.ANTHROPIC_EFFORT_EXTRACT,
            locale=language,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            image=image,
            image_mime=mime,
        )
        response = await build_menu(
            result.items,
            kind=result.kind,
            image_quality=result.image_quality,
            ctx=scan_context(kitchen),
            answers=ScanAnswers(),
            rate_for=table_rates(self._db, kitchen),
            request_id=request_id,
            prompt_version=prompt.id,
        )
        log_clarifications("menu_scan", request_id, response.clarifications)
        return response

    async def resolve_menu(
        self, kitchen: Kitchen, body: MenuResolveRequest
    ) -> MenuExtractionResponse:
        """The same scan re-read with the chef's answers: no model call, nothing saved."""
        response = await build_menu(
            body.items,
            kind=body.kind,
            image_quality=body.image_quality,
            ctx=scan_context(kitchen),
            answers=body.answers,
            rate_for=table_rates(self._db, kitchen),
            request_id=body.request_id,
            prompt_version=load_prompt(*MENU_PROMPT).id,
        )
        log_clarifications("menu_scan", body.request_id, response.clarifications[:1])
        return response

    async def extract_document(
        self, kitchen: Kitchen, image: bytes, mime: str, language: str, request_id: str
    ) -> DocumentExtractionResponse:
        """Delivery note / receipt → line items for Log Delivery, with the arithmetic
        checked (flagged, never corrected). Nothing is saved here."""
        prompt = load_prompt(*DOCUMENT_PROMPT)
        result = await structured_call(
            feature="document_scan",
            prompt=prompt,
            system=prompt.render(language=language_name(language)),
            user_text="List every row on this document, including totals.",
            schema=ModelDocumentExtractionV2,
            timeout_seconds=settings.AI_TIMEOUT_EXTRACT_MS / 1000,
            tier="standard",
            effort=settings.ANTHROPIC_EFFORT_EXTRACT,
            locale=language,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            image=image,
            image_mime=mime,
        )
        response = await self._document(kitchen, result, ScanAnswers(), request_id, prompt.id)
        log_clarifications("document_scan", request_id, response.clarifications)
        return response

    async def resolve_document(
        self, kitchen: Kitchen, body: DocumentResolveRequest
    ) -> DocumentExtractionResponse:
        response = await self._document(
            kitchen,
            body.extraction,
            body.answers,
            body.request_id,
            load_prompt(*DOCUMENT_PROMPT).id,
        )
        log_clarifications("document_scan", body.request_id, response.clarifications[:1])
        return response

    async def _document(
        self,
        kitchen: Kitchen,
        raw: ModelDocumentExtractionV2,
        answers: ScanAnswers,
        request_id: str,
        prompt_version: str,
    ) -> DocumentExtractionResponse:
        return await build_document(
            raw,
            ctx=scan_context(kitchen),
            answers=answers,
            rate_for=table_rates(self._db, kitchen),
            request_id=request_id,
            prompt_version=prompt_version,
            iso_date=_iso_date_or_none(raw.document_date),
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
            schema=ModelDishAnalysisV2,
            timeout_seconds=settings.AI_TIMEOUT_EXTRACT_MS / 1000,
            tier="standard",
            effort=settings.ANTHROPIC_EFFORT_EXTRACT,
            locale=language,
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

        # Costs in the kitchen's currency, converted by deterministic code from the rates
        # table; the model never sees or supplies a rate.
        unit_costs = await kitchen_unit_costs(self._db, kitchen, [m[0] for m in matched])
        price, reason = _price_from_costs(
            matched, total=len(result.ingredients), unit_costs=unit_costs, kitchen=kitchen
        )
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
    matched: list[tuple[Ingredient, Decimal, str]],
    total: int,
    unit_costs: KitchenUnitCosts,
    kitchen: Kitchen,
) -> tuple[DishPrice | None, str | None]:
    """Deterministic price range in the kitchen's currency: ingredient cost per portion
    ÷ target food-cost share, rounded UP to the kitchen's price step (decision 7: the
    kitchen's own step, else the per-currency default, else the smallest unit)."""
    if total == 0:
        return None, "no_ingredients"
    cost = Decimal("0")
    costed = 0
    for ing, qty, unit in matched:
        unit_cost = unit_costs.get(ing)
        if unit_cost is None or ing.yield_fraction <= 0:
            continue
        qty_in_unit = convert_quantity(qty, unit, ing.unit)
        if qty_in_unit is None:
            continue
        cost += qty_in_unit / ing.yield_fraction * unit_cost.amount
        costed += 1
    if costed == 0 or cost <= 0:
        return None, "no_matched_costs"

    low_share = Decimal(str(settings.AI_TARGET_FOOD_COST_LOW))
    high_share = Decimal(str(settings.AI_TARGET_FOOD_COST_HIGH))
    currency = str(kitchen.currency)
    step = price_step(currency, settings.PRICE_ROUNDING_STEPS, kitchen.price_step)
    # A higher food-cost share means a lower price, and vice versa.
    low = Money.rounded(round_up_to_step(cost / high_share, step), currency)
    high = Money.rounded(round_up_to_step(cost / low_share, step), currency)
    return (
        DishPrice(
            low=float(low.amount),
            high=float(high.amount),
            currency=currency,
            low_money=MoneyOut(**low.to_api()),
            high_money=MoneyOut(**high.to_api()),
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
