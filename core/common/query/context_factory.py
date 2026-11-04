"""QueryContextFactory, ported from superset/common/query_context_factory.py."""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

from flask import current_app

from core.common.chart.data import ChartDataResultFormat, ChartDataResultType
from core.common.query.context import QueryContext
from core.common.query.object import QueryObject
from core.common.query.object_factory import QueryObjectFactory
from core.daos.chart import ChartDAO
from core.daos.datasource import DatasourceDAO
from core.type_defs import Column
from core.utils.core import DatasourceDict, DatasourceType, is_adhoc_column
from core.utils.date_parser import is_no_time_range

if TYPE_CHECKING:
    from core.explorables.base import Explorable
    from core.models.slice import Slice


def create_query_object_factory() -> QueryObjectFactory:
    return QueryObjectFactory(current_app.config, DatasourceDAO())


class QueryContextFactory:  # pylint: disable=too-few-public-methods
    _query_object_factory: QueryObjectFactory
    _authorize_semantic_before_metadata: bool

    def __init__(self, authorize_semantic_before_metadata: bool = False) -> None:
        self._query_object_factory = create_query_object_factory()
        self._authorize_semantic_before_metadata = authorize_semantic_before_metadata

    def create(  # pylint: disable=too-many-arguments
        self,
        *,
        current_slice: Slice | None = None,
        datasource: DatasourceDict,
        queries: list[dict[str, Any]],
        form_data: dict[str, Any] | None = None,
        result_type: ChartDataResultType | None = None,
        result_format: ChartDataResultFormat | None = None,
        force: bool = False,
        force_nonce: str | None = None,
        custom_cache_timeout: int | None = None,
        preserve_null_row_limit: bool = False,
    ) -> QueryContext:
        from core.models.slice import Slice  # pylint: disable=import-outside-toplevel

        datasource_model_instance = None
        if datasource:
            datasource_model_instance = self._convert_to_model(datasource)

        slice_ = None
        if isinstance(current_slice, Slice):
            slice_ = current_slice
        elif form_data and form_data.get("slice_id") is not None:
            slice_ = self._get_slice(form_data.get("slice_id"))

        result_type = result_type or ChartDataResultType.FULL
        result_format = result_format or ChartDataResultFormat.JSON

        # Authorize a semantic view before resolving query metadata through its
        # provider, so an unauthorized caller can't probe the view's members.
        # Superset runs the full security_manager check on an empty context here.
        if (
            self._authorize_semantic_before_metadata
            and datasource_model_instance is not None
            and DatasourceType(datasource["type"]) == DatasourceType.SEMANTIC_VIEW
        ):
            datasource_model_instance.raise_for_access()

        server_pagination = (
            bool(form_data.get("server_pagination")) if form_data else False
        )

        queries_ = [
            self._process_query_object(
                datasource_model_instance,
                form_data,
                self._query_object_factory.create(
                    result_type,
                    datasource=datasource,
                    datasource_model_instance=datasource_model_instance,
                    force_query=force,
                    server_pagination=server_pagination,
                    preserve_null_row_limit=preserve_null_row_limit,
                    **query_obj,
                ),
            )
            for query_obj in queries
        ]
        cache_values = {
            "datasource": datasource,
            "queries": queries,
            "result_type": result_type,
            "result_format": result_format,
        }
        return QueryContext(
            datasource=datasource_model_instance,
            queries=queries_,
            slice_=slice_,
            form_data=form_data,
            result_type=result_type,
            result_format=result_format,
            force=force,
            force_nonce=force_nonce,
            custom_cache_timeout=custom_cache_timeout,
            cache_values=cache_values,
        )

    def _convert_to_model(self, datasource: DatasourceDict) -> Explorable:
        return DatasourceDAO.get_datasource(
            datasource_type=DatasourceType(datasource["type"]),
            database_id_or_uuid=datasource["id"],
        )

    def _get_slice(self, slice_id: Any) -> Slice | None:
        return ChartDAO.find_by_id(slice_id)

    def _process_query_object(
        self,
        datasource: Explorable,
        form_data: dict[str, Any] | None,
        query_object: QueryObject,
    ) -> QueryObject:
        self._apply_granularity(query_object, form_data, datasource)
        self._apply_filters(query_object, form_data)
        self._add_tooltip_columns(query_object, form_data)
        self._add_currency_column(query_object, form_data, datasource)
        return query_object

    def _add_tooltip_columns(
        self,
        query_object: QueryObject,
        form_data: dict[str, Any] | None,
    ) -> None:
        """Add tooltip columns to the query object."""
        if not form_data:
            return

        tooltip_columns = self._extract_tooltip_columns(form_data)
        if not tooltip_columns:
            return

        existing_columns = self._get_existing_column_names(query_object.columns)
        self._append_missing_tooltip_columns(
            query_object, tooltip_columns, existing_columns
        )

    def _get_existing_column_names(self, columns: list[Column]) -> set[str]:
        """Extract column names from existing columns."""
        column_names: set[str] = set()
        for col in columns:
            if isinstance(col, dict):
                column_name = col.get("column_name")
                if column_name and isinstance(column_name, str):
                    column_names.add(column_name)
            elif isinstance(col, str):
                column_names.add(col)
        return column_names

    def _append_missing_tooltip_columns(
        self,
        query_object: QueryObject,
        tooltip_columns: list[str],
        existing_columns: set[str],
    ) -> None:
        """Append missing tooltip columns to query object."""
        for col in tooltip_columns:
            if col not in existing_columns:
                column_def = self._find_column_definition(query_object, col)
                query_object.columns.append(column_def or col)

    def _find_column_definition(
        self, query_object: QueryObject, column_name: str
    ) -> Any | None:
        """Find column definition from datasource."""
        if not (
            query_object.datasource and hasattr(query_object.datasource, "columns")
        ):
            return None

        return next(
            (
                c
                for c in query_object.datasource.columns
                if c.column_name == column_name
            ),
            None,
        )

    def _extract_tooltip_columns(self, form_data: dict[str, Any]) -> list[str]:
        """Extract column names from tooltip_contents configuration."""
        tooltip_columns = []
        if tooltip_contents := form_data.get("tooltip_contents", []):
            for item in tooltip_contents:
                if isinstance(item, str):
                    tooltip_columns.append(item)
                elif isinstance(item, dict) and item.get("item_type") == "column":
                    column_name = item.get("column_name")
                    if column_name:
                        tooltip_columns.append(column_name)
        return tooltip_columns

    def _add_currency_column(
        self,
        query_object: QueryObject,
        form_data: dict[str, Any] | None,
        datasource: Explorable,
    ) -> None:
        """Inject the datasource's currency_code_column for pivot_table_v2 AUTO currency."""
        if not form_data or not query_object.columns:
            return

        if form_data.get("viz_type") != "pivot_table_v2":
            return

        currency_format = form_data.get("currency_format", {})
        if not (
            isinstance(currency_format, dict)
            and currency_format.get("symbol") == "AUTO"
        ):
            return

        currency_column = getattr(datasource, "currency_code_column", None)
        if not currency_column:
            return

        existing_columns = self._get_existing_column_names(query_object.columns)
        if currency_column not in existing_columns:
            query_object.columns.append(currency_column)

    def _apply_granularity(  # noqa: C901
        self,
        query_object: QueryObject,
        form_data: dict[str, Any] | None,
        datasource: Explorable,
    ) -> None:
        temporal_columns = {
            column["column_name"] if isinstance(column, dict) else column.column_name
            for column in datasource.columns
            if (column["is_dttm"] if isinstance(column, dict) else column.is_dttm)
        }
        x_axis = form_data and form_data.get("x_axis")
        temporal_range_filters = [
            filter_
            for filter_ in query_object.filter
            if filter_["op"] == "TEMPORAL_RANGE"
        ]

        # A custom-SQL x-axis with a time range but no granularity: bound the
        # range on the datasource's main temporal column.
        should_infer_filter_granularity: bool = (
            is_adhoc_column(x_axis)  # type: ignore
            and query_object.granularity is None
            and bool(query_object.from_dttm or query_object.to_dttm)
            and (bool(query_object.time_range) or not temporal_range_filters)
            and (main_dttm_col := getattr(datasource, "main_dttm_col", None))
            in temporal_columns
        )
        if should_infer_filter_granularity:
            query_object.granularity = main_dttm_col
            return

        # Legacy timeseries charts have no x-axis; resolve granularity from the
        # form data, falling back to the main temporal column.
        if (
            not x_axis
            and query_object.granularity is None
            and query_object.is_timeseries
        ):
            candidates = (
                candidate.get("sqlExpression")
                if isinstance(candidate, dict)
                else candidate
                for candidate in (
                    (form_data or {}).get("granularity"),
                    (form_data or {}).get("granularity_sqla"),
                    getattr(datasource, "main_dttm_col", None),
                )
            )
            query_object.granularity = next(
                (
                    candidate
                    for candidate in candidates
                    if isinstance(candidate, str) and candidate in temporal_columns
                ),
                None,
            )
            return

        if granularity := query_object.granularity:
            filter_to_remove = None
            if is_adhoc_column(x_axis):  # type: ignore
                x_axis = x_axis.get("sqlExpression")
            if isinstance(x_axis, dict) and "sqlExpression" in x_axis:
                x_axis = x_axis.get("sqlExpression")
            if x_axis and x_axis in temporal_columns:
                filter_to_remove = x_axis
                x_axis_column = next(
                    (
                        column
                        for column in query_object.columns
                        if column == x_axis
                        or (
                            isinstance(column, dict)
                            and column["sqlExpression"] == x_axis
                        )
                    ),
                    None,
                )
                # Replace x_axis column with granularity column
                if x_axis_column:
                    if isinstance(x_axis_column, dict):
                        x_axis_column["sqlExpression"] = granularity
                    else:
                        query_object.columns = [
                            granularity if column == x_axis_column else column
                            for column in query_object.columns
                        ]
                        for post_processing in query_object.post_processing:
                            if post_processing.get("operation") == "pivot":
                                post_processing["options"]["index"] = [granularity]

            # If no temporal x-axis, then get the default temporal filter
            if not filter_to_remove:
                temporal_filters = [
                    filter["col"]
                    for filter in query_object.filter
                    if filter["op"] == "TEMPORAL_RANGE"
                ]
                if len(temporal_filters) > 0:
                    # Use granularity if it's already in the filters
                    if granularity in temporal_filters:
                        filter_to_remove = granularity
                    else:
                        # Use the first temporal filter
                        filter_to_remove = temporal_filters[0]

            if filter_to_remove and is_adhoc_column(filter_to_remove):  # type: ignore
                filter_to_remove = filter_to_remove.get("sqlExpression")

            # Removes the temporal filter which may be an x-axis or
            # another temporal filter. A new filter based on the value of
            # the granularity will be added later in the code.
            if filter_to_remove:
                query_object.filter = [
                    filter
                    for filter in query_object.filter
                    if filter["col"] != filter_to_remove
                    or (
                        filter["op"] != "TEMPORAL_RANGE"
                        and (
                            filter_to_remove == granularity
                            or (
                                (form_data or {}).get("viz_type") == "sunburst_v2"
                                and not filter.get("isExtra")
                            )
                        )
                    )
                ]

    def _apply_filters(
        self, query_object: QueryObject, form_data: dict[str, Any] | None = None
    ) -> None:
        """Apply the time range, retaining the source of dashboard overrides."""
        extra_form_data: object = (form_data or {}).get("extra_form_data")
        dashboard_time_override: bool = (
            isinstance(extra_form_data, dict)
            and "time_range" in extra_form_data
            and extra_form_data["time_range"] == query_object.time_range
        )
        if query_object.time_range:
            for filter_object in query_object.filter:
                if filter_object["op"] == "TEMPORAL_RANGE":
                    saved: object = filter_object.get("val")
                    was_unbounded: bool = saved is None or (
                        isinstance(saved, str) and is_no_time_range(saved)
                    )
                    filter_object["val"] = query_object.time_range
                    if dashboard_time_override and was_unbounded:
                        filter_object["isExtra"] = True
