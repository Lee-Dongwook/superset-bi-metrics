from __future__ import annotations

import json
import random
from itertools import product
from typing import Any

import pandas as pd

from core.semantic.cube_client import CubeClient

# Example "Orders" cube, mirrors what semantic/model/orders.yml will define for real Cube.
ORDERS_MEASURES = {"Orders.count", "Orders.totalAmount"}
ORDERS_STATUSES = ["completed", "processing", "shipped"]
ORDERS_TIME_DIMENSION = "Orders.createdAt"
GRANULARITY_FREQ = {"day": "D", "week": "W-MON", "month": "MS"}
DEFAULT_DATE_RANGE = ["2026-01-01", "2026-06-30"]

# Continue-wait responses replayed before data, in the shape Cube's /load returns.
STAGES: list[dict[str, Any]] = [
    {"stage": "Waiting for query"},
    {"stage": "Building pre-aggregations", "preAggregation": "Orders.monthlyRollup"},
    {"stage": "Executing query"},
]


class MockCubeClient(CubeClient):
    """Stands in for Cube.js /load: replays continue-wait stages, then returns deterministic Orders rows."""

    def __init__(self) -> None:
        super().__init__()
        self._polls: dict[str, int] = {}

    def load_query(self, query: dict[str, Any], query_type: str = "regularQuery") -> dict[str, Any]:
        unknown = self._unknown_members(query)
        if unknown:
            return {"error": f"Unknown members for Orders cube: {', '.join(unknown)}"}

        # ponytail: in-memory poll counter per query shape, fine for a single-process mock
        key = json.dumps(query, sort_keys=True)
        poll = self._polls.get(key, 0)
        if poll < len(STAGES):
            self._polls[key] = poll + 1
            return {"error": "Continue wait", "stage": STAGES[poll]}

        self._polls.pop(key, None)
        return {"query": query, "data": self._rows(query)}

    @staticmethod
    def _unknown_members(query: dict[str, Any]) -> list[str]:
        members = [*query.get("measures", []), *query.get("dimensions", [])]
        members += [td.get("dimension") for td in query.get("timeDimensions", [])]
        allowed = ORDERS_MEASURES | {"Orders.status", ORDERS_TIME_DIMENSION}
        return [m for m in members if m not in allowed]

    @staticmethod
    def _rows(query: dict[str, Any]) -> list[dict[str, Any]]:
        axes: list[tuple[str, list[str]]] = []
        for td in query.get("timeDimensions", []):
            granularity = td.get("granularity")
            if granularity not in GRANULARITY_FREQ:
                continue  # Cube treats a time dimension without granularity as a filter only
            start, end = td.get("dateRange") or DEFAULT_DATE_RANGE
            buckets = pd.date_range(start, end, freq=GRANULARITY_FREQ[granularity])
            axes.append(
                (f"{ORDERS_TIME_DIMENSION}.{granularity}", [b.strftime("%Y-%m-%dT%H:%M:%S.000") for b in buckets])
            )
        if "Orders.status" in query.get("dimensions", []):
            axes.append(("Orders.status", ORDERS_STATUSES))

        rows = []
        for combo in product(*(values for _, values in axes)):
            row: dict[str, Any] = dict(zip((name for name, _ in axes), combo))
            rng = random.Random("|".join(combo))
            count = rng.randint(50, 500)
            # Cube serializes measures as strings
            if "Orders.count" in query.get("measures", []):
                row["Orders.count"] = str(count)
            if "Orders.totalAmount" in query.get("measures", []):
                row["Orders.totalAmount"] = f"{count * rng.uniform(20, 80):.2f}"
            rows.append(row)
        return rows
