from __future__ import annotations

from collections.abc import Hashable, Sequence
from datetime import datetime
from typing import Any, Literal, TYPE_CHECKING, TypeAlias, TypedDict

from sqlalchemy.sql.type_api import TypeEngine
from typing_extensions import NotRequired
from werkzeug.wrappers import Response

from core.utils.core import AdhocColumn, Column  # noqa: F401  (re-exported)

if TYPE_CHECKING:
    from core.utils.core import GenericDataType, QueryObjectFilterClause

SQLType: TypeAlias = TypeEngine | type[TypeEngine]


class DatasetColumnData(TypedDict, total=False):
    """Type for column metadata in ExplorableData datasets."""

    advanced_data_type: str | None
    certification_details: str | None
    certified_by: str | None
    column_name: str
    description: str | None
    expression: str | None
    filterable: bool
    groupby: bool
    id: int | None
    uuid: str | None
    is_certified: bool
    is_dttm: bool
    python_date_format: str | None
    type: str
    type_generic: NotRequired["GenericDataType" | None]
    verbose_name: str | None
    warning_markdown: str | None


class DatasetMetricData(TypedDict, total=False):
    """Type for metric metadata in ExplorableData datasets."""

    certification_details: str | None
    certified_by: str | None
    currency: NotRequired[dict[str, Any]]
    d3format: str | None
    description: str | None
    expression: str | None
    id: int | None
    uuid: str | None
    is_certified: bool
    metric_name: str
    warning_markdown: str | None
    warning_text: str | None
    verbose_name: str | None


class AdhocMetricColumn(TypedDict, total=False):
    column_name: str | None
    description: str | None
    expression: str | None
    filterable: bool
    groupby: bool
    id: int
    is_dttm: bool
    python_date_format: str | None
    type: str
    type_generic: "GenericDataType"
    verbose_name: str | None


class AdhocMetric(TypedDict, total=False):
    aggregate: str
    column: AdhocMetricColumn | None
    expressionType: Literal["SIMPLE", "SQL"]
    hasCustomLabel: bool | None
    label: str | None
    sqlExpression: str | None


Metric: TypeAlias = AdhocMetric | str
OrderBy: TypeAlias = tuple[Metric | Column, bool]


class QueryObjectDict(TypedDict, total=False):
    """
    TypedDict representation of query objects used throughout the app.

    This represents the dictionary output from QueryObject.to_dict() and is used
    in datasource query methods.

    Core fields from QueryObject.to_dict():
        apply_fetch_values_predicate: Whether to apply fetch values predicate
        columns: List of columns to include
        extras: Additional options and parameters
        filter: List of filter clauses
        from_dttm: Start datetime for time range
        granularity: Time grain/granularity
        inner_from_dttm: Inner start datetime for nested queries
        inner_to_dttm: Inner end datetime for nested queries
        is_rowcount: Whether this is a row count query
        is_timeseries: Whether this is a timeseries query
        metrics: List of metrics to compute
        order_desc: Whether to order descending
        orderby: List of order by clauses
        row_limit: Maximum number of rows
        row_offset: Number of rows to skip
        series_columns: Columns to use for series
        series_limit: Maximum number of series
        series_limit_metric: Metric to use for series limiting
        group_others_when_limit_reached: Whether to group remaining items as "Others"
        to_dttm: End datetime for time range
        time_shift: Time shift specification

    Additional fields used throughout the codebase:
        time_range: Human-readable time range string
        datasource: BaseDatasource instance
        extra_cache_keys: Additional keys for caching
        rls: Row level security filters
        changed_on: Last modified timestamp

    Deprecated fields (still in use):
        groupby: Columns to group by (use columns instead)
        timeseries_limit: Series limit (use series_limit instead)
        timeseries_limit_metric: Series limit metric (use series_limit_metric instead)
    """

    # Core fields from QueryObject.to_dict()
    apply_fetch_values_predicate: bool
    cache_timeout: int | None
    columns: list[Column]
    extras: dict[str, Any]
    filter: list["QueryObjectFilterClause"]
    force_query: bool
    from_dttm: datetime | None
    granularity: str | None
    inner_from_dttm: datetime | None
    inner_to_dttm: datetime | None
    is_rowcount: bool
    is_timeseries: bool
    metrics: list[Metric] | None
    order_desc: bool
    orderby: list[OrderBy]
    row_limit: int | None
    row_offset: int
    series_columns: list[Column]
    series_limit: int
    series_limit_metric: Metric | None
    group_others_when_limit_reached: bool
    grouping_sets: list[list[str]]
    to_dttm: datetime | None
    time_shift: str | None
    time_compare_full_range: bool
    post_processing: list[dict[str, Any]]

    # Additional fields used throughout the codebase
    time_range: str | None
    datasource: Any  # BaseDatasource instance
    extra_cache_keys: list[Hashable]
    rls: list[Any]
    changed_on: datetime | None

    # Deprecated fields (still in use)
    groupby: list[Column]
    timeseries_limit: int
    timeseries_limit_metric: Metric | None


