from __future__ import annotations

from uuid import UUID

from core.common.models import CoreModel

class Query(CoreModel):
    __abstract__ = True

    id: int
    client_id: str | None
    database_id: int | None
    sql: str | None
    status: str | None
    user_id: int | None
    progress: int
    error_message: str | None


class SavedQuery(CoreModel):
    __abstract__ = True

    id: int
    uuid: UUID | None
    label: str | None
    sql: str | None
    database_id: int | None
    description: str | None
    user_id: int | None

