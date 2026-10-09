from __future__ import annotations

from dataclasses import dataclass
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from core.common.query.context import QueryContext

NANOSECONDS_PER_MILLISECOND: int = 1_000_000
CHART_DATA_TIMING_VERSION: int = 1

def to_ms(value_ns: int | None) -> float | None:
    if value_ns is None:
        return None
    return round(value_ns / NANOSECONDS_PER_MILLISECOND, 2)


@dataclass(frozen=True)
class QueryAcquisitionTiming:
    query_planning_ns: int
    cache_resolution_ns: int
    data_acquisition_ns: int | None
    payload_assembly_ns: int

@dataclass(frozen=True)
class QueryTiming:
    query_planning_ns: int | None
    cache_resolution_ns: int | None
    data_acquisition_ns: int | None
    payload_assembly_ns: int | None
    total_ns: int

    def as_public_dict(self) -> dict[str, Any]:
        return {
            "version": CHART_DATA_TIMING_VERSION,
            "query": {
                "query_planning_ms": to_ms(self.query_planning_ns),
                "cache_resolution_ms": to_ms(self.cache_resolution_ns),
                "data_acquisition_ms": to_ms(self.data_acquisition_ns),
                "payload_assembly_ms": to_ms(self.payload_assembly_ns),
                "total_ms": to_ms(self.total_ns),
            },
        }

@dataclass(frozen=True)
class QueryAcquisitionResult:
    payload: dict[str, Any]
    timing: QueryAcquisitionTiming

@dataclass(frozen=True)
class QueryDataResult:
    payload: dict[str, Any]
    timing: QueryTiming

@dataclass(frozen=True)
class QueryContextExecutionResult:
    queries: tuple[QueryDataResult, ...]
    cache_key: str | None = None

@dataclass(frozen=True)
class ChartDataExecutionResult:
    query_context: QueryContext
    queries: tuple[QueryDataResult, ...]
    cache_key: str | None = None

    def materialize(self) -> dict[str, Any]:
        queries: list[dict[str, Any]] = []

        for query_result in self.queries:
            queries.append(dict(query_result.payload))
        
        result: dict[str, Any] = {
            "query_context": self.query_context,
            "queries": queries,
        }

        if self.cache_key is not None:
            result["cache_key"] = self.cache_key

        return result
