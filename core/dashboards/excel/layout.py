from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from ...common_models import Slice

CHART_TYPE = "CHART"
ROOT_ID = "ROOT_ID"

def _walk_chart_ids(position: dict[str, Any]) -> list[int]:
    if ROOT_ID not in position:
        return []
    
    ordered: list[int] = []
    seen_charts: set[int] = set()
    visited_nodes: set[str] = set()
    stack: list[str] = [ROOT_ID]

    while stack:
        node_id = stack.pop()
        if node_id in visited_nodes:
            continue
        visited_nodes.add(node_id)

        node = position.get(node_id)
        if not isinstance(node, dict):
            continue

        if node.get("type") == CHART_TYPE:
            chart_id = node.get("meta", {}).get("chartId")
            if isinstance(chart_id, int) and chart_id not in seen_charts:
                seen_charts.add(chart_id)
                ordered.append(chart_id)
        
        children = node.get("children", [])
        for child_id in reversed(children):
            stack.append(child_id)
    
    return ordered

def get_charts_in_layout_order(dashboard: Dashboard) -> list[Slice]:
    slices_by_id: dict[int, Slice] = {slc.id: slc for slc in dashboard.slices}

    result: list[Slice] = []
    used: set[int] = set()

    for chart_id in _walk_chart_ids(dashboard.position):
        slc = slices_by_id.get(chart_id)
        if slc is not None and chart_id not in used:
            used.add(chart_id)
            result.append(slc)
    
    orphans = sorted(
        (slc for chart_id, slc in slices_by_id.items() if chart_id not in used),
        key=lambda slc: slc.id,
    )

    result.extend(orphans)
    return result
