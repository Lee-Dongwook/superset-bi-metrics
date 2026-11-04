"""Base protocol for explorable data sources, ported from superset/explorables/base.py.

An "explorable" is any data source that can be explored to create charts. Here
that is the Cube-backed ``SemanticView`` (core/semantic/models.py).
"""

from __future__ import annotations

from collections.abc import Hashable
from datetime import datetime
from typing import Any, Protocol, runtime_checkable, TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from core.common.query.object import QueryObject
    from core.models.helpers import QueryResult
    from core.type_defs import ExplorableData, QueryObjectDict


class TimeGrainDict(TypedDict):
    """A time granularity option (name, implementation expression, ISO 8601 duration)."""

    name: str
    function: str
    duration: str | None


@runtime_checkable
class MetricMetadata(Protocol):
    @property
    def metric_name(self) -> str: ...

    @property
    def expression(self) -> str: ...

    @property
    def verbose_name(self) -> str | None: ...

    @property
    def description(self) -> str | None: ...

    @property
    def d3format(self) -> str | None: ...

    @property
    def currency(self) -> dict[str, Any] | None: ...

    @property
    def warning_text(self) -> str | None: ...

    @property
    def certified_by(self) -> str | None: ...

    @property
    def certification_details(self) -> str | None: ...


@runtime_checkable
class ColumnMetadata(Protocol):
    @property
    def column_name(self) -> str: ...

    @property
    def type(self) -> str: ...

    @property
    def is_dttm(self) -> bool: ...

    @property
    def verbose_name(self) -> str | None: ...

    @property
    def description(self) -> str | None: ...

    @property
    def groupby(self) -> bool: ...

    @property
    def filterable(self) -> bool: ...

    @property
    def expression(self) -> str | None: ...

    @property
    def python_date_format(self) -> str | None: ...

    @property
    def advanced_data_type(self) -> str | None: ...

    @property
    def extra(self) -> str | None: ...


@runtime_checkable
class Explorable(Protocol):
    """Protocol for objects that can be explored to create charts."""

    def get_query_result(self, query_object: QueryObject) -> QueryResult:
        """Execute a query and return results."""

    def get_query_str(self, query_obj: QueryObjectDict) -> str:
        """Get the query string without executing (for "View query")."""

    @property
    def id(self) -> int | str:
        """Primary key identifier for this explorable."""

    @property
    def uid(self) -> str:
        """Unique identifier, e.g. ``"<id>__<type>"``; used in cache keys."""

    @property
    def type(self) -> str:
        """Type discriminator, e.g. ``"table"`` or ``"semantic_view"``."""

    @property
    def metrics(self) -> list[MetricMetadata]: ...

    @property
    def columns(self) -> list[ColumnMetadata]: ...

    @property
    def column_names(self) -> list[str]: ...

    @property
    def data(self) -> ExplorableData:
        """Full metadata representation sent to the frontend."""

    @property
    def cache_timeout(self) -> int | None:
        """Default cache timeout in seconds; ``None`` falls back to the system default."""

    @property
    def changed_on(self) -> datetime | None:
        """Last modification timestamp; part of the cache key."""

    def get_extra_cache_keys(self, query_obj: QueryObjectDict) -> list[Hashable]:
        """Additional cache key components specific to this explorable."""

    @property
    def perm(self) -> str:
        """Permission string for this explorable."""

    @property
    def offset(self) -> int:
        """Timezone offset (hours) applied to datetime columns."""

    def get_time_grains(self) -> list[TimeGrainDict]: ...

    def has_drill_by_columns(self, column_names: list[str]) -> bool: ...

    def raise_for_access(self) -> None:
        """Raise if the current user may not access this explorable."""

    @property
    def is_rls_supported(self) -> bool: ...

    @property
    def query_language(self) -> str | None: ...

    def get_compatible_metrics(
        self, selected_metrics: list[str], selected_dimensions: list[str]
    ) -> list[str]: ...

    def get_compatible_dimensions(
        self, selected_metrics: list[str], selected_dimensions: list[str]
    ) -> list[str]: ...
