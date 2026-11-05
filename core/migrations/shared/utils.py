import logging
import os
import time
from collections.abc import Iterator
from typing import Any, Callable, Optional, Union
from uuid import uuid4

from alembic import op
from sqlalchemy import (
    Column,
    inspect,
    JSON,
    MetaData,
    select,
    String,
    Table,
    text,
    update,
)
from sqlalchemy.dialects.mysql.base import MySQLDialect
from sqlalchemy.dialects.postgresql.base import PGDialect
from sqlalchemy.dialects.sqlite.base import SQLiteDialect 
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.exc import NoSuchTableError
from sqlalchemy.orm import Query, Session
from sqlalchemy.sql.schema import SchemaItem

from core.utils import json

GREEN = "\033[32m"
RESET = "\033[0m"
YELLOW = "\033[33m"
RED = "\033[31m"
LRED = "\033[91m"

logger = logging.getLogger("alembic.env")

DEFAULT_BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 1000))

def is_mysql() -> bool:
    return isinstance(op.get_bind().dialect, MySQLDialect)

def get_table_column(
    table_name: str,
    column_name: str,
) -> Optional[dict[str, Any]]:
    insp = inspect(op.get_context().bind)

    try:
        for col in insp.get_columns(table_name):
            if col["name"] == column_name:
                return col
    except NoSuchTableError:
        logger.warn("There's no such table")

    return None

def table_has_column(table_name: str, column_name: str) -> bool:
    return bool(get_table_column(table_name, column_name))


def table_has_index(table: str, index: str) -> bool:
    insp = inspect(op.get_context().bind)

    try:
        return any(idx["name"] == index for idx in insp.get_indexes(table))
    except NoSuchTableError:
        return False

uuid_by_dialect = {
    MySQLDialect: "UNHEX(REPLACE(CONVERT(UUID() using utf8mb4), '-', ''))",
    PGDialect: "uuid_in(md5(random()::text || clock_timestamp()::text)::cstring)",
}

def assign_uuids(
    model: Any, session: Session, batch_size: int = DEFAULT_BATCH_SIZE
) -> None:
    bind = op.get_bind()
    table_name = model.__tablename__
    count = session.query(model).count()

    if count == 0:
        return
    
    start_time = time.time()

    for dialect, sql in uuid_by_dialect.items():
        if isinstance(bind.dialect, dialect):
            op.execute(
                text(
                    f"UPDATE {dialect().identifier_preparer.quote(table_name)} SET uuid = {sql}"
                )
            )
            print(f"Assigned {count} uuids in {time.time() - start_time:.3f}s.\n")
            return

    for object in paginated_update(
        session.query(model),
        lambda current, total: print(
            f"uuid assigned to {current} out of {total}", end="\r"
        ),
        batch_size=batch_size,
    ):
        object.uuid = uuid4()
    
    print(f"Assigned {count} uuids in {time.time() - start_time:.3f}s.\n")

def paginated_update(
    query: Query,
    print_page_progress: Optional[Union[Callable[[int, int], None], bool]] = None,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> Iterator[Any]:
    total = query.count()
    processed = 0
    session: Session = inspect(query).session
    result = session.execute(query)

    if print_page_progress is None or print_page_progress is True:
        print_page_progress = lambda processed, total: print( 
            f"    {processed}/{total}", end="\r"
        )
    
    while True:
        rows = result.fetchmany(batch_size)

        if not rows:
            break
        
        for row in rows:
            yield row[0]
        
        session.commit()
        processed += len(rows)

        if print_page_progress:
            print_page_progress(processed, total)


def try_load_json(data: Optional[str]) -> dict[str, Any]:
    return data and json.loads(data) or {}
