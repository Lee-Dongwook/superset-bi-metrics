from __future__ import annotations

import collections
import logging
import uuid
from collections.abc import Callable, Iterable, Sequence
from datetime import datetime
from enum import IntEnum, StrEnum
from typing import Any, Literal, TYPE_CHECKING, TypeAlias, TypedDict, TypeGuard, TypeVar

import markdown as md
import nh3
from flask import g
from flask_babel import gettext as __
from markupsafe import Markup
from sqlalchemy import Text
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from sqlalchemy.sql.type_api import Variant

if TYPE_CHECKING:
    from core.type_defs import AdhocMetric, AdhocMetricColumn, Metric

logging.getLogger("MARKDOWN").setLevel(logging.INFO)
logger = logging.getLogger(__name__)

DTTM_ALIAS = "__timestamp"

TIME_COMPARISON = "__"

JS_MAX_INTEGER = 9007199254740991  # Largest int Java Script can handle 2^53-1

InputType = TypeVar("InputType")

# Annotation source types whose ``value`` field references another Chart.
ANNOTATION_SOURCE_TYPES_WITH_CHART_REFERENCE: frozenset[str] = frozenset(
    {
        "table",
        "line",
    }
)


class AdhocMetricExpressionType(StrEnum):
    SIMPLE = "SIMPLE"
    SQL = "SQL"


class DatasourceDict(TypedDict):
    type: str  # todo(hugh): update this to be DatasourceType
    id: int | str

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


def error_msg_from_exception(ex: Exception) -> str:
    """Translate exception into a human readable error message."""
    msg = ""
    if hasattr(ex, "message"):
        if isinstance(ex.message, dict):
            msg = ex.message.get("message")  # type: ignore
        elif ex.message:
            msg = ex.message
    return str(msg) or str(ex)


def markdown(raw: str, markup_wrap: bool | None = False) -> str:
    """Render Markdown to sanitized HTML."""
    safe_markdown_tags = {
        "h1", "h2", "h3", "h4", "h5", "h6",
        "b", "i", "strong", "em", "tt", "p", "br", "span", "div",
        "blockquote", "code", "hr", "ul", "ol", "li", "dd", "dt", "img", "a",
    }
    safe_markdown_attrs = {
        "img": {"src", "alt", "title"},
        "a": {"href", "alt", "title", "target"},
    }
    safe = md.markdown(
        raw or "",
        extensions=[
            "markdown.extensions.tables",
            "markdown.extensions.fenced_code",
            "markdown.extensions.codehilite",
        ],
    )
    # nh3 preserves supported link attributes and enforces a safe rel value.
    safe = nh3.clean(safe, tags=safe_markdown_tags, attributes=safe_markdown_attrs)
    if markup_wrap:
        safe = Markup(safe)
    return safe


def is_adhoc_metric(metric: Metric) -> TypeGuard[AdhocMetric]:
    return isinstance(metric, dict) and "expressionType" in metric


def is_adhoc_column(column: Column) -> TypeGuard[AdhocColumn]:
    return isinstance(column, dict) and ({"label", "sqlExpression"}).issubset(
        column.keys()
    )


def is_base_axis(column: Column) -> bool:
    return is_adhoc_column(column) and column.get("columnType") == "BASE_AXIS"


def get_base_axis_columns(columns: list[Column] | None) -> list[Column]:
    return [column for column in columns or [] if is_base_axis(column)]


def get_non_base_axis_columns(columns: list[Column] | None) -> list[Column]:
    return [column for column in columns or [] if not is_base_axis(column)]


def get_base_axis_labels(columns: list[Column] | None) -> tuple[str, ...]:
    return tuple(get_column_name(column) for column in get_base_axis_columns(columns))


def get_x_axis_label(columns: list[Column] | None) -> str | None:
    labels = get_base_axis_labels(columns)
    return labels[0] if labels else None


def get_column_name(column: Column, verbose_map: dict[str, Any] | None = None) -> str:
    """
    Extract label from column.

    :raises ValueError: if column object is invalid
    """
    if hasattr(column, "column_name"):
        column_name = getattr(column, "column_name", "")
        verbose_name = getattr(column, "verbose_name", "")
        return verbose_name or column_name

    if isinstance(column, dict):
        if label := column.get("label"):
            return label
        if expr := column.get("sqlExpression"):
            return expr

    if isinstance(column, str):
        verbose_map = verbose_map or {}
        return verbose_map.get(column, column)

    raise ValueError("Missing label")