class ExplorableData(TypedDict, total=False):
    """
    TypedDict for explorable data returned to the frontend.

    This represents the structure of the dictionary returned from the `data` property
    of any Explorable (BaseDatasource, Query, etc.). It provides datasource/query
    information to the frontend for visualization and querying.

    All fields are optional (total=False) since different explorable types provide
    different subsets of these fields. Query objects provide a minimal subset while
    SqlaTable provides the full set.

    Core fields:
        id: Unique identifier for the datasource
        uid: Unique identifier including type (e.g., "1__table")
        column_formats: D3 format strings for columns
        description: Human-readable description
        database: Database connection information
        default_endpoint: Default URL endpoint for this datasource
        filter_select: Whether filter select is enabled (deprecated)
        filter_select_enabled: Whether filter select is enabled
        name: Display name of the datasource
        datasource_name: Name of the underlying table/query
        table_name: Table name (same as datasource_name)
        type: Datasource type (e.g., "table", "query")
        catalog: Catalog name if applicable
        schema: Schema name if applicable
        offset: Default row offset
        cache_timeout: Cache timeout in seconds
        params: Additional parameters as JSON string
        perm: Permission string
        edit_url: URL to edit this datasource
        sql: SQL query for virtual datasets
        columns: List of column definitions
        metrics: List of metric definitions
        folders: Folder structure (JSON field)
        order_by_choices: Available ordering options
        editors: List of editor IDs or editor details
        verbose_map: Mapping of column/metric names to verbose names
        select_star: SELECT * query for this datasource

    Additional fields from SqlaTable and data_for_slices:
        column_types: List of column data types
        column_names: Set of column names
        granularity_sqla: Available time granularities
        time_grain_sqla: Available time grains
        main_dttm_col: Main datetime column
        currency_code_column: Column containing currency codes for dynamic formatting
        partition_column: Physical column the engine partitions on
        partition_mapped_column: Explicit override for the mirrored column
        partition_filter_mapping: Summary of the active mapping, or None
        fetch_values_predicate: Predicate for fetching filter values
        template_params: Template parameters for Jinja
        is_sqllab_view: Whether this is a SQL Lab view
        health_check_message: Health check status message
        extra: Extra configuration as JSON string
        always_filter_main_dttm: Whether to always filter on main datetime
        normalize_columns: Whether to normalize column names
    """

    semantic_selection_version: str | None

    # Core fields from BaseDatasource.data
    id: int | str  # String for UUID-based explorables like SemanticView
    uid: str
    column_formats: dict[str, str | None]
    description: str | None
    database: dict[str, Any]
    parent: dict[str, Any]
    default_endpoint: str | None
    filter_select: bool
    filter_select_enabled: bool
    name: str
    datasource_name: str
    table_name: str
    type: str
    catalog: str | None
    schema: str | None
    offset: int
    cache_timeout: int | None
    params: str | None
    perm: str | None
    edit_url: str
    sql: str | None
    columns: list["DatasetColumnData"]
    metrics: list["DatasetMetricData"]
    folders: Any  # JSON field, can be list or dict
    order_by_choices: list[tuple[str, str]]
    editors: list[int] | list[dict[str, Any]]  # Can be either format
    verbose_map: dict[str, str]
    select_star: str | None

    # Semantic-view fields
    # Stable string values of the SemanticViewFeature members the view's
    # provider declares; consumed by the explore UI to derive picker
    # capabilities. Absent for non-semantic explorables.
    semantic_view_features: list[str]

    # Additional fields from SqlaTable and data_for_slices
    column_types: list["GenericDataType"]
    column_names: set[str] | list[str]
    granularity_sqla: list[tuple[Any, Any]]
    time_grain_sqla: list[tuple[Any, Any]]
    main_dttm_col: str | None
    currency_code_column: str | None
    fetch_values_predicate: str | None
    template_params: str | None
    is_sqllab_view: bool
    health_check_message: str | None
    extra: str | None
    always_filter_main_dttm: bool
    normalize_columns: bool
    partition_column: str | None
    partition_mapped_column: str | None
    # Self-contained summary for the Explore indicator. Kept separate from
    # `columns` because `data_for_slices` prunes columns no chart references,
    # and the partition column is typically referenced by none of them.
    partition_filter_mapping: dict[str, Any] | None
    rls_filters: list[dict[str, Any]]
    # Set by datasources that cannot return raw row samples (e.g. semantic
    # views, which only expose pre-defined metrics and dimensions).
    supports_samples: bool
    # Set by datasources that cannot answer drill-to-detail requests.
    supports_drill_to_detail: bool
