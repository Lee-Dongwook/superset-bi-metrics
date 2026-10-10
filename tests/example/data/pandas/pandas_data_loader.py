from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from pandas import DataFrame
from sqlalchemy import text
from sqlalchemy.inspection import inspect


@log
class PandasDataLoader(DataLoader):
    _db_engine: Engine
    _configurations: PandasLoaderConfigurations
    _table_to_df_convertor: TableToDfConvertor

    def __init__(
        self,
        db_engine: Engine,
        config: PandasLoaderConfigurations,
        table_to_df_convertor: TableToDfConvertor,
    ) -> None:
        self._db_engine = db_engine
        self._configurations = config
        self._table_to_df_convertor = table_to_df_convertor

    def load_table(self, table: Table) -> None:
        df = self._table_to_df_convertor.convert(table)
        df.to_sql(
            table.table_name,
            self._db_engine,
            if_exists=self._configurations.if_exists,
            chunksize=self._configurations.chunksize,
            index=self._configurations.index,
            dtype=self._take_data_types(table),
            method=self._configurations.method,
            schema=self._detect_schema_name(),
        )
    
    def _detect_schema_name(self) -> str | None:
        return inspect(self._db_engine).default_schema_name
    
    def _take_data_types(self, table: Table) -> dict[str, str] | None:
        if metadata_table := table.table_metadata:
            types = metadata_table.types
            if types:
                return types
        return None
    
    def remove_table(self, table_name: str) -> None:
        with self._db_engine.begin() as conn:
            conn.exectue(text(f"DROP TABLE IF EXISTS {table_name}"))

class TableToDfConvertor(ABC):
    @abstractmethod
    def convert(self, table: Table) -> DataFrame: ...
