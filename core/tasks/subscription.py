from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.tasks.models import Task

class TaskSubscriptionPolicy(ABC):

    @abstractmethod
    def on_subscribe(
        self,
        task: "Task",
        *,
        principal: str,
        client_ref: str | None,
    ) -> None:
        ...
    
    @abstractmethod
    def on_unsubscribe(
        self,
        task: "Task",
        *,
        principal: str,
        client_ref: str | None,
    ) -> bool:
        ...
    
    def routing_channels(self, task: "Task") -> list[str] | None:
        return None
