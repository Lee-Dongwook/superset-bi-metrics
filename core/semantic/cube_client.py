from __future__ import annotations

import logging
from typing import Any

import httpx

from core.semantic.types import CubeQueryStage

logger = logging.getLogger(__name__)


class CubeClient:
    """Client for Cube.js REST API (/cubejs-api/v1)."""

    def __init__(
        self,
        base_url: str = "http://localhost:4000/cubejs-api/v1",
        api_token: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.timeout = timeout
        self._http_client: httpx.Client | None = None

    @property
    def http_client(self) -> httpx.Client:
        if self._http_client is None:
            headers = {"Content-Type": "application/json"}
            if self.api_token:
                headers["Authorization"] = self.api_token
            self._http_client = httpx.Client(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout,
            )
        return self._http_client

    def load_query(self, query: dict[str, Any], query_type: str = "regularQuery") -> dict[str, Any]:
        """Sends a query request to Cube.js /load endpoint."""
        endpoint = "/load"
        payload = {
            "query": query,
            "queryType": query_type,
        }
        try:
            response = self.http_client.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            # Cube returns 200 for continue wait, but on 4xx/5xx may return JSON error
            try:
                err_json = exc.response.json()
                if "error" in err_json:
                    return err_json
            except Exception:  # pylint: disable=broad-except
                pass
            raise
        except Exception as exc:
            logger.error("Failed to call Cube.js API /load: %s", exc)
            raise

    def parse_stage(self, resp_data: dict[str, Any], elapsed_ms: int = 0) -> CubeQueryStage:
        """Extracts and normalizes the stage/progress from a Cube continueWait response."""
        stage_raw = resp_data.get("stage")

        step = "WAITING"
        description = "Query in progress"
        progress_percent = 30.0

        if isinstance(stage_raw, dict):
            raw_stage_name = str(stage_raw.get("stage", "")).lower()
            if "pre-aggregation" in raw_stage_name or "pre_aggregation" in raw_stage_name:
                step = "BUILDING_PRE_AGGREGATIONS"
                preagg = stage_raw.get("preAggregation") or stage_raw.get("name")
                if preagg:
                    description = f"Building pre-aggregation: {preagg}"
                else:
                    description = "Building pre-aggregation cache"
                progress_percent = 50.0
            elif "waiting" in raw_stage_name:
                step = "WAITING"
                description = "Waiting in query queue"
                progress_percent = 20.0
            elif "executing" in raw_stage_name or "query" in raw_stage_name:
                step = "EXECUTING_QUERY"
                description = "Executing query on database"
                progress_percent = 75.0
            else:
                step = "PROCESSING"
                description = stage_raw.get("stage") or "Processing query"
                progress_percent = 40.0

            if "progress" in stage_raw:
                try:
                    progress_percent = float(stage_raw["progress"])
                except (ValueError, TypeError):
                    pass

        elif isinstance(stage_raw, str):
            lower_stage = stage_raw.lower()
            if "pre-aggregation" in lower_stage or "pre_aggregation" in lower_stage:
                step = "BUILDING_PRE_AGGREGATIONS"
                description = stage_raw
                progress_percent = 50.0
            elif "executing" in lower_stage:
                step = "EXECUTING_QUERY"
                description = stage_raw
                progress_percent = 75.0
            else:
                step = "WAITING"
                description = stage_raw
                progress_percent = 25.0

        return CubeQueryStage(
            step=step,
            description=description,
            progress_percent=progress_percent,
            elapsed_ms=elapsed_ms,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client."""
        if self._http_client is not None:
            self._http_client.close()
            self._http_client = None
