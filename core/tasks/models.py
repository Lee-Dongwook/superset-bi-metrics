from __future__ import annotations

from datetime import datetime
from typing import Any, TYPE_CHECKING
from uuid import UUID

from core.common.models import CoreModel

if TYPE_CHECKING:
    from core.tasks.types import TaskProperties


class Task(CoreModel):
    __abstract__ = True

    id: int
    uuid: UUID
    task_key: str
    task_type: str
    task_name: str | None
    scope: str
    status: str
    dedup_key: str
    created_on: datetime | None
    changed_on: datetime | None
    started_at: datetime | None
    ended_at: datetime | None
    created_by_fk: int | None
    user_id: int | None
    payload: str

    def get_payload(self) -> dict[str, Any]:
        raise NotImplementedError("Method will be replaced during initialization")

    def set_payload(self, data: dict[str, Any]) -> None:
        raise NotImplementedError("Method will be replaced during initialization")

    @property
    def properties(self) -> Any:
        raise NotImplementedError("Property will be replaced during initialization")

    @property
    def properties_dict(self) -> "TaskProperties":
        raise NotImplementedError("Property will be replaced during initialization")

    def update_properties(self, updates: "TaskProperties") -> None:
        raise NotImplementedError("Method will be replaced during initialization")
    
    def update_task_private(self, updates: dict[str, Any]) -> None:
        raise NotImplementedError("Method will be replaced during initialization")


class TaskSubscriber(CoreModel):
    __abstract__ = True

    id: int
    task_id: int
    user_id: int | None
    guest_key: str | None
    subscribed_at: datetime
    created_on: datetime | None
    changed_on: datetime | None
    created_by_fk: int | None
    changed_by_fk: int | None


class TaskDependency(CoreModel):
    __abstract__ = True
    
    id: int
    task_id: int
    depends_on_task_id: int
    created_on: datetime | None
    changed_on: datetime | None
    created_by_fk: int | None
    changed_by_fk: int | None
