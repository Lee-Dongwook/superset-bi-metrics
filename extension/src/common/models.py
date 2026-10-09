from __future__ import annotations

from datetime import datetime
from typing import Any, TYPE_CHECKING
from uuid import UUID

from flask_appbuilder import Model
from sqlalchemy.orm import scoped_session

# if TYPE_CHECKING:
#     from 

class CoreModel(Model):
    __abstract__ = True

class Database(CoreModel):
    __abstract__ = True

    id: int
    verbose_name: str
    database_name: str | None

    @property
    def name(self) -> str:
        raise NotImplementedError
    
    @property
    def backend(self) -> str:
        raise NotImplementedError
    
    @property
    def data(self) -> dict[str, Any]:
        raise NotImplementedError
    
    def execute(
        self,
        sql: str,
        options: "QueryOptions | None" = None,
    ) -> "QueryResult":
        raise NotImplementedError("Method will be replaced during initialization")

    def execute_async(
        self,
        sql: str,
        options: "QueryOptions | None" = None,
    ) -> "AsyncQueryHandle":
        raise NotImplementedError("Method will be replaced during initialization")
