from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _engine_kwargs() -> dict:
    """Pool kwargs that only apply to real databases, not SQLite."""
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        return {}
    return {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    **_engine_kwargs(),
)

AsyncSessionFactory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all SQLAlchemy models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