def get_metric_name(metric: Metric, verbose_map: dict[str, Any] | None = None) -> str:
    """
    Extract label from metric.

    :raises ValueError: if metric object is invalid
    """
    if is_adhoc_metric(metric):
        if label := metric.get("label"):
            return label
        if (expression_type := metric.get("expressionType")) == "SQL":
            if sql_expression := metric.get("sqlExpression"):
                return sql_expression
        if expression_type == "SIMPLE":
            column: AdhocMetricColumn = metric.get("column") or {}
            column_name = column.get("column_name")
            aggregate = metric.get("aggregate")
            if column and aggregate:
                return f"{aggregate}({column_name})"
            if column_name:
                return column_name

    if isinstance(metric, str):
        verbose_map = verbose_map or {}
        return verbose_map.get(metric, metric)

    raise ValueError(__("Invalid metric object: %(metric)s", metric=str(metric)))


def get_column_names(
    columns: Sequence[Column] | None,
    verbose_map: dict[str, Any] | None = None,
) -> list[str]:
    return [
        column
        for column in [get_column_name(column, verbose_map) for column in columns or []]
        if column
    ]


def get_metric_names(
    metrics: Sequence[Metric] | None,
    verbose_map: dict[str, Any] | None = None,
) -> list[str]:
    return [
        metric
        for metric in [get_metric_name(metric, verbose_map) for metric in metrics or []]
        if metric
    ]


def get_first_metric_name(
    metrics: Sequence[Metric] | None,
    verbose_map: dict[str, Any] | None = None,
) -> str | None:
    metric_labels = get_metric_names(metrics, verbose_map)
    return metric_labels[0] if metric_labels else None


def get_form_data_token(form_data: dict[str, Any]) -> str:
    """Return the token contained within form data or generate a new one."""
    return form_data.get("token") or "token_" + uuid.uuid4().hex[:8]


def get_column_name_from_column(column: Column) -> str | None:
    """Physical column name, or None for an adhoc column."""
    if is_adhoc_column(column):
        return None
    return column  # type: ignore


def get_column_names_from_columns(columns: list[Column]) -> list[str]:
    """Physical column names referenced by columns; adhoc columns are ignored."""
    return [col for col in map(get_column_name_from_column, columns) if col]


def get_column_name_from_metric(metric: Metric) -> str | None:
    """Column a SIMPLE adhoc metric references, otherwise None."""
    if is_adhoc_metric(metric):
        if metric["expressionType"] == AdhocMetricExpressionType.SIMPLE:
            column = metric["column"]
            if column:
                return column["column_name"]
    return None


def get_column_names_from_metrics(metrics: list[Metric]) -> list[str]:
    """Columns referenced by SIMPLE adhoc metrics; SQL metrics are excluded."""
    return [col for col in map(get_column_name_from_metric, metrics) if col]


def format_list(items: Sequence[str], sep: str = ", ", quote: str = '"') -> str:
    quote_escaped = "\\" + quote
    return sep.join(f"{quote}{x.replace(quote, quote_escaped)}{quote}" for x in items)


def find_duplicates(items: Iterable[InputType]) -> list[InputType]:
    """Find duplicate items in an iterable."""
    return [item for item, count in collections.Counter(items).items() if count > 1]


def remove_duplicates(
    items: Iterable[InputType], key: Callable[[InputType], Any] | None = None
) -> list[InputType]:
    """Remove duplicate items in an iterable."""
    if not key:
        return list(dict.fromkeys(items).keys())
    seen = set()
    result = []
    for item in items:
        item_key = key(item)
        if item_key not in seen:
            seen.add(item_key)
            result.append(item)
    return result


def apply_max_row_limit(
    limit: int,
    server_pagination: bool | None = None,
) -> int:
    """
    Override row limit based on server pagination setting

    >>> apply_max_row_limit(600000, server_pagination=True)  # Server pagination
    500000
    >>> apply_max_row_limit(5000)  # No server_pagination specified
    5000
    >>> apply_max_row_limit(0)  # Zero returns default max limit
    100000
    """
    from flask import current_app as app  # pylint: disable=import-outside-toplevel

    max_limit = (
        app.config["TABLE_VIZ_MAX_ROW_SERVER"]
        if server_pagination
        else app.config["SQL_MAX_ROW"]
    )
    if limit != 0:
        return min(max_limit, limit)
    return max_limit


