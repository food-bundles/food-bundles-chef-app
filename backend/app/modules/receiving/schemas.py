from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.shared.enums import ReceivingDecision


class ReceivingLineRequest(BaseModel):
    order_line_id: uuid.UUID
    quantity_received: Decimal
    decision: ReceivingDecision = ReceivingDecision.ACCEPTED
    rejection_reason: str | None = None


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
    received_by: uuid.UUID | None
    received_at: datetime
