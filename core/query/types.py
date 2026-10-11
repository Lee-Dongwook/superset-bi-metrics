from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    import pandas as pd

class QueryStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    STOPPED = "stopped"

@dataclass
class CacheOptions:
    timeout: int | None = None 
    force_refresh: bool = False 

@dataclass
class QueryOptions:
    catalog: str | None = None
    schema: str | None = None
    limit: int | None = None
    timeout_seconds: int | None = None
    template_params: dict[str, Any] | None = None 
    cache: CacheOptions | None = None
    dry_run: bool = False

@dataclass
class StatementResult:
    data: pd.DataFrame | None = None
    row_count: int = 0
    execution_time_ms: float | None = None
    truncated: bool = False

@dataclass
class QueryResult:
    status: QueryStatus
    statements: list[StatementResult] = field(default_factory=list)
    query_id: int | None = None
    total_execution_time_ms: float | None = None
    is_cached: bool = False
    error_message: str | None = None

@dataclass
class AsyncQueryHandle:
    query_id: int | None  
    status: QueryStatus = field(default=QueryStatus.PENDING)
    started_at: datetime | None = None

    def get_status(self) -> QueryStatus:
        raise NotImplementedError("Method will be replaced during initialized")
    
    def get_result(self) -> QueryResult:
        raise NotImplementedError("Method will be replaced during initialized")
    
    def cancel(self) -> bool:
        raise NotImplementedError("Method will be replaced during initialized")
