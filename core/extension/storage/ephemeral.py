from dataclasses import dataclass
from typing import Any, ClassVar, Protocol

@dataclass(frozen=True)
class EphemeralSetOptions:
    ttl: int
    codec: str = "json"

class EphemeralStateAccessor(Protocol):
    def get(self, key: str) -> Any:
        ...

    def set(self, key: str, value: Any, options: EphemeralSetOptions) -> None:
        ...

    def remove(self, key: str) -> None:
        ...

class _UnconfiguredEphemeralStateAccessor:
    def get(self, key: str) -> Any:
        raise NotImplementedError("Class will be replaced during initialization")

    def set(self, key: str, value: Any, options: EphemeralSetOptions) -> None:
        raise NotImplementedError("Class will be replaced during initialization")

    def remove(self, key: str) -> None:
        raise NotImplementedError("Class will be replaced during initialization")
    

class EphemeralState:
    @staticmethod
    def get(key: str) -> Any:
        raise NotImplementedError("Class will be replaced during initialization")
    
    @staticmethod
    def set(key: str, value: Any, options: EphemeralSetOptions) -> None:
        raise NotImplementedError("Class will be replaced during initialization")
    
    @staticmethod
    def remove(key: str) -> None:
        raise NotImplementedError("Class will be replaced during initialization")
    
    shared: ClassVar[EphemeralStateAccessor] = _UnconfiguredEphemeralStateAccessor()

