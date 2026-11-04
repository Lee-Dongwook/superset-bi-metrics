"""Time range helpers, ported from superset/common/utils/time_range_utils.py."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any, cast, TYPE_CHECKING

from flask import current_app

from core.constants import NO_TIME_RANGE
from core.utils.core import FilterOperator, get_x_axis_label
from core.utils.date_parser import get_since_until

if TYPE_CHECKING:
    from core.common.query.object import QueryObject
    from core.type_defs import Column


def get_time_range_from_filters(
    time_range: str | None,
    filters: Sequence[Mapping[str, object]] | None,
    columns: list[Column] | None,
) -> str:
    """Select the original range expression without evaluating relative dates."""
    if time_range is not None:
        return time_range
    temporal_filters: list[Mapping[str, object]] = [
        filter_
        for filter_ in filters or []
        if filter_.get("op") == FilterOperator.TEMPORAL_RANGE
        and isinstance(filter_.get("val"), str)
    ]
    if not temporal_filters:
        return NO_TIME_RANGE
    x_axis_label: str | None = get_x_axis_label(columns)
    selected: Mapping[str, object] = next(
        (filter_ for filter_ in temporal_filters if filter_.get("col") == x_axis_label),
        temporal_filters[0],
    )
    return cast(str, selected.get("val"))


def get_since_until_from_time_range(
    time_range: str | None = None,
    time_shift: str | None = None,
    extras: dict[str, Any] | None = None,
) -> tuple[datetime | None, datetime | None]:
    # Superset config defaults are "today"; core/config.py may not define them.
    return get_since_until(
        relative_start=(extras or {}).get(
            "relative_start",
            current_app.config.get("DEFAULT_RELATIVE_START_TIME", "today"),
        ),
        relative_end=(extras or {}).get(
            "relative_end",
            current_app.config.get("DEFAULT_RELATIVE_END_TIME", "today"),
        ),
        time_range=time_range,
        time_shift=time_shift,
        instant_time_comparison_range=(extras or {}).get(
            "instant_time_comparison_range"
        ),
    )


# pylint: disable=invalid-name
def get_since_until_from_query_object(
    query_object: QueryObject,
) -> tuple[datetime | None, datetime | None]:
    """
    Return (since, until) from the query object's time_range, or else from the
    last `temporal_range` adhoc filter.
    """
    if query_object.time_range:
        return get_since_until_from_time_range(
            time_range=query_object.time_range,
            time_shift=query_object.time_shift,
            extras=query_object.extras,
        )

    time_range = None
    for flt in query_object.filter:
        if flt.get("op") == FilterOperator.TEMPORAL_RANGE and isinstance(
            flt.get("val"), str
        ):
            time_range = cast(str, flt.get("val"))

    return get_since_until_from_time_range(
        time_range=time_range,
        time_shift=query_object.time_shift,
        extras=query_object.extras,
    )
