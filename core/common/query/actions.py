"""Result-type dispatch for chart data, ported from superset/common/query_actions.py."""

from __future__ import annotations

import copy
import time
from typing import Any, Callable, TYPE_CHECKING

from flask_babel import gettext as _

from core.common.chart.data import ChartDataResultType
from core.common.chart.data_timing import (
    QueryAcquisitionTiming,
    QueryDataResult,
    QueryTiming,
)
from core.exceptions import QueryObjectValidationError
from core.query.types import QueryStatus
from core.utils.core import (
    extract_column_dtype,
    extract_dataframe_dtypes,
    ExtraFiltersReasonType,
    get_column_name,
    get_time_filter_status,
)

if TYPE_CHECKING:
    from core.common.query.context import QueryContext
    from core.common.query.object import QueryObject
    from core.explorables.base import Explorable


def _get_datasource(query_context: QueryContext, query_obj: QueryObject) -> Explorable:
    return query_obj.datasource or query_context.datasource


def _get_columns(
    query_context: QueryContext, query_obj: QueryObject, _: bool
) -> dict[str, Any]:
    datasource = _get_datasource(query_context, query_obj)
    return {
        "data": [
            {
                "column_name": col.column_name,
                "verbose_name": col.verbose_name,
                "dtype": extract_column_dtype(col),
            }
            for col in datasource.columns
        ]
    }


def _get_timegrains(
    query_context: QueryContext, query_obj: QueryObject, _: bool
) -> dict[str, Any]:
    datasource = _get_datasource(query_context, query_obj)
    grains = datasource.get_time_grains()
    return {"data": grains}


def _filter_status(
    datasource: Explorable,
    query_obj: QueryObject,
    applied_filter_columns: list[Any],
    rejected_filter_columns: list[Any],
) -> dict[str, Any]:
    """Describe which of the query's filters reached the generated query."""
    applied_time_columns, rejected_time_columns = get_time_filter_status(
        datasource, query_obj.applied_time_extras
    )
    return {
        "applied_filters": [
            {"column": get_column_name(col)} for col in applied_filter_columns
        ]
        + applied_time_columns,
        "rejected_filters": [
            {
                "reason": ExtraFiltersReasonType.COL_NOT_IN_DATASOURCE,
                "column": get_column_name(col),
            }
            for col in rejected_filter_columns
        ]
        + rejected_time_columns,
        "rejected_filter_columns": [
            get_column_name(col) for col in rejected_filter_columns
        ],
    }


def _get_query(
    query_context: QueryContext,
    query_obj: QueryObject,
    _: bool,
) -> dict[str, Any]:
    datasource = _get_datasource(query_context, query_obj)
    result = {"language": datasource.query_language}
    try:
        result["query"] = datasource.get_query_str(query_obj.to_dict())
    except QueryObjectValidationError as err:
        result["error"] = err.message
    return result


def _detect_currency(
    query_context: QueryContext,
    query_obj: QueryObject,  # noqa: ARG001
    datasource: Explorable,
    df: Any = None,
) -> str | None:
    """Detect the currency for AUTO currency formatting from the result dataframe.

    TODO(port): Superset also checks ``column_config`` (table charts) and falls back
    to a separate query when the currency column isn't in the result
    (superset/utils/currency.py).
    """
    form_data = query_context.form_data or {}
    currency_format = form_data.get("currency_format", {})
    if not (isinstance(currency_format, dict) and currency_format.get("symbol") == "AUTO"):
        return None

    currency_column = getattr(datasource, "currency_code_column", None)
    if not currency_column or df is None or currency_column not in df.columns:
        return None

    codes = df[currency_column].dropna().unique()
    return str(codes[0]).upper() if len(codes) == 1 else None


def _get_full_with_timing(
    query_context: QueryContext,
    query_obj: QueryObject,
    force_cached: bool | None = False,
) -> tuple[dict[str, Any], QueryAcquisitionTiming, int]:
    acquired = query_context.get_df_payload_result(query_obj, force_cached=force_cached)
    payload_assembly_start_ns = time.perf_counter_ns()
    payload = _materialize_full_payload(query_context, query_obj, acquired.payload)
    payload_assembly_ns = max(0, time.perf_counter_ns() - payload_assembly_start_ns)
    return payload, acquired.timing, payload_assembly_ns


def _materialize_full_payload(
    query_context: QueryContext,
    query_obj: QueryObject,
    payload: dict[str, Any],
) -> dict[str, Any]:
    datasource = _get_datasource(query_context, query_obj)
    result_type = query_obj.result_type or query_context.result_type
    df = payload["df"]
    status = payload["status"]
    if status != QueryStatus.FAILED:
        payload["colnames"] = list(df.columns)
        payload["indexnames"] = list(df.index)
        payload["coltypes"] = extract_dataframe_dtypes(df, datasource)
        payload["data"] = query_context.get_data(df, payload["coltypes"])
        payload["result_format"] = query_context.result_format
        payload["detected_currency"] = _detect_currency(
            query_context, query_obj, datasource, df
        )
    del payload["df"]

    applied_filter_columns = payload.get("applied_filter_columns", [])
    rejected_filter_columns = payload.get("rejected_filter_columns", [])
    del payload["applied_filter_columns"]
    del payload["rejected_filter_columns"]
    payload.update(
        _filter_status(
            datasource,
            query_obj,
            applied_filter_columns,
            rejected_filter_columns,
        )
    )

    if result_type == ChartDataResultType.RESULTS and status != QueryStatus.FAILED:
        return {
            "data": payload.get("data"),
            "colnames": payload.get("colnames"),
            "coltypes": payload.get("coltypes"),
            "rowcount": payload.get("rowcount"),
            "sql_rowcount": payload.get("sql_rowcount"),
            "detected_currency": payload.get("detected_currency"),
            "semantic_cache_status": payload.get("semantic_cache_status"),
        }
    return payload


