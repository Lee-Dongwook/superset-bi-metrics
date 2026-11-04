from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from flask_babel import gettext as _

logger = logging.getLogger(__name__)
CHART_TYPE = "CHART"

class DashboardFilterStatus(str, Enum):
    APPLIED = "applied"
    NOT_APPLIED = "not_applied"
    NOT_APPLIED_USES_DEFAULT_TO_FIRST_ITEM_PREQUERY = (
        "not_applied_uses_default_to_first_item_prequery"
    )

@dataclass
class DashboardFilterInfo:
    id: str
    name: str
    status: DashboardFilterStatus
    column: str | None = None


@dataclass
class DashboardFilterContext:
    extra_form_data: dict[str, Any] = field(default_factory=dict)
    filters: list[DashboardFilterInfo] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "filters": [
                {
                    "id": f.id,
                    "name": f.name,
                    "status": f.status.value,
                    **({"column": f.column} if f.column else {}),
                }
                for f in self.filters
            ],
        }

def _find_chart_layout_item(
    chart_id: int,
    position_json: dict[str, Any],
) -> dict[str, Any] | None:
    for item in position_json.values():
        if not isinstance(item, dict):
            continue
        if (
            item.get("type") == CHART_TYPE
            and item.get("meta", {}).get("chartId") == chart_id
        ):
            return item
    return None


def _is_filter_in_scope_for_chart(
    filter_config: dict[str, Any],
    chart_id: int,
    position_json: dict[str, Any],
) -> bool:
    scope = filter_config.get("scope", {})
    root_path: list[str] = scope.get("rootPath", [])
    excluded: list[int] = scope.get("excluded", [])

    if chart_id in excluded:
        return False
    
    if chart_layout_item := _find_chart_layout_item(chart_id, position_json):
        parents: list[str] = chart_layout_item.get("parents", [])
        return any(parent in root_path for parent in parents)

    return "ROOT_ID" in root_path

def _merge_extra_form_data(
    base: dict[str, Any],
    new: dict[str, Any],
) -> dict[str, Any]:
    append_keys = EXTRA_FORM_DATA_APPEND_KEYS - {"custom_form_data"}
    override_keys = (
        set(EXTRA_FORM_DATA_OVERRIDE_REGULAR_MAPPINGS.keys())
        | EXTRA_FORM_DATA_OVERRIDE_EXTRA_KEYS
    )

    merged: dict[str, Any] = {}

    for key in append_keys:
        base_value = base.get(key, [])
        new_value = new.get(key, [])

        combined = list(base_value) + list(new_value)
        if combined:
            merged[key] = combined
    
    base_custom = base.get("custom_form_data") or {}
    new_custom = new.get("custom_form_data") or {}

    if isinstance(base_custom, dict) and isinstance(new_custom, dict):
        merged_custom = dict(base_custom)   
        for key, value in new_custom.items():
            if(
                key in merged_custom
                and isinstance(merged_custom[key], list)
                and isinstance(value, list)
            ):
                merged_custom[key] = merged_custom[key] + value
            else:
                merged_custom[key] = value
        if merged_custom:
            merged["custom_form_data"] = merged_custom
    
    for key in override_keys:
        if key in new:
            merged[key] = new[key]
        elif key in base:
            merged[key] = base[key]
    
    return merged

def _extract_filter_extra_form_data(
    filter_config: dict[str, Any],
) -> tuple[dict[str, Any] | None, DashboardFilterStatus]:
    default_data_mask = filter_config.get("defaultDataMask", {})
    control_values = filter_config.get("controlValues", {})

    extra_form_data = default_data_mask.get("extraFormData")
    filter_state = default_data_mask.get("filterState", {})
    has_static_default = filter_state.get("value") is not None

    if control_values.get("defaultToFirstItem"):
        return (
            None,
            DashboardFilterStatus.NOT_APPLIED_USES_DEFAULT_TO_FIRST_ITEM_PREQUERY,
        )

    if has_static_default and extra_form_data:
        return extra_form_data, DashboardFilterStatus.APPLIED

    return None, DashboardFilterStatus.NOT_APPLIED