class ExtraFiltersTimeColumnType(StrEnum):
    TIME_COL = "__time_col"
    TIME_GRAIN = "__time_grain"
    TIME_ORIGIN = "__time_origin"
    TIME_RANGE = "__time_range"


class ExtraFiltersReasonType(StrEnum):
    NO_TEMPORAL_COLUMN = "no_temporal_column"
    COL_NOT_IN_DATASOURCE = "not_in_datasource"


def extract_dataframe_dtypes(
    df: Any,
    datasource: Any | None = None,
) -> list[GenericDataType]:
    """Serialize pandas/numpy dtypes to generic types"""
    from pandas.api.types import infer_dtype  # pylint: disable=import-outside-toplevel

    inferred_type_map: dict[str, GenericDataType] = {
        "floating": GenericDataType.NUMERIC,
        "integer": GenericDataType.NUMERIC,
        "mixed-integer-float": GenericDataType.NUMERIC,
        "decimal": GenericDataType.NUMERIC,
        "boolean": GenericDataType.BOOLEAN,
        "datetime64": GenericDataType.TEMPORAL,
        "datetime": GenericDataType.TEMPORAL,
        "date": GenericDataType.TEMPORAL,
    }

    columns_by_name: dict[str, Any] = {}
    if datasource:
        for column in datasource.columns:
            if isinstance(column, dict):
                if column_name := column.get("column_name"):
                    columns_by_name[column_name] = column
            else:
                columns_by_name[column.column_name] = column

    generic_types: list[GenericDataType] = []
    for i, column in enumerate(df.columns):
        column_object = columns_by_name.get(str(column))
        series = df.iloc[:, i]
        # TODO(port): Superset maps all-null columns through the datasource's SQL
        # column types (map_sql_type_to_inferred_type); SQL datasources aren't ported.
        inferred_type: str = "" if series.isna().all() else infer_dtype(series)
        is_dttm = (
            column_object.get("is_dttm")
            if isinstance(column_object, dict)
            else column_object is not None and column_object.is_dttm
        )
        generic_types.append(
            GenericDataType.TEMPORAL
            if is_dttm
            else inferred_type_map.get(inferred_type, GenericDataType.STRING)
        )

    return generic_types


def extract_column_dtype(col: Any) -> GenericDataType:
    if hasattr(col, "is_temporal") and col.is_temporal:
        return GenericDataType.TEMPORAL
    if col.is_dttm:
        return GenericDataType.TEMPORAL

    if hasattr(col, "is_numeric") and col.is_numeric:
        return GenericDataType.NUMERIC

    return GenericDataType.STRING


def get_time_filter_status(
    datasource: Any,
    applied_time_extras: dict[str, str],
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    temporal_columns: set[Any] = {
        col.column_name for col in datasource.columns if col.is_dttm
    }
    applied: list[dict[str, str]] = []
    rejected: list[dict[str, str]] = []
    if time_column := applied_time_extras.get(ExtraFiltersTimeColumnType.TIME_COL):
        if time_column in temporal_columns:
            applied.append({"column": ExtraFiltersTimeColumnType.TIME_COL})
        else:
            rejected.append(
                {
                    "reason": ExtraFiltersReasonType.COL_NOT_IN_DATASOURCE,
                    "column": ExtraFiltersTimeColumnType.TIME_COL,
                }
            )

    if ExtraFiltersTimeColumnType.TIME_GRAIN in applied_time_extras:
        if temporal_columns:
            applied.append({"column": ExtraFiltersTimeColumnType.TIME_GRAIN})
        else:
            rejected.append(
                {
                    "reason": ExtraFiltersReasonType.NO_TEMPORAL_COLUMN,
                    "column": ExtraFiltersTimeColumnType.TIME_GRAIN,
                }
            )

    if applied_time_extras.get(ExtraFiltersTimeColumnType.TIME_RANGE):
        if temporal_columns:
            applied.append({"column": ExtraFiltersTimeColumnType.TIME_RANGE})
        else:
            rejected.append(
                {
                    "reason": ExtraFiltersReasonType.NO_TEMPORAL_COLUMN,
                    "column": ExtraFiltersTimeColumnType.TIME_RANGE,
                }
            )

    return applied, rejected


def get_stacktrace() -> str | None:
    import traceback  # pylint: disable=import-outside-toplevel

    from flask import current_app  # pylint: disable=import-outside-toplevel

    if current_app.config.get("SHOW_STACKTRACE"):
        return traceback.format_exc()
    return None
