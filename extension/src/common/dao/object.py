from abc import ABC, abstractmethod
from typing import Any, ClassVar, Generic, TypeVar

from flask_appbuilder.models.filters import BaseFilter
from sqlalchemy.orm import Query as SQLAQuery

T = TypeVar("T", bound=CoreModel)

class BaseDAO(Generic[T], ABC):
    model_cls: ClassVar[type[Any] | None]
    base_filter: ClassVar[BaseFilter | None]
    id_column_name: ClassVar[str]
    uuid_column_name: ClassVar[str]

    @classmethod
    @abstractmethod
    def find_all(cls) -> list[T]:
        ...

    @classmethod
    @abstractmethod
    def find_one_or_none(cls, **filter_by: Any) -> T | None:
        ...
    
    @classmethod
    @abstractmethod
    def create(
        cls,
        item: T | None = None,
        attributes: dict[str, Any] | None = None,
    ) -> T:
        ...
    
    @classmethod
    @abstractmethod
    def update(
        cls,
        item: T | None = None,
        attributes: dict[str, Any] | None = None,
    ) -> T:
        ...

    @classmethod
    @abstractmethod
    def delete(cls, items: list[T]) -> None:
        ...
    
    @classmethod
    @abstractmethod
    def query(cls, query: SQLAQuery) -> list[T]:
        ...
    
    @classmethod
    @abstractmethod
    def filter_by(cls, **filter_by: Any) -> list[T]:
        ...
