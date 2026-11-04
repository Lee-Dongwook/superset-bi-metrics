"""Query result cache get/set, ported from superset/common/utils/query_cache_manager.py."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, TYPE_CHECKING

from flask import current_app, g, has_request_context
from flask_caching import Cache
from pandas import DataFrame

from core.constants import CacheRegion, SemanticCacheStatus
from core.exceptions import CacheLoadError, CoreException
from core.extension import data_cache
from core.query.types import QueryStatus
from core.stats_logger import BaseStatsLogger
from core.utils.cache import set_and_log_cache
from core.utils.core import error_msg_from_exception, get_stacktrace

if TYPE_CHECKING:
    from core.models.helpers import QueryResult
    from core.type_defs import Column

logger = logging.getLogger(__name__)


# Superset keeps a general `cache` (DEFAULT) and a `data_cache` (DATA); this repo
# only has the data cache, so both regions share it.
_cache: dict[CacheRegion, Cache] = {
    CacheRegion.DEFAULT: data_cache,
    CacheRegion.DATA: data_cache,
}


class QueryCacheManager:
    """Manage query-cache getting and setting."""

    @property
    def stats_logger(self) -> BaseStatsLogger:
        return current_app.config["STATS_LOGGER"]

    # pylint: disable=too-many-instance-attributes,too-many-arguments
    def __init__(
        self,
        df: DataFrame = DataFrame(),  # noqa: B008
        query: str = "",
        annotation_data: dict[str, Any] | None = None,
        applied_template_filters: list[str] | None = None,
        applied_filter_columns: list[Column] | None = None,
        rejected_filter_columns: list[Column] | None = None,
        status: str | None = None,
        error_message: str | None = None,
        is_loaded: bool = False,
        stacktrace: str | None = None,
        is_cached: bool | None = None,
        cache_dttm: str | None = None,
        cache_value: dict[str, Any] | None = None,
        sql_rowcount: int | None = None,
        queried_dttm: str | None = None,
        semantic_cache_status: str | None = None,
    ) -> None:
        self.df = df
        self.query = query
        self.annotation_data = {} if annotation_data is None else annotation_data
        self.applied_template_filters = applied_template_filters or []
        self.applied_filter_columns = applied_filter_columns or []
        self.rejected_filter_columns = rejected_filter_columns or []
        self.status: Any = status
        self.error_message = error_message

        self.is_loaded = is_loaded
        self.stacktrace = stacktrace
        self.is_cached = is_cached
        self.cache_dttm = cache_dttm
        self.cache_value = cache_value
        self.sql_rowcount = sql_rowcount
        self.queried_dttm = queried_dttm
        self.semantic_cache_status: str | None = semantic_cache_status
        self.bq_memory_limited: bool = False
        self.bq_memory_limited_row_count: int = 0
        # Whether set_query_result actually persisted the value (gates the
        # forced-refresh idempotency marker).
        self.result_persisted: bool = False

    # pylint: disable=too-many-arguments
    def set_query_result(
        self,
        key: str,
        query_result: QueryResult,
        annotation_data: dict[str, Any] | None = None,
        force_query: bool | None = False,
        timeout: int | None = None,
        datasource_uid: str | None = None,
        region: CacheRegion = CacheRegion.DEFAULT,
    ) -> None:
        """Set dataframe of query-result to specific cache region."""
        try:
            self.status = query_result.status
            self.query = query_result.query
            self.applied_template_filters = query_result.applied_template_filters
            self.applied_filter_columns = query_result.applied_filter_columns
            self.rejected_filter_columns = query_result.rejected_filter_columns
            self.error_message = query_result.error_message
            self.df = query_result.df
            self.sql_rowcount = query_result.sql_rowcount
            self.semantic_cache_status = query_result.semantic_cache_status
            self.annotation_data = {} if annotation_data is None else annotation_data
            self.queried_dttm = (
                datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat()
            )

            if self.status != QueryStatus.FAILED:
                self.stats_logger.incr("loaded_from_source")
                if not force_query:
                    self.stats_logger.incr("loaded_from_source_without_force")
                self.is_loaded = True

            # Capture BigQuery memory-limit flag so it survives cache hits
            if has_request_context():
                self.bq_memory_limited = getattr(g, "bq_memory_limited", False)
                self.bq_memory_limited_row_count = getattr(
                    g, "bq_memory_limited_row_count", 0
                )
                g.bq_memory_limited = False
                g.bq_memory_limited_row_count = 0

            value = {
                "df": self.df,
                "query": self.query,
                "applied_template_filters": self.applied_template_filters,
                "applied_filter_columns": self.applied_filter_columns,
                "rejected_filter_columns": self.rejected_filter_columns,
                "annotation_data": self.annotation_data,
                "sql_rowcount": self.sql_rowcount,
                "semantic_cache_status": self.semantic_cache_status,
                "queried_dttm": self.queried_dttm,
                "dttm": self.queried_dttm,  # Backwards compatibility
                "bq_memory_limited": self.bq_memory_limited,
                "bq_memory_limited_row_count": self.bq_memory_limited_row_count,
            }
            if self.is_loaded and key and self.status != QueryStatus.FAILED:
                self.result_persisted = self.set(
                    key=key,
                    value=value,
                    timeout=timeout,
                    datasource_uid=datasource_uid,
                    region=region,
                )
        except Exception as ex:  # pylint: disable=broad-except
            logger.exception(ex)
            if not self.error_message:
                self.error_message = str(ex)
            self.status = QueryStatus.FAILED
            self.stacktrace = get_stacktrace()

    @classmethod
    def get(
        cls,
        key: str | None,
        region: CacheRegion = CacheRegion.DEFAULT,
        force_query: bool | None = False,
        force_cached: bool | None = False,
    ) -> QueryCacheManager:
        """Initialize QueryCacheManager by query-cache key."""
        query_cache = cls()
        if not key or not _cache[region] or force_query:
            return query_cache

        try:
            cache_value = _cache[region].get(key)
        except Exception as ex:  # pylint: disable=broad-except
            # A cache backend outage is treated as a miss.
            logger.warning("Error reading cache: %s", error_msg_from_exception(ex))
            cache_value = None

        if cache_value:
            logger.debug("CACHE GET - Key: %s, Region: %s", key, region)
            query_cache.stats_logger.incr("loading_from_cache")
            try:
                query_cache.df = cache_value["df"]
                query_cache.query = cache_value["query"]
                query_cache.annotation_data = cache_value.get("annotation_data", {})
                query_cache.applied_template_filters = cache_value.get(
                    "applied_template_filters", []
                )
                query_cache.applied_filter_columns = cache_value.get(
                    "applied_filter_columns", []
                )
                query_cache.rejected_filter_columns = cache_value.get(
                    "rejected_filter_columns", []
                )
                query_cache.status = QueryStatus.SUCCESS
                query_cache.is_loaded = True
                query_cache.is_cached = True
                query_cache.sql_rowcount = cache_value.get("sql_rowcount", None)
                # Served by the ordinary result cache, not semantic containment.
                query_cache.semantic_cache_status = SemanticCacheStatus.MISS.value
                query_cache.cache_dttm = cache_value["dttm"]
                query_cache.queried_dttm = cache_value.get(
                    "queried_dttm", cache_value.get("dttm")
                )
                query_cache.cache_value = cache_value
                query_cache.bq_memory_limited = cache_value.get(
                    "bq_memory_limited", False
                )
                query_cache.bq_memory_limited_row_count = cache_value.get(
                    "bq_memory_limited_row_count", 0
                )
                query_cache.stats_logger.incr("loaded_from_cache")
            except KeyError as ex:
                logger.exception(ex)
                logger.error(
                    "Error reading cache: %s",
                    error_msg_from_exception(ex),
                    exc_info=True,
                )
            logger.debug("Serving from cache")

        if force_cached and not query_cache.is_loaded:
            logger.warning(
                "force_cached (QueryContext): value not found for key %s", key
            )
            raise CacheLoadError("Error loading data from cache")
        return query_cache

    @staticmethod
    def set(
        key: str | None,
        value: dict[str, Any],
        timeout: int | None = None,
        datasource_uid: str | None = None,
        region: CacheRegion = CacheRegion.DEFAULT,
    ) -> bool:
        """Proxy for `set_and_log_cache`; returns whether the value persisted."""
        if key:
            return set_and_log_cache(
                _cache[region], key, value, timeout, datasource_uid
            )
        return False

    @staticmethod
    def delete(
        key: str | None,
        region: CacheRegion = CacheRegion.DEFAULT,
    ) -> None:
        if key:
            _cache[region].delete(key)

    @staticmethod
    def has(
        key: str | None,
        region: CacheRegion = CacheRegion.DEFAULT,
    ) -> bool:
        return bool(_cache[region].get(key)) if key else False
