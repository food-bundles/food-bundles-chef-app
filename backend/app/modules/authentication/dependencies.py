from __future__ import annotations

import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.core.security import TOKEN_TYPE_ACCESS, decode_token
from app.modules.chefs.models import Chef

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_chef(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Chef:
    if credentials is None:
        raise UnauthorizedError("Missing Bearer token.")

    payload = decode_token(credentials.credentials, expected_type=TOKEN_TYPE_ACCESS)

    try:
        chef_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise UnauthorizedError("Invalid token subject.") from exc

    result = await db.execute(select(Chef).where(Chef.id == chef_id, Chef.is_active == True))
    chef = result.scalar_one_or_none()
    if chef is None:
        raise UnauthorizedError("Chef account not found or deactivated.")

    return chef