def _datasource_column_names(datasource: Explorable) -> list[Any]:
    names: list[Any] = []
    for o in datasource.columns:
        if isinstance(o, dict):
            if column_name := o.get("column_name"):
                names.append(column_name)
        else:
            names.append(o.column_name)
    return names


def _prepare_samples_query(
    query_context: QueryContext,
    query_obj: QueryObject,
) -> QueryObject:
    datasource = _get_datasource(query_context, query_obj)
    query_obj = copy.copy(query_obj)
    query_obj.is_timeseries = False
    query_obj.orderby = []
    query_obj.metrics = None
    query_obj.post_processing = []
    query_obj.extras = {**(query_obj.extras or {}), "system_sampling": True}
    query_obj.columns = _datasource_column_names(datasource)
    query_obj.from_dttm = None
    query_obj.to_dttm = None
    return query_obj


def _prepare_drill_detail_query(
    query_context: QueryContext,
    query_obj: QueryObject,
) -> QueryObject:
    datasource = _get_datasource(query_context, query_obj)
    if not getattr(datasource, "supports_drill_to_detail", True):
        raise QueryObjectValidationError(
            _("Drill to detail is not available for this datasource type.")
        )
    query_obj = copy.copy(query_obj)
    query_obj.is_timeseries = False
    query_obj.metrics = None
    query_obj.post_processing = []
    query_obj.columns = _datasource_column_names(datasource)
    query_obj.orderby = [(query_obj.columns[0], True)]
    return query_obj


_metadata_result_type_functions: dict[
    ChartDataResultType, Callable[[QueryContext, QueryObject, bool], dict[str, Any]]
] = {
    ChartDataResultType.COLUMNS: _get_columns,
    ChartDataResultType.TIMEGRAINS: _get_timegrains,
    ChartDataResultType.QUERY: _get_query,
}


_data_result_type_preparers: dict[
    ChartDataResultType,
    Callable[[QueryContext, QueryObject], QueryObject] | None,
] = {
    ChartDataResultType.SAMPLES: _prepare_samples_query,
    ChartDataResultType.FULL: None,
    ChartDataResultType.RESULTS: None,
    ChartDataResultType.POST_PROCESSED: None,
    ChartDataResultType.DRILL_DETAIL: _prepare_drill_detail_query,
}


def _metadata_timing(total_ns: int) -> QueryTiming:
    return QueryTiming(
        query_planning_ns=None,
        cache_resolution_ns=None,
        data_acquisition_ns=None,
        payload_assembly_ns=None,
        total_ns=total_ns,
    )


def get_query_results(
    result_type: ChartDataResultType,
    query_context: QueryContext,
    query_obj: QueryObject,
    force_cached: bool,
) -> dict[str, Any]:
    """Payload-only view of :func:`get_query_results_with_timing`."""
    return get_query_results_with_timing(
        result_type,
        query_context,
        query_obj,
        force_cached,
    ).payload


def get_query_results_with_timing(
    result_type: ChartDataResultType,
    query_context: QueryContext,
    query_obj: QueryObject,
    force_cached: bool,
) -> QueryDataResult:
    """Return result payload and timing without storing timing in the payload.

    :raises QueryObjectValidationError: if an unsupported result type is requested
    """
    started_ns = time.perf_counter_ns()
    if result_func := _metadata_result_type_functions.get(result_type):
        payload = result_func(query_context, query_obj, force_cached)
        total_ns = max(0, time.perf_counter_ns() - started_ns)
        return QueryDataResult(payload=payload, timing=_metadata_timing(total_ns))

    if result_type not in _data_result_type_preparers:
        raise QueryObjectValidationError(
            _("Invalid result type: %(result_type)s", result_type=result_type)
        )

    if preparer := _data_result_type_preparers[result_type]:
        query_obj = preparer(query_context, query_obj)

    payload, acquisition_timing, action_assembly_ns = _get_full_with_timing(
        query_context,
        query_obj,
        force_cached,
    )
    total_ns = max(0, time.perf_counter_ns() - started_ns)
    return QueryDataResult(
        payload=payload,
        timing=QueryTiming(
            query_planning_ns=acquisition_timing.query_planning_ns,
            cache_resolution_ns=acquisition_timing.cache_resolution_ns,
            data_acquisition_ns=acquisition_timing.data_acquisition_ns,
            payload_assembly_ns=(
                acquisition_timing.payload_assembly_ns + action_assembly_ns
            ),
            total_ns=total_ns,
        ),
    )
