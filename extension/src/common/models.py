from __future__ import annotations

from typing import Any

from flask_appbuilder import Model

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