def _resolve_filter_extra_form_data(
    filter_config: dict[str, Any],
    active_data_mask: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, DashboardFilterStatus]:
    filter_id = filter_config.get("id", "")
    if active_data_mask is not None and filter_id in active_data_mask:
        active_efd = (active_data_mask[filter_id] or {}).get("extraFormData") or {}
        if active_efd:
            return active_efd, DashboardFilterStatus.APPLIED
        return None, DashboardFilterStatus.NOT_APPLIED
    return _extract_filter_extra_form_data(filter_config)

def _get_filter_target_column(filter_config: dict[str, Any]) -> str | None:
    if targets := filter_config.get("targets", []):
        column = targets[0].get("column", {})
        if isinstance(column, dict):
            return column.get("name")
        if isinstance(column, str):
            return column
    return None

def _validate_chart_on_dashboard(
    dashboard: Dashboard,
    chart_id: int,
) -> None:
    slice_ids = {slc.id for slc in dashboard.slices}
    if chart_id not in slice_ids:
        raise ValueError(
            _(
                "Chart %(chart_id)s is not on dashboard %(dashboard_id)s",
                chart_id=chart_id,
                dashboard_id=dashboard.id,
            )
        )

def _check_dashboard_access(dashboard: Dashboard) -> None:
    security_manager.raise_for_access(dashboard=dashboard)


def get_dashboard_filter_context(
    dashboard_id: int,
    chart_id: int,
    *,
    active_data_mask: dict[str, Any] | None = None,
) -> DashboardFilterContext:
    dashboard = db.session.query(Dashboard).filter_by(id=dashboard_id).one_or_none()
    if not dashboard:
        raise ValueError(
            _("Dashboard %(dashboard_id)s not found", dashboard_id=dashboard_id)
        )

    _check_dashboard_access(dashboard)
    _validate_chart_on_dashboard(dashboard, chart_id)

    metadata = json.loads(dashboard.json_metadata or "{}")
    native_filter_config: list[dict[str, Any]] = metadata.get(
        "native_filter_configuration", []
    )

    position_json: dict[str, Any] = json.loads(dashboard.position_json or "{}")

    context = DashboardFilterContext()

    for flt in native_filter_config:
        flt_type = flt.get("type", "")
        if flt_type == "DIVIDER":
            continue

        if not _is_filter_in_scope_for_chart(flt, chart_id, position_json):
            continue

        flt_id = flt.get("id", "")
        flt_name = flt.get("name", "")
        target_column = _get_filter_target_column(flt)
        extra_form_data, status = _resolve_filter_extra_form_data(flt, active_data_mask)

        if extra_form_data and status == DashboardFilterStatus.APPLIED:
            context.extra_form_data = _merge_extra_form_data(
                context.extra_form_data, extra_form_data
            )

        context.filters.append(
            DashboardFilterInfo(
                id=flt_id,
                name=flt_name,
                status=status,
                column=target_column,
            )
        )

    return context

def mark_dashboard_time_range_filters(
    filters: list[QueryObjectFilterClause],
) -> None:
    for filter_ in filters:
        if not isinstance(filter_, dict):
            continue  
        saved: object = filter_.get("val")
        if filter_.get("op") == "TEMPORAL_RANGE" and (
            saved is None or (isinstance(saved, str) and is_no_time_range(saved))
        ):
            filter_["isExtra"] = True

def apply_dashboard_filter_context(  # noqa: C901
    query_context: dict[str, Any],
    extra_form_data: dict[str, Any],
) -> None:
    extra_filters = extra_form_data.pop("filters", [])
    for query in query_context.get("queries", []):
        if extra_filters:
            existing_filters = query.get("filters") or []
            query["filters"] = existing_filters + [
                {**flt, "isExtra": True} for flt in extra_filters
            ]

        extras = query.get("extras") or {}
        for key in EXTRA_FORM_DATA_OVERRIDE_EXTRA_KEYS:
            if key in extra_form_data:
                extras[key] = extra_form_data[key]
    
        if custom_time_grain := extra_form_data.get("time_grain_sqla"):
            extras["time_grain_sqla"] = custom_time_grain
            apply_time_grain_to_base_axis(query, custom_time_grain)

        if extras:
            query["extras"] = extras

        for src_key, target_key in EXTRA_FORM_DATA_OVERRIDE_REGULAR_MAPPINGS.items():
            if src_key in extra_form_data:
                query[target_key] = extra_form_data[src_key]
                if src_key == "time_range" and extra_form_data[src_key]:
                    mark_dashboard_time_range_filters(query.get("filters") or [])

        query["extra_form_data"] = extra_form_data
