"""QueryObject → Cube.js query mapping; the Cube counterpart of
superset/semantic_layers/mapper.py.

Cube members are addressed by their full names (``Orders.count``,
``Orders.createdAt``), which double as the chart's metric/column labels.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, TYPE_CHECKING

import pandas as pd
from flask_babel import gettext as _

from core.exceptions import QueryObjectValidationError
from core.models.helpers import QueryResult
from core.query.types import QueryStatus
from core.utils import json
from core.utils.core import (
    FilterOperator,
    get_column_name,
    get_metric_name,
    is_adhoc_column,
    is_adhoc_metric,
    QueryObjectFilterClause,
)

if TYPE_CHECKING:
    from core.common.query.object import QueryObject
    from core.semantic.bridge import CubeQueryBridge

logger = logging.getLogger(__name__)

# ISO 8601 durations Superset sends as time grains → Cube granularities.
TIME_GRAIN_TO_CUBE_GRANULARITY: dict[str, str] = {
    "PT1S": "second",
    "PT1M": "minute",
    "PT1H": "hour",
    "P1D": "day",
    "P1W": "week",
    "P1M": "month",
    "P3M": "quarter",
    "P1Y": "year",
}

_SIMPLE_OPERATORS: dict[str, str] = {
    FilterOperator.EQUALS: "equals",
    FilterOperator.NOT_EQUALS: "notEquals",
    FilterOperator.IN: "equals",
    FilterOperator.NOT_IN: "notEquals",
    FilterOperator.GREATER_THAN: "gt",
    FilterOperator.GREATER_THAN_OR_EQUALS: "gte",
    FilterOperator.LESS_THAN: "lt",
    FilterOperator.LESS_THAN_OR_EQUALS: "lte",
}


def _cube_granularity(time_grain: str | None) -> str | None:
    if not time_grain:
        return None
    try:
        return TIME_GRAIN_TO_CUBE_GRANULARITY[time_grain]
    except KeyError as ex:
        raise QueryObjectValidationError(
            _("Time grain %(grain)s is not supported by Cube.", grain=time_grain)
        ) from ex


def _member(value: Any, kind: str) -> str:
    """Cube member name of a plain or column-reference column/metric."""
    if isinstance(value, str):
        return value
    if kind == "column" and is_adhoc_column(value) and value.get("sqlExpression"):
        return value["sqlExpression"]
    raise QueryObjectValidationError(
        _(
            "Semantic views only accept saved %(kind)ss, not ad-hoc expressions.",
            kind=kind,
        )
    )


def _values(val: Any) -> list[str]:
    values = val if isinstance(val, (list, tuple)) else [val]
    return [str(v).lower() if isinstance(v, bool) else str(v) for v in values]


def _like_filter(member: str, pattern: str, negate: bool) -> dict[str, Any]:
    starts, ends = pattern.startswith("%"), pattern.endswith("%")
    text = pattern.strip("%")
    if starts and ends:
        operator = "notContains" if negate else "contains"
    elif ends:
        operator = "startsWith"
    elif starts:
        operator = "endsWith"
    else:
        operator = "notEquals" if negate else "equals"
    if negate and operator in ("startsWith", "endsWith"):
        raise QueryObjectValidationError(
            _("NOT LIKE is only supported as a %%contains%% pattern for semantic views.")
        )
    return {"member": member, "operator": operator, "values": [text]}


def map_filter(filter_: QueryObjectFilterClause) -> dict[str, Any] | None:
    """One Superset filter clause → one Cube filter (``None`` for time ranges,
    which map onto ``timeDimensions`` instead)."""
    op = filter_["op"]
    if op == FilterOperator.TEMPORAL_RANGE:
        return None
    member = _member(filter_["col"], "column")
    val = filter_.get("val")
    if op in _SIMPLE_OPERATORS:
        return {"member": member, "operator": _SIMPLE_OPERATORS[op], "values": _values(val)}
    if op in (FilterOperator.LIKE, FilterOperator.ILIKE):
        return _like_filter(member, str(val), negate=False)
    if op == FilterOperator.NOT_LIKE:
        return _like_filter(member, str(val), negate=True)
    if op == FilterOperator.IS_NULL:
        return {"member": member, "operator": "notSet"}
    if op == FilterOperator.IS_NOT_NULL:
        return {"member": member, "operator": "set"}
    if op in (FilterOperator.IS_TRUE, FilterOperator.IS_FALSE):
        value = "true" if op == FilterOperator.IS_TRUE else "false"
        return {"member": member, "operator": "equals", "values": [value]}
    raise QueryObjectValidationError(
        _("Filter operator %(op)s is not supported by Cube.", op=op)
    )


def _date_range(from_dttm: datetime | None, to_dttm: datetime | None) -> list[str] | None:
    if from_dttm is None and to_dttm is None:
        return None
    start = from_dttm or datetime(1970, 1, 1)
    # Superset's upper bound is exclusive; Cube's dateRange end is inclusive.
    end = (to_dttm - timedelta(milliseconds=1)) if to_dttm else datetime(9999, 12, 31)
    return [start.isoformat(timespec="milliseconds"), end.isoformat(timespec="milliseconds")]


def map_query_object(query_object: QueryObject) -> tuple[dict[str, Any], dict[str, str]]:
    """Build the Cube query and the ``Cube result key → output label`` renames."""
    if query_object.series_limit:
        # TODO(port): Superset applies series limits with a subquery; Cube has no
        # equivalent, so it would need a second "top N" query.
        raise QueryObjectValidationError(_("Series limits are not supported by Cube."))

    default_grain = query_object.extras.get("time_grain_sqla")
    time_dimensions: dict[str, dict[str, Any]] = {}
    dimensions: list[str] = []
    renames: dict[str, str] = {}

    for column in query_object.columns:
        member = _member(column, "column")
        label = get_column_name(column)
        grain = column.get("timeGrain") if is_adhoc_column(column) else None
        is_base_axis = is_adhoc_column(column) and column.get("columnType") == "BASE_AXIS"
        granularity = _cube_granularity(grain or (default_grain if is_base_axis else None))
        if granularity:
            time_dimensions[member] = {"dimension": member, "granularity": granularity}
            renames[f"{member}.{granularity}"] = label
        else:
            dimensions.append(member)
            if label != member:
                renames[member] = label

    # The time range resolves to from/to bounds on the TEMPORAL_RANGE column (or
    # the legacy ``granularity`` column).
    date_range = _date_range(query_object.from_dttm, query_object.to_dttm)
    temporal_columns = [
        _member(f["col"], "column")
        for f in query_object.filter
        if f["op"] == FilterOperator.TEMPORAL_RANGE
    ]
    if query_object.granularity:
        temporal_columns.append(query_object.granularity)
    if date_range:
        for member in dict.fromkeys(temporal_columns):
            time_dimensions.setdefault(member, {"dimension": member})["dateRange"] = date_range

    query: dict[str, Any] = {
        "measures": [_member(metric, "metric") for metric in query_object.metrics or []],
        "dimensions": dimensions,
        "timeDimensions": list(time_dimensions.values()),
        "filters": [f for f in map(map_filter, query_object.filter) if f],
    }
    if query_object.orderby:
        order: dict[str, str] = {}
        for item, ascending in query_object.orderby:
            name = get_metric_name(item) if is_adhoc_metric(item) else str(item)
            order[name] = "asc" if ascending else "desc"
        query["order"] = order
    if query_object.row_limit:
        query["limit"] = query_object.row_limit
    if query_object.row_offset:
        query["offset"] = query_object.row_offset
    return query, renames


def _to_dataframe(
    rows: pd.DataFrame, query: dict[str, Any], renames: dict[str, str], metric_labels: list[str]
) -> pd.DataFrame:
    df = rows.rename(columns=renames)
    expected = [
        *(renames.get(f"{td['dimension']}.{td['granularity']}") for td in query["timeDimensions"] if "granularity" in td),
        *(renames.get(member, member) for member in query["dimensions"]),
        *metric_labels,
    ]
    # Cube also echoes the bare time dimension next to its grained key; keep only
    # the requested labels, in request order.
    df = df.reindex(columns=[label for label in expected if label])
    for label in metric_labels:
        df[label] = pd.to_numeric(df[label], errors="coerce")
    for td in query["timeDimensions"]:
        if "granularity" in td and (label := renames.get(f"{td['dimension']}.{td['granularity']}")):
            df[label] = pd.to_datetime(df[label])
    return df


def get_results(query_object: QueryObject, bridge: CubeQueryBridge, channel_id: str) -> QueryResult:
    """Run the query through Cube (progress streams to ``channel_id``)."""
    started = datetime.now()
    query, renames = map_query_object(query_object)
    query_str = json.dumps(query)

    result = bridge.execute_query(
        channel_id=channel_id,
        query_id=uuid.uuid4().hex,
        query=query,
    )
    duration = datetime.now() - started
    if result.status != QueryStatus.SUCCESS or not result.statements:
        return QueryResult(
            df=pd.DataFrame(),
            query=query_str,
            duration=duration,
            status=QueryStatus.FAILED,
            error_message=result.error_message or _("Cube query failed"),
            from_dttm=query_object.from_dttm,
            to_dttm=query_object.to_dttm,
        )

    rows = result.statements[0].data
    df = _to_dataframe(
        rows if rows is not None else pd.DataFrame(),
        query,
        renames,
        [get_metric_name(metric) for metric in query_object.metrics or []],
    )
    return QueryResult(
        df=df,
        query=query_str,
        duration=duration,
        applied_filter_columns=[f["col"] for f in query_object.filter],
        status=QueryStatus.SUCCESS,
        from_dttm=query_object.from_dttm,
        to_dttm=query_object.to_dttm,
    )
