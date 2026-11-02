from __future__ import annotations

import uuid
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


def _new_request_id() -> str:
    return str(uuid.uuid4())


class Meta(BaseModel):
    request_id: str = Field(default_factory=_new_request_id)


class DataResponse(BaseModel, Generic[T]):
    data: T
    meta: Meta = Field(default_factory=Meta)


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any = None
    request_id: str = Field(default_factory=_new_request_id)


class ErrorResponse(BaseModel):
    error: ErrorDetail
