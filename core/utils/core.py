from __future__ import annotations

import _thread
import collections
import errno
import logging
import os
import platform
import re
import signal
import smtplib
import sqlite3
import ssl
import tempfile
import threading
import traceback
import uuid
import warnings
import zlib
from collections.abc import Collection, Iterable, Iterator, Sequence
from contextlib import closing, contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate
from enum import Enum, IntEnum, StrEnum
from io import BytesIO
from timeit import default_timer
from types import TracebackType
from typing import (
    Any,
    Callable,
    Literal,
    cast,
    NamedTuple,
    Optional,
    TYPE_CHECKING,
    TypedDict,
    TypeVar,
    TypeAlias,
)
from urllib.parse import unquote_plus, urlparse
from zipfile import ZipFile, ZipInfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import markdown as md
import nh3
import pandas as pd
import sqlalchemy as sa
from cryptography.hazmat.backends import default_backend
from cryptography.x509 import Certificate, load_pem_x509_certificate
from flask import current_app as app, g, request, Response, send_file
from flask_appbuilder.security.sqla.models import User
from flask_babel import gettext as __
from flask_sqlalchemy import SQLAlchemy
from markupsafe import Markup
from pandas.api.types import infer_dtype
from pandas.core.dtypes.common import is_numeric_dtype
from sqlalchemy import event, exc, inspect, select, Text
from sqlalchemy.dialects.mysql import LONGTEXT, MEDIUMTEXT
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.sql.type_api import Variant
from sqlalchemy.types import TypeEngine
from typing_extensions import TypeGuard

logging.getLogger("MARKDOWN").setLevel(logging.INFO)
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
