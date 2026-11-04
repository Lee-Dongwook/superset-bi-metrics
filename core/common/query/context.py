"""QueryContext, ported from superset/common/query_context.py."""

from __future__ import annotations

import logging
from typing import Any, ClassVar, TYPE_CHECKING

import pandas as pd

from core.common.chart.data import ChartDataResultFormat, ChartDataResultType
from core.common.chart.data_timing import (
    QueryAcquisitionResult,
    QueryContextExecutionResult,
)
from core.common.query.context_processor import (
    normalize_contribution_totals,
    QueryContextProcessor,
)
from core.utils.core import GenericDataType

if TYPE_CHECKING:
    from core.common.query.object import QueryObject
    from core.explorables.base import Explorable
    from core.models.helpers import QueryResult
    from core.models.slice import Slice

logger = logging.getLogger(__name__)


class QueryContext:
    """
    The query context contains the query object and additional fields necessary
    to retrieve the data payload for a given viz.
    """

    cache_type: ClassVar[str] = "df"
    enforce_numerical_metrics: ClassVar[bool] = True

    datasource: Explorable
    slice_: Slice | None = None
    queries: list[QueryObject]
    form_data: dict[str, Any] | None
    result_type: ChartDataResultType
    result_format: ChartDataResultFormat
    force: bool
    force_nonce: str | None
    custom_cache_timeout: int | None

    is_async_execution: bool = False

    cache_values: dict[str, Any]

    _processor: QueryContextProcessor

    def __init__(  # pylint: disable=too-many-arguments
        self,
        *,
        datasource: Explorable,
        queries: list[QueryObject],
        slice_: Slice | None,
        form_data: dict[str, Any] | None,
        result_type: ChartDataResultType,
        result_format: ChartDataResultFormat,
        force: bool = False,
        force_nonce: str | None = None,
        custom_cache_timeout: int | None = None,
        cache_values: dict[str, Any],
    ) -> None:
        self.datasource = datasource
        self.slice_ = slice_
        self.result_type = result_type
        self.result_format = result_format
        self.queries = queries
        self.form_data = form_data
        self.force = force
        self.force_nonce = force_nonce
        self.custom_cache_timeout = custom_cache_timeout
        self.cache_values = cache_values
        self.prepare_contribution_totals()
        self._processor = QueryContextProcessor(self)

    def get_data(
        self,
        df: pd.DataFrame,
        coltypes: list[GenericDataType],
    ) -> str | bytes | list[dict[str, Any]]:
        return self._processor.get_data(df, coltypes)

    def get_payload(
        self,
        cache_query_context: bool | None = False,
        force_cached: bool = False,
    ) -> dict[str, Any]:
        """Returns the query results with both metadata and data"""
        return self._processor.get_payload(cache_query_context, force_cached)

    def get_payload_result(
        self,
        cache_query_context: bool | None = False,
        force_cached: bool = False,
    ) -> QueryContextExecutionResult:
        """Return query results with timing kept outside query payloads."""
        return self._processor.get_payload_result(cache_query_context, force_cached)

    def get_cache_timeout(self) -> int | None:
        """Custom timeout > chart timeout > datasource timeout > None (system default)."""
        if self.custom_cache_timeout is not None:
            return self.custom_cache_timeout
        if self.slice_ and self.slice_.cache_timeout is not None:
            return self.slice_.cache_timeout
        return self.datasource.cache_timeout

    def query_cache_key(self, query_obj: QueryObject, **kwargs: Any) -> str | None:
        return self._processor.query_cache_key(query_obj, **kwargs)

    def prepare_contribution_totals(self) -> tuple[list[int], int | None]:
        """Identify contribution queries and normalize the totals query (idempotent)."""
        return normalize_contribution_totals(self.queries, self.cache_values)

    def get_df_payload(
        self,
        query_obj: QueryObject,
        force_cached: bool | None = False,
    ) -> dict[str, Any]:
        return self._processor.get_df_payload(
            query_obj=query_obj,
            force_cached=force_cached,
        )

    def get_df_payload_result(
        self,
        query_obj: QueryObject,
        force_cached: bool | None = False,
    ) -> QueryAcquisitionResult:
        """Return dataframe payload with timing kept outside the payload."""
        return self._processor.get_df_payload_result(
            query_obj=query_obj,
            force_cached=force_cached,
        )

    def get_query_result(self, query_object: QueryObject) -> QueryResult:
        return self._processor.get_query_result(query_object)

    def raise_for_access(self) -> None:
        self._processor.raise_for_access()
