from __future__ import annotations

from typing import Callable, Generic, ParamSpec, TYPE_CHECKING, TypeVar

from core.tasks.types import TaskContext, TaskScope

if TYPE_CHECKING:
    from core.tasks.models import Task
    from core.tasks.subscription import TaskSubscriptionPolicy

P = ParamSpec("P")
R = TypeVar("R")

def task(
    name: str | None = None,
    scope: TaskScope = TaskScope.PRIVATE,
    timeout: int | None = None,
    subscription_policy: "TaskSubscriptionPolicy | None" = None, 
) -> Callable[[Callable[P,R]], "TaskWrapper[P]"]:
        raise NotImplementedError("Function will be replaced during initialization")

class TaskWrapper(Generic[P]):
    def __call__(self, *args: P.args, **kwargs: P.kwargs) -> "Task":
        raise NotImplementedError("Will be replaced during initialization")
    
    def schedule(self, *args:P.args, **kwargs: P.kwargs) -> "Task":
        raise NotImplementedError("Will be replaced during initialization")

def get_context() -> TaskContext:
    raise NotImplementedError("Function will be replaced during initialization")
