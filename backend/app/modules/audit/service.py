from __future__ import annotations

import json
import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditEvent
from app.shared.enums import AuditEventType

logger = structlog.get_logger(__name__)


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def record(
        self,
        event_type: AuditEventType,
        actor_id: uuid.UUID | None = None,
        kitchen_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        details: dict | None = None,
    ) -> None:
        """Append an audit event. Never raises — a logging failure must not break
        the primary operation."""
        try:
            event = AuditEvent(
                event_type=str(event_type),
                actor_id=actor_id,
                kitchen_id=kitchen_id,
                ip_address=ip_address,
                details=json.dumps(details) if details else None,
            )
            self._db.add(event)
            await self._db.flush()
            logger.info(
                "audit_event",
                event_type=str(event_type),
                actor_id=str(actor_id) if actor_id else None,
                kitchen_id=str(kitchen_id) if kitchen_id else None,
            )
        except Exception:
            logger.exception("audit_record_failed", event_type=str(event_type))
