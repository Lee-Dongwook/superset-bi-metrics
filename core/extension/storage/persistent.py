from dataclasses import dataclass, field
from typing import Any, ClassVar, Protocol


@dataclass(frozen=True)
class PersistentSetOptions:
    encrypt: bool = False
    codec: str = "json"

@dataclass(frozen=True)
class PersistentListOptions:
    page: int
    resource_type: str | None = None
    resource_uuid: str | None = None

@dataclass(frozen=True)
class PersistentListEntry:
    key: str
    value: Any
    codec: str

@dataclass(frozen=True)
class PersistentListResult:
    count: int = 0

class PersistentStateAccessor(Protocol):
    def get(self, key: str) -> Any:
        ...

    def set(
        self, key: str, value: Any, options: PersistentSetOptions | None = None
    ) -> None:
        ...

    def list(self, options: PersistentListOptions) -> PersistentListResult:
        ...

    def remove(self, key: str) -> None:
        ...

class _UnconfiguredPersistentStateAccessor:
    def get(self, key: str) -> Any:
        raise NotImplementedError("Class will be replaced during initialization")

    def set(
        self, key: str, value: Any, options: PersistentSetOptions | None = None
    ) -> None:
        raise NotImplementedError("Class will be replaced during initialization")

    def list(self, options: PersistentListOptions) -> PersistentListResult:
        raise NotImplementedError("Class will be replaced during initialization")

    def remove(self, key: str) -> None:
        raise NotImplementedError("Class will be replaced during initialization")


class PersistentState:
    @staticmethod
    def get(key: str) -> Any:
        raise NotImplementedError("Class will be replaced during initialization")

    @staticmethod
    def set(key: str, value: Any, options: PersistentSetOptions | None = None) -> None:
        raise NotImplementedError("Class will be replaced during initialization")

    @staticmethod
    def list(options: PersistentListOptions) -> PersistentListResult:
        raise NotImplementedError("Class will be replaced during initialization")

    @staticmethod
    def remove(key: str) -> None:
        raise NotImplementedError("Class will be replaced during initialization")
    
    shared: ClassVar[PersistentStateAccessor] = _UnconfiguredPersistentStateAccessor()
