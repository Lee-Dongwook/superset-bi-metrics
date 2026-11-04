"""QueryContextProcessor, ported from superset/common/query_context_processor.py.

Out of scope and not ported (see TODO(port) notes): annotation layers, the
GROUPING SETS fallback, CSV/XLSX/Arrow result formats and RLS cache keys.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Any, cast, ClassVar, Sequence, TYPE_CHECKING

import pandas as pd
from flask import current_app
from flask_babel import gettext as _
from pandas.api.types import infer_dtype

from core.common.chart.data import ChartDataResultFormat
from core.common.chart.data_timing import (
    QueryAcquisitionResult,
    QueryAcquisitionTiming,
    QueryContextExecutionResult,
)
from core.common.query.actions import get_query_results_with_timing
from core.common.utils.query_cache_manager import QueryCacheManager
from core.constants import CACHE_DISABLED_TIMEOUT, CacheRegion
from core.dataframe import df_to_records
from core.exceptions import QueryObjectValidationError, QueryObjectValidationMessage
from core.extension import data_cache
from core.query.types import QueryStatus
from core.type_defs import AdhocColumn, AdhocMetric
from core.utils.cache import generate_cache_key, set_and_log_cache
from core.utils.core import (
    DTTM_ALIAS,
    GenericDataType,
    get_column_names_from_columns,
    get_column_names_from_metrics,
    is_adhoc_column,
    is_adhoc_metric,
)

if TYPE_CHECKING:
    from core.common.query.context import QueryContext
    from core.common.query.object import QueryObject
    from core.explorables.base import Explorable
    from core.models.helpers import QueryResult

logger = logging.getLogger(__name__)

# superset/utils/pandas_postprocessing/utils.py
FLAT_COLUMN_SEPARATOR = ", "


def unescape_separator(escaped_str: str, sep: str = FLAT_COLUMN_SEPARATOR) -> str:
    char = sep.strip()
    return escaped_str.replace("\\" + char, char)


def normalize_contribution_totals(
    queries: list[QueryObject],
    cache_values: dict[str, Any],
) -> tuple[list[int], int | None]:
    """Identify contribution queries and normalize the totals query in place.

    Returns the indices of queries whose contribution post-processing needs a
    shared totals row, and the index of the totals query itself (or ``None``).
    The totals query's ``row_limit`` is cleared on both the ``QueryObject`` and
    the matching ``cache_values`` entry so cache keys align with cached results.
    """
    queries_needing_totals: list[int] = []
    totals_idx: int | None = None

    for index, query in enumerate(queries):
        if any(
            pp.get("operation") == "contribution"
            for pp in getattr(query, "post_processing", None) or []
        ):
            queries_needing_totals.append(index)

        if (
            totals_idx is None
            and not query.columns
            and query.metrics
            and not query.post_processing
        ):
            totals_idx = index

    if queries_needing_totals and totals_idx is not None:
        queries[totals_idx].row_limit = None
        raw_queries = cache_values.get("queries", [])
        if totals_idx < len(raw_queries) and isinstance(raw_queries[totals_idx], dict):
            raw_queries[totals_idx]["row_limit"] = None

    return queries_needing_totals, totals_idx


def is_summable(series: pd.Series) -> bool:
    """Whether contribution totals can be summed over this column (incl. Decimal)."""
    if series.dtype.kind in "biufc":
        return True
    return infer_dtype(series, skipna=True) == "decimal"


class QueryContextProcessor:
    """
    The query context contains the query object and additional fields necessary
    to retrieve the data payload for a given viz.
    """

    _query_context: QueryContext
    _qc_datasource: Explorable

    def __init__(self, query_context: QueryContext):
        self._query_context = query_context
        self._qc_datasource = query_context.datasource

    cache_type: ClassVar[str] = "df"
    enforce_numerical_metrics: ClassVar[bool] = True

    def get_df_payload(
        self, query_obj: QueryObject, force_cached: bool | None = False
    ) -> dict[str, Any]:
        """Return the historical dataframe payload without timing metadata."""
        return self.get_df_payload_result(query_obj, force_cached).payload

    @staticmethod
    def _force_marker_key(nonce: str, cache_key: str) -> str:
        """Cache key for the per-(nonce, cache_key) forced-refresh marker."""
        return f"gtf-force-nonce:{nonce}:{cache_key}"

    def _force_nonce(self, query_obj: QueryObject) -> str | None:
        return (
            getattr(query_obj, "force_nonce", None) or self._query_context.force_nonce
        )

    def _resolve_forced_query(
        self, query_obj: QueryObject, cache_key: str | None
    ) -> bool:
        """Resolve ``QueryContext.force`` through an optional idempotency nonce.

        An async forced refresh is issued twice (submit, then read-back). With a
        nonce, the first execution leaves a marker once its result is cached and
        the read-back serves the cache instead of recomputing.

        :returns: whether the source query should be forced (cache bypassed)
        """
        if not self._query_context.force:
            return False
        nonce = self._force_nonce(query_obj)
        if not nonce or not cache_key:
            return True
        try:
            marker = data_cache.get(self._force_marker_key(nonce, cache_key))
        except Exception:  # noqa: BLE001  pylint: disable=broad-except
            logger.warning("Force-nonce marker read failed; forcing recompute")
            return True
        return marker is None

    def _mark_force_executed(
        self, query_obj: QueryObject, cache_key: str | None, persisted: bool
    ) -> None:
        """Record that this ``force_nonce``'s recompute has been cached (best-effort)."""
        nonce = self._force_nonce(query_obj)
        if not (persisted and self._query_context.force and nonce and cache_key):
            return
        try:
            if (
                data_cache.set(
                    self._force_marker_key(nonce, cache_key),
                    1,
                    timeout=self.get_cache_timeout(),
                )
                is False
            ):
                logger.warning(
                    "Force-nonce marker write reported failure; may recompute once more"
                )
        except Exception:  # noqa: BLE001  pylint: disable=broad-except
            logger.warning("Force-nonce marker write failed; may recompute once more")

    def get_df_payload_result(  # noqa: C901
        self, query_obj: QueryObject, force_cached: bool | None = False
    ) -> QueryAcquisitionResult:
        """Acquire a dataframe and return timing as a typed sidecar."""
        query_planning_start_ns = time.perf_counter_ns()
        if query_obj:
            query_obj.validate()

        cache_key = self.query_cache_key(query_obj)
        timeout = self.get_cache_timeout()
        force_query = (
            self._resolve_forced_query(query_obj, cache_key)
            or timeout == CACHE_DISABLED_TIMEOUT
        )
        if query_obj:
            query_obj.force_query = force_query
            query_obj.cache_timeout = timeout
        query_planning_ns = max(0, time.perf_counter_ns() - query_planning_start_ns)

        cache_resolution_start_ns = time.perf_counter_ns()
        cache = QueryCacheManager.get(
            key=cache_key,
            region=CacheRegion.DATA,
            force_query=force_query,
            force_cached=force_cached,
        )

        # A cached result without filter bookkeeping predates it; re-run so the
        # applied/rejected filter status is reported.
        if (
            query_obj
            and cache_key
            and cache.is_loaded
            and not cache.applied_filter_columns
            and not cache.rejected_filter_columns
            and query_obj.filter
            and len(query_obj.filter) > 0
        ):
            cache.is_loaded = False

        cache_resolution_ns = max(0, time.perf_counter_ns() - cache_resolution_start_ns)

        data_acquisition_ns: int | None = None
        if query_obj and cache_key and not cache.is_loaded:
            data_acquisition_start_ns = time.perf_counter_ns()
            try:
                if invalid_columns := [
                    col
                    for col in get_column_names_from_columns(query_obj.columns)
                    + get_column_names_from_metrics(query_obj.metrics or [])
                    if (
                        col not in self._qc_datasource.column_names
                        and col != DTTM_ALIAS
                    )
                ]:
                    raise QueryObjectValidationError(
                        _(
                            "Columns missing in dataset: %(invalid_columns)s",
                            invalid_columns=invalid_columns,
                        )
                    )

                query_result = self.get_query_result(query_obj)
                annotation_data = self.get_annotation_data(query_obj)
            except QueryObjectValidationError as ex:
                cache.error_message = QueryObjectValidationMessage(ex)
                cache.status = QueryStatus.FAILED
            finally:
                data_acquisition_ns = max(
                    0, time.perf_counter_ns() - data_acquisition_start_ns
                )

            if cache.status != QueryStatus.FAILED:
                cache.set_query_result(
                    key=cache_key,
                    query_result=query_result,
                    annotation_data=annotation_data,
                    force_query=force_query,
                    timeout=self.get_cache_timeout(),
                    datasource_uid=self._qc_datasource.uid,
                    region=CacheRegion.DATA,
                )
                self._mark_force_executed(
                    query_obj, cache_key, getattr(cache, "result_persisted", False)
                )

        payload_assembly_start_ns = time.perf_counter_ns()
        # the N-dimensional DataFrame has converted into flat DataFrame
        # by `flatten operator`, "comma" in the column is escaped by `escape_separator`
        # the result DataFrame columns should be unescaped
        label_map = {
            unescape_separator(col): [
                unescape_separator(col) for col in re.split(r"(?<!\\),\s", col)
            ]
            for col in cache.df.columns.values
        }
        label_map.update(
            {
                column_name: [
                    (
                        str(query_obj.columns[idx])
                        if not is_adhoc_column(query_obj.columns[idx])
                        else cast(AdhocColumn, query_obj.columns[idx])["sqlExpression"]
                    ),
                ]
                for idx, column_name in enumerate(query_obj.column_names)
            }
        )
        label_map.update(
            {
                metric_name: [
                    (
                        str(query_obj.metrics[idx])
                        if not is_adhoc_metric(query_obj.metrics[idx])
                        else (
                            str(
                                cast(AdhocMetric, query_obj.metrics[idx])[
                                    "sqlExpression"
                                ]
                            )
                            if cast(AdhocMetric, query_obj.metrics[idx])[
                                "expressionType"
                            ]
                            == "SQL"
                            else metric_name
                        )
                    ),
                ]
                for idx, metric_name in enumerate(query_obj.metric_names)
                if query_obj and query_obj.metrics
            }
        )
        cache.df.columns = [unescape_separator(col) for col in cache.df.columns.values]

        payload = {
            "cache_key": cache_key,
            "cached_dttm": cache.cache_dttm,
            "queried_dttm": cache.queried_dttm,
            "cache_timeout": self.get_cache_timeout(),
            "df": cache.df,
            "applied_template_filters": cache.applied_template_filters,
            "applied_filter_columns": cache.applied_filter_columns,
            "rejected_filter_columns": cache.rejected_filter_columns,
            "annotation_data": cache.annotation_data,
            "error": cache.error_message,
            "is_cached": cache.is_cached,
            "semantic_cache_status": getattr(cache, "semantic_cache_status", None),
            "query": cache.query,
            "status": cache.status,
            "stacktrace": cache.stacktrace,
            "rowcount": len(cache.df.index),
            "sql_rowcount": cache.sql_rowcount,
            "from_dttm": query_obj.from_dttm,
            "to_dttm": query_obj.to_dttm,
            "label_map": label_map,
            # TODO(port): BigQuery memory-limit truncation warning (SQL only).
            "warning": None,
        }
        timing = QueryAcquisitionTiming(
            query_planning_ns=query_planning_ns,
            cache_resolution_ns=cache_resolution_ns,
            data_acquisition_ns=data_acquisition_ns,
            payload_assembly_ns=max(
                0, time.perf_counter_ns() - payload_assembly_start_ns
            ),
        )
        return QueryAcquisitionResult(payload=payload, timing=timing)

    def query_cache_key(self, query_obj: QueryObject, **kwargs: Any) -> str | None:
        """
        Returns a QueryObject cache key for objects in self.queries
        """
        datasource: Explorable = self._qc_datasource
        # TODO(port): Superset adds the user's RLS filters here
        # (security_manager.get_rls_cache_key); semantic views don't support RLS.
        rls: list[str] = []
        extra_cache_keys = datasource.get_extra_cache_keys(query_obj.to_dict())

        cache_key = (
            query_obj.cache_key(
                datasource=datasource.uid,
                extra_cache_keys=extra_cache_keys,
                rls=rls,
                changed_on=datasource.changed_on,
                **kwargs,
            )
            if query_obj
            else None
        )
        return cache_key

    def get_query_result(self, query_object: QueryObject) -> QueryResult:
        """Return a dataframe for the query object via the datasource."""
        if query_object.grouping_sets:
            # TODO(port): Superset emulates GROUPING SETS with one query per level
            # on engines without native support (_grouping_sets_fallback).
            raise QueryObjectValidationError(
                _("Grouping sets are not supported for this datasource.")
            )
        return self._qc_datasource.get_query_result(query_object)

    def get_data(
        self, df: pd.DataFrame, coltypes: list[GenericDataType]
    ) -> str | bytes | list[dict[str, Any]]:
        if self._query_context.result_format != ChartDataResultFormat.JSON:
            # TODO(port): CSV/XLSX (superset/utils/csv.py, excel.py) and Arrow IPC
            # (needs pyarrow) result formats.
            raise QueryObjectValidationError(
                _(
                    "Result format %(result_format)s is not supported yet.",
                    result_format=self._query_context.result_format,
                )
            )
        return df_to_records(df)

    def ensure_totals_available(
        self,
        queries_needing_totals: Sequence[int] | None = None,
        totals_idx: int | None = None,
    ) -> None:
        if queries_needing_totals is None or totals_idx is None:
            queries_needing_totals, totals_idx = (
                self._query_context.prepare_contribution_totals()
            )

        if not queries_needing_totals or totals_idx is None:
            return

        totals_query = self._query_context.queries[totals_idx]
        totals_timeout: int = self.get_cache_timeout()
        totals_query.cache_timeout = totals_timeout
        totals_query.force_query = (
            self._resolve_forced_query(totals_query, self.query_cache_key(totals_query))
            or totals_timeout == CACHE_DISABLED_TIMEOUT
        )

        result = self._query_context.get_query_result(totals_query)
        df = result.df

        totals = {col: df[col].sum() for col in df.columns if is_summable(df[col])}

        for idx in queries_needing_totals:
            query = self._query_context.queries[idx]
            if hasattr(query, "post_processing") and query.post_processing:
                for pp in query.post_processing:
                    if pp.get("operation") == "contribution":
                        pp["options"]["contribution_totals"] = totals

    def get_payload(
        self,
        cache_query_context: bool | None = False,
        force_cached: bool = False,
    ) -> dict[str, Any]:
        """Returns the query results with both metadata and data"""
        result = self.get_payload_result(cache_query_context, force_cached)
        return_value: dict[str, Any] = {
            "queries": [query.payload for query in result.queries],
        }
        if result.cache_key is not None:
            return_value["cache_key"] = result.cache_key
        return return_value

    def get_payload_result(
        self,
        cache_query_context: bool | None = False,
        force_cached: bool = False,
    ) -> QueryContextExecutionResult:
        """Return query results with timing kept outside query payloads."""
        queries_needing_totals, totals_idx = (
            self._query_context.prepare_contribution_totals()
        )

        if not force_cached:
            self.ensure_totals_available(queries_needing_totals, totals_idx)

            # Store the resolved query objects so a cached context replays them.
            self._query_context.cache_values["queries"] = [
                {**cached_query, **query.to_dict()}
                for cached_query, query in zip(
                    self._query_context.cache_values["queries"],
                    self._query_context.queries,
                    strict=True,
                )
            ]

        query_results = tuple(
            get_query_results_with_timing(
                query_obj.result_type or self._query_context.result_type,
                self._query_context,
                query_obj,
                force_cached,
            )
            for query_obj in self._query_context.queries
        )

        cache_key = None
        if cache_query_context:
            cache_key = self.cache_key()
            set_and_log_cache(
                data_cache,
                cache_key,
                {
                    "data": {
                        "form_data": self._query_context.form_data,
                        **self._query_context.cache_values,
                    },
                },
                self.get_cache_timeout(),
            )

        return QueryContextExecutionResult(queries=query_results, cache_key=cache_key)

    def get_cache_timeout(self) -> int:
        """Cache timeout (seconds): custom > native filter options > slice/datasource >
        DATA_CACHE_CONFIG default > CACHE_DEFAULT_TIMEOUT, floored for async runs."""
        return self._apply_async_min_cache_ttl(self._resolve_cache_timeout())

    def _resolve_cache_timeout(self) -> int:
        if self._query_context.custom_cache_timeout is not None:
            return self._query_context.custom_cache_timeout

        native_filter_timeout: int | None = current_app.config.get(
            "NATIVE_FILTER_OPTIONS_CACHE_TIMEOUT"
        )
        if native_filter_timeout is not None and self._is_native_filter_options_query(
            self._query_context.form_data or {}
        ):
            return native_filter_timeout

        if (cache_timeout := self._query_context.get_cache_timeout()) is not None:
            return cache_timeout

        if (
            data_cache_timeout := current_app.config["DATA_CACHE_CONFIG"].get(
                "CACHE_DEFAULT_TIMEOUT"
            )
        ) is not None:
            return data_cache_timeout

        return current_app.config["CACHE_DEFAULT_TIMEOUT"]

    def _apply_async_min_cache_ttl(self, timeout: int) -> int:
        """Floor an async execution's result-cache TTL (no-op otherwise)."""
        if not self._query_context.is_async_execution:
            return timeout
        min_ttl: int = current_app.config.get("GLOBAL_ASYNC_QUERIES_MIN_CACHE_TTL", 0)
        if 0 < timeout < min_ttl:
            return min_ttl
        return timeout

    @staticmethod
    def _is_native_filter_options_query(form_data: dict[str, Any]) -> bool:
        """Native filter option queries carry ``native_filter_id`` and a ``filter_*`` viz."""
        return bool(form_data.get("native_filter_id")) and str(
            form_data.get("viz_type", "")
        ).startswith("filter_")

    def cache_key(self, **extra: Any) -> str:
        """
        The QueryContext cache key is made out of the key/values from
        self.cached_values, plus any other key/values in `extra`. It includes only data
        required to rehydrate a QueryContext object.
        """
        key_prefix = "qc-"
        cache_dict = self._query_context.cache_values.copy()
        cache_dict.update(extra)

        return generate_cache_key(cache_dict, key_prefix)

    def get_annotation_data(self, query_obj: QueryObject) -> dict[str, Any]:
        # TODO(port): native and chart-backed annotation layers
        # (get_native_annotation_data / get_viz_annotation_data).
        return {}

    def raise_for_access(self) -> None:
        """
        Raise an exception if the user cannot access the resource.

        :raises CoreSecurityException: If the user cannot access the resource
        """
        # Superset routes this through security_manager.raise_for_access(
        # query_context=...), which for semantic views ends in the view's own check.
        self._qc_datasource.raise_for_access()

        for query in self._query_context.queries:
            query.validate()
