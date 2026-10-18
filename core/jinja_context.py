from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache, partial
import ssl
from typing import Any, Callable, cast, TYPE_CHECKING, TypedDict, Union

from flask import current_app, g, has_request_context, request
from flask_babel import gettext as _
from jinja2 import DebugUndefined, Environment, TemplateSyntaxError, UndefinedError
from jinja2.exceptions import SecurityError
from jinja2.sandbox import SandboxedEnvironment
from sqlalchemy.engine.interfaces import Dialect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql.expression import bindparam
from sqlalchemy.types import String

from core.exceptions import TemplateException
from core.constants import LRU_CACHE_MAX_SIZE

if TYPE_CHECKING:
    from core.models.core import Database

class UndefinedTemplateFunctionException(TemplateException):
    pass

NONE_TYPE = type(None).__name__
ALLOWED_TYPES = (
    NONE_TYPE,
    "bool",
    "str",
    "unicode",
    "int",
    "long",
    "float",
    "list",
    "dict",
    "tuple",
    "set",
    "TimeFilter",
)
COLLECTION_TYPES = ("list", "dict", "tuple", "set")

JsonValue = Union[
    str, int, float, bool, list["JsonValue"], dict[str, "JsonValue"], None
]

@lru_cache(maxsize=LRU_CACHE_MAX_SIZE)
def context_addons() -> dict[str, Any]:
    return current_app.config.get("JINJA_CONTEXT_ADDONS", {})

class Filter(TypedDict, total=False):
    op: str
    col: str
    val: Union[None, Any, list[Any]]
    escaped_val: Union[None, Any, list[Any]]

@dataclass
class TimeFilter:
    from_expr: str | None
    to_expr: str | None
    time_range: str | None

class SQLSafeList(list[Any]):
    def __str__(self) -> str:
        return ", ".join(str(element) for element in self)
    
    __repr__ = __str__

class SQLSafeDict(dict[Any, Any]): 
    def __str__(self) -> str:
        return ", ".join(f"{key}: {value}" for key, value in self.items())

    __repr__ = __str__

def _normalize_postgresql_backslash_escapes(dialect: Dialect) -> None:
    if dialect.name == "postgresql":
        dialect._backslash_escapes = False

class ExtraCache:
    regex = re.compile(
        r"(\{\{|\{%)[^{}]*?("
        r"current_user_id\([^)]*\)|"
        r"current_username\([^)]*\)|"
        r"current_user_email\([^)]*\)|"
        r"current_user_rls_rules\([^)]*\)|"
        r"current_user_roles\([^)]*\)|"
        r"cache_key_wrapper\([^)]*\)|"
        r"url_param\([^)]*\)|"
        r"get_guest_user_attribute\([^)]*\)"
        r")"
        r"[^{}]*?(\}\}|\%\})"
    )

    def __init__(
        self,
         extra_cache_keys: list[Any] | None = None,
        applied_filters: list[str] | None = None,
        removed_filters: list[str] | None = None,
        database: Database | None = None,
        dialect: Dialect | None = None,
        table: SqlaTable | None = None,
        query_context_filters: list[Any] | None = None,
    ): 
        self.extra_cache_keys = extra_cache_keys
        self.applied_filters = applied_filters if applied_filters is not None else []
        self.removed_filters = removed_filters if removed_filters is not None else []
        self.database = database
        self.dialect = dialect
        self.table = table
        self.query_context_filters: list[Any] = query_context_filters or []
