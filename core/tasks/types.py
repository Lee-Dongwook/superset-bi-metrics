from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Literal, TYPE_CHECKING, TypedDict, Union
from uuid import UUID

if TYPE_CHECKING:
    from core.tasks.models import Task

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILURE = "failure"
    ABORTING = "aborting"
    ABORTED = "aborted"
    TIMED_OUT = "timed_out"

class TaskScope(str, Enum):
    PRIVATE = "private"
    SHARED = "shared"
    SYSTEM = "system"


class TaskProperties(TypedDict, total=False):
    execution_mode: Literal["async", "sync"]
    timeout: int
    is_abortable: bool
    progress_percent: float
    progress_current: int
    progress_total: int
    dedupe_count: int
    error_message: str
    private: "PrivateProperties"

class FrameworkPrivateProperties(TypedDict, total=False):
    celery_task_id: str
    exception_type: str
    stack_trace: str

class PrivateProperties(TypedDict, total=False):
    framework: "FrameworkPrivateProperties"
    task: dict[str, Any]
    subscription: dict[str, Any]

@dataclass(frozen=True)
class TaskOptions:
    task_key: str | None = None
    task_name: str | None = None
    timeout: int | None = None 
    depends_on: list[Union["Task", UUID, str]] | None = None

class TaskContext(ABC):
    @abstractmethod
    def update_task(
        self,
        progress: float | int | tuple[int, int] | None = None,
        payload: dict[str, Any] | None = None,
        *,
        immediate: bool = False,
    ) -> None:
        ...
    
    @abstractmethod
    def get_dependency_payloads(self) -> list[dict[str, Any]]:
        ...
    
    @abstractmethod
    def on_cleanup(self, handler: Callable[[], None]) -> Callable[[], None]:
        ...
    
    @abstractmethod
    def on_abort(self, handler: Callable[[], None]) -> Callable[[], None]:
        ...
