from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Callable

import pandas as pd

from core.query.types import (
    AsyncQueryHandle,
    QueryResult,
    QueryStatus,
    StatementResult,
)
from core.semantic.cube_client import CubeClient
from core.semantic.redis_publisher import RedisEventPublisher
from core.semantic.types import CubeQueryStage

logger = logging.getLogger(__name__)


class CubeQueryBridge:
    """Bridges Apache Superset query handling with Cube.js semantic engine

    and streams query stages and pre-aggregation building progress to Redis.
    """

    cube_client: CubeClient
    publisher: RedisEventPublisher

    def __init__(
        self,
        cube_client: CubeClient | None = None,
        publisher: RedisEventPublisher | None = None,
    ) -> None:
        self.cube_client = cube_client or CubeClient()
        self.publisher = publisher or RedisEventPublisher()

    def execute_query(
        self,
        channel_id: str,
        query_id: str | int,
        query: dict[str, Any],
        poll_interval: float = 0.5,
        timeout_seconds: float = 60.0,
        should_cancel: Callable[[], bool] | None = None,
    ) -> QueryResult:
        """Executes a Cube.js query synchronously with polling, publishing real-time

        events to Redis at each stage update. ``should_cancel`` is checked before
        every poll; when it returns True the query stops with ``QueryStatus.STOPPED``.
        """
        qid_str = str(query_id)
        qid_int = int(query_id) if str(query_id).isdigit() else None
        start_time = time.time()

        def elapsed() -> int:
            return int((time.time() - start_time) * 1000)

        # Step 1: Emit initial dispatch event
        self.publisher.publish_stage(
            channel_id=channel_id,
            query_id=qid_str,
            status="RUNNING",
            step="DISPATCHED",
            description="Query dispatched to Cube.js engine",
            progress_percent=10.0,
            elapsed_ms=0,
        )

        while True:
            if should_cancel and should_cancel():
                error_msg = "Query stopped by user cancel request"
                self.publisher.publish_failed(
                    channel_id=channel_id,
                    query_id=qid_str,
                    error=error_msg,
                )
                return QueryResult(
                    status=QueryStatus.STOPPED,
                    query_id=qid_int,
                    total_execution_time_ms=float(elapsed()),
                    error_message=error_msg,
                )

            # Check timeout
            if time.time() - start_time > timeout_seconds:
                error_msg = f"Query timed out after {timeout_seconds} seconds"
                self.publisher.publish_failed(
                    channel_id=channel_id,
                    query_id=qid_str,
                    error=error_msg,
                )
                return QueryResult(
                    status=QueryStatus.TIMED_OUT,
                    query_id=qid_int,
                    total_execution_time_ms=float(elapsed()),
                    error_message=error_msg,
                )

            try:
                response = self.cube_client.load_query(query)
            except Exception as exc:
                elapsed_ms = elapsed()
                error_msg = f"Cube.js API connection error: {exc}"
                self.publisher.publish_failed(
                    channel_id=channel_id,
                    query_id=qid_str,
                    error=error_msg,
                )
                return QueryResult(
                    status=QueryStatus.FAILED,
                    query_id=qid_int,
                    total_execution_time_ms=float(elapsed_ms),
                    error_message=error_msg,
                )

            elapsed_ms = elapsed()

            # Continue wait (e.g. pre-aggregation building, long running query)
            if response.get("error") == "Continue wait":
                stage = self.cube_client.parse_stage(response, elapsed_ms=elapsed_ms)
                self.publisher.publish_stage(
                    channel_id=channel_id,
                    query_id=qid_str,
                    status="RUNNING",
                    step=stage.step,
                    description=stage.description,
                    progress_percent=stage.progress_percent,
                    elapsed_ms=elapsed_ms,
                )
                time.sleep(poll_interval)
                continue

            # Query returned an explicit error
            if "error" in response and response["error"]:
                err_text = str(response["error"])
                self.publisher.publish_failed(
                    channel_id=channel_id,
                    query_id=qid_str,
                    error=err_text,
                )
                return QueryResult(
                    status=QueryStatus.FAILED,
                    query_id=qid_int,
                    total_execution_time_ms=float(elapsed_ms),
                    error_message=err_text,
                )

            # Query completed successfully
            raw_data = response.get("data", [])
            df = pd.DataFrame(raw_data)

            self.publisher.publish_success(
                channel_id=channel_id,
                query_id=qid_str,
                result_url=f"/api/v1/query/{qid_str}/result",
                stage=CubeQueryStage(
                    step="COMPLETED",
                    description="Query completed successfully",
                    progress_percent=100.0,
                    elapsed_ms=elapsed_ms,
                ),
            )

            statement = StatementResult(
                data=df,
                row_count=len(df),
                execution_time_ms=float(elapsed_ms),
            )
            return QueryResult(
                status=QueryStatus.SUCCESS,
                statements=[statement],
                query_id=qid_int,
                total_execution_time_ms=float(elapsed_ms),
            )


class CubeAsyncQueryHandle(AsyncQueryHandle):
    """Concrete implementation of Superset AsyncQueryHandle for Cube.js queries."""

    def __init__(
        self,
        query_id: int | None,
        channel_id: str,
        query: dict[str, Any],
        bridge: CubeQueryBridge | None = None,
    ) -> None:
        super().__init__(query_id=query_id, status=QueryStatus.PENDING, started_at=datetime.now(timezone.utc))
        self.channel_id = channel_id
        self.query = query
        self.bridge = bridge or CubeQueryBridge()
        self._result: QueryResult | None = None
        self._canceled: bool = False

    def execute(self, timeout_seconds: float = 60.0) -> QueryResult:
        """Executes the query and updates internal status."""
        self.status = QueryStatus.RUNNING
        self._result = self.bridge.execute_query(
            channel_id=self.channel_id,
            query_id=self.query_id or 0,
            query=self.query,
            timeout_seconds=timeout_seconds,
            should_cancel=lambda: self._canceled,
        )
        self.status = self._result.status
        return self._result

    def get_status(self) -> QueryStatus:
        return self.status

    def get_result(self) -> QueryResult:
        if self._result is None:
            raise RuntimeError("Query has not finished execution yet.")
        return self._result

    def cancel(self) -> bool:
        """Requests cancellation; the bridge publishes the STOPPED event on its next poll.

        Returns False if the query already finished.
        """
        if self.status not in (QueryStatus.PENDING, QueryStatus.RUNNING):
            return False
        self._canceled = True
        self.status = QueryStatus.STOPPED
        return True
