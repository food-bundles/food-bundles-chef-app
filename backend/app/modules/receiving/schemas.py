from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from app.shared.enums import ReceivingDecision


class ReceivingLineRequest(BaseModel):
    order_line_id: uuid.UUID
    quantity_received: Decimal
    decision: ReceivingDecision = ReceivingDecision.ACCEPTED
    rejection_reason: str | None = None
    # Phase 9: Good / Issue, and why (short weight, damaged, not fresh).
    quality: Literal["good", "issue"] | None = None
    issue_reasons: list[Literal["short_weight", "damaged", "not_fresh"]] = []


class BulkReceivingRequest(BaseModel):
    lines: list[ReceivingLineRequest]


class ReceivingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_line_id: uuid.UUID
    kitchen_id: uuid.UUID
    quantity_received: Decimal
    decision: ReceivingDecision
    rejection_reason: str | None
    short_delivery: bool
    quality: str | None = None
    issue_reasons: list[str] = []
    received_by: uuid.UUID | None

    @field_validator("issue_reasons", mode="before")
    @classmethod
    def _split_reasons(cls, value: object) -> object:
        if value is None:
            return []
        if isinstance(value, str):
            return [r for r in value.split(",") if r]
        return value
    received_at: datetime
