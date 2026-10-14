from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CubeQueryStage:
    step: str  # e.g., "DISPATCHED", "WAITING", "BUILDING_PRE_AGGREGATIONS", "EXECUTING_QUERY", "COMPLETED"
    description: str
    progress_percent: float = 0.0
    elapsed_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step,
            "description": self.description,
            "progress_percent": round(self.progress_percent, 1),
            "elapsed_ms": self.elapsed_ms,
        }


@dataclass
class CubeQueryEvent:
    channel_id: str
    query_id: str
    status: str  # e.g., "pending", "running", "success", "failed", "timed_out"
    stage: CubeQueryStage | None = None
    result_url: str | None = None
    error: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "channel_id": self.channel_id,
            "query_id": self.query_id,
            "status": self.status.upper(),
            "result_url": self.result_url,
            "error": self.error,
        }
        if self.stage:
            data["stage"] = self.stage.to_dict()
        else:
            data["stage"] = None

        if self.extra:
            data.update(self.extra)
        return data

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)
