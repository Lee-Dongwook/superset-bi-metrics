from __future__ import annotations

from typing import Protocol, TYPE_CHECKING

if TYPE_CHECKING:
    from core.extension.storage.ephemeral import EphemeralStateAccessor
    from core.extension.storage.persistent import PersistentStateAccessor
    from core.extension.types import CoreExtension

class ExtensionStorage(Protocol):
    @property
    def ephemeral(self) -> "EphemeralStateAccessor":
        ...
    
    @property
    def persistent(self) -> "PersistentStateAccessor":
        ...

class ExtensionContext(Protocol):
    @property
    def extension(self) -> "CoreExtension":
        ...
    
    @property
    def storage(self) -> ExtensionStorage:
        ...

def get_context() -> ExtensionContext:
    raise NotImplementedError(
        "get_context() must be called within an extension context. "
        "This function is replaced by the host during extension loading."
    )

