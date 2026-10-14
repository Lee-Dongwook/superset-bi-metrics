from __future__ import annotations

import logging
from datetime import datetime
from enum import IntEnum, StrEnum
from typing import Literal, TypeAlias, TypedDict

from flask import g
from sqlalchemy import Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.sql.type_api import Variant

logger = logging.getLogger(__name__)

class AdhocColumn(TypedDict, total=False):
    hasCustomLabel: bool | None
    label: str
    sqlExpression: str
    isColumnReference: bool | None
    columnType: Literal["BASE_AXIS", "SERIES"] | None
    timeGrain: str | None

FilterValue: TypeAlias = bool | datetime | float | int | str
FilterValues: TypeAlias = FilterValue | list[FilterValue] | tuple[FilterValue]
Column: TypeAlias = AdhocColumn | str

class GenericDataType(IntEnum):
    NUMERIC = 0
    STRING = 1
    TEMPORAL = 2
    BOOLEAN = 3
    MULTI_VALUE = 4
    JSON = 5
    MAP = 6
    ROW = 7

def MediumText() -> Variant:  # noqa: N802
    """Text column that maps to MEDIUMTEXT on MySQL (TEXT caps at 64KB there)."""
    return Text().with_variant(MEDIUMTEXT(), "mysql")


def get_user_id() -> int | None:
    """Current request user's id, or None outside a request / for anonymous users."""
    try:
        return g.user.id
    except Exception:  # no app/request context, or AnonymousUserMixin
        return None


class DatasourceType(StrEnum):
    TABLE = "table"
    DATASET = "dataset"
    QUERY = "query"
    SAVEDQUERY = "saved_query"
    VIEW = "view"
    SEMANTIC_VIEW = "semantic_view"

class FilterOperator(StrEnum):
    EQUALS = "=="
    NOT_EQUALS = "!="
    GREATER_THAN = ">"
    LESS_THAN = "<"
    GREATER_THAN_OR_EQUALS = ">="
    LESS_THAN_OR_EQUALS = "<="
    LIKE = "LIKE"
    NOT_LIKE = "NOT LIKE"
    ILIKE = "ILIKE"
    IS_NULL = "IS NULL"
    IS_NOT_NULL = "IS NOT NULL"
    IN = "IN"
    NOT_IN = "NOT IN"
    IS_TRUE = "IS TRUE"
    IS_FALSE = "IS FALSE"
    TEMPORAL_RANGE = "TEMPORAL_RANGE"

class FilterStringOperators(StrEnum):
    EQUALS = "EQUALS"
    NOT_EQUALS = "NOT_EQUALS"
    LESS_THAN = "LESS_THAN"
    GREATER_THAN = "GREATER_THAN"
    LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL"
    GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL"
    IN = "IN"
    NOT_IN = "NOT_IN"
    ILIKE = "ILIKE"
    LIKE = "LIKE"
    IS_NOT_NULL = "IS_NOT_NULL"
    IS_NULL = "IS_NULL"
    LIKE_START = "LIKE_START"
    LIKE_END = "LIKE_END"
    IS_TRUE = "IS_TRUE"
    IS_FALSE = "IS_FALSE"

class QueryObjectFilterClause(TypedDict, total=False):
    col: Column
    op: str
    val: FilterValues | None
    grain: str | None
    isExtra: bool | None
