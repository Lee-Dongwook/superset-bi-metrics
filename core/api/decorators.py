from typing import Callable, TYPE_CHECKING, TypeVar

if TYPE_CHECKING:
    from core.api.api import Api

T = TypeVar("T", bound=type["Api"])

def api(
    id: str,
    name: str,
    description: str | None = None,
    resource_name: str | None = None,
) -> Callable[[T], T]:
    raise NotImplementedError(
        "API decorator not initialized. "
        "This decorator should be replaced during Superset startup."
    )
