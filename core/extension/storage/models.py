from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from core.common.models import CoreModel

if TYPE_CHECKING:
    from datetime import datetime

class ExtensionStorageEntry(CoreModel):
    __abstract__ = True

    id: int
    uuid: UUID
    extension_id: str
    user_fk: int | None
    resource_type: str | None
    resource_uuid: str | None
    key: str
    value: bytes
    value_size: int
    codec: str
    is_encrypted: bool
    created_on: "datetime | None"
    changed_on: "datetime | None"
    created_by_fk: int | None
    changed_by_fk: int | None

