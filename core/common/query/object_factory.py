"""QueryObjectFactory, ported from superset/common/query_object_factory.py."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TYPE_CHECKING

from core.common.chart.data import ChartDataResultType
from core.common.query.object import DEPRECATED_FIELDS, QueryObject
from core.common.utils.time_range_utils import (
    get_since_until_from_time_range,
    get_time_range_from_filters,
)
from core.type_defs import Column
from core.utils.core import (
    apply_max_row_limit,
    DatasourceDict,
    DatasourceType,
    QueryObjectFilterClause,
)

if TYPE_CHECKING:
    from core.daos.datasource import DatasourceDAO
    from core.explorables.base import Explorable


class QueryObjectFactory:  # pylint: disable=too-few-public-methods
    _config: dict[str, Any]
    _datasource_dao: DatasourceDAO

    def __init__(
        self,
        app_configurations: dict[str, Any],
        _datasource_dao: DatasourceDAO,
    ):
        self._config = app_configurations
        self._datasource_dao = _datasource_dao

    def create(  # pylint: disable=too-many-arguments
        self,
        parent_result_type: ChartDataResultType,
        datasource: DatasourceDict | None = None,
        extras: dict[str, Any] | None = None,
        row_limit: int | None = None,
        time_range: str | None = None,
        time_shift: str | None = None,
        server_pagination: bool | None = None,
        datasource_model_instance: Explorable | None = None,
        preserve_null_row_limit: bool = False,
        **kwargs: Any,
    ) -> QueryObject:
        if datasource_model_instance is None and datasource:
            datasource_model_instance = self._convert_to_model(datasource)
        # Request-only flags from the client; not part of the stored query.
        if isinstance(extras, Mapping) and "preserve_literal_values" in extras:
            extras = {
                key: value
                for key, value in extras.items()
                if key != "preserve_literal_values"
            }
        if isinstance(filters := kwargs.get("filters"), (list, tuple)) and any(
            isinstance(predicate, Mapping) and "is_literal" in predicate
            for predicate in filters
        ):
            kwargs["filters"] = [
                {key: value for key, value in predicate.items() if key != "is_literal"}
                if isinstance(predicate, Mapping) and "is_literal" in predicate
                else predicate
                for predicate in filters
            ]
        processed_extras = self._process_extras(extras)
        result_type = kwargs.setdefault("result_type", parent_result_type)

        # Process deprecated fields before row limit so the canonical names win.
        for field in DEPRECATED_FIELDS:
            if old_val := kwargs.pop(field.old_name, None):
                kwargs.setdefault(field.new_name, old_val)

        row_limit = self._process_row_limit(
            row_limit,
            result_type,
            server_pagination=server_pagination,
            preserve_null_row_limit=preserve_null_row_limit,
        )

        processed_time_range = self._process_time_range(
            time_range, kwargs.get("filters"), kwargs.get("columns")
        )
        from_dttm, to_dttm = get_since_until_from_time_range(
            processed_time_range, time_shift, processed_extras
        )
        kwargs["from_dttm"] = from_dttm
        kwargs["to_dttm"] = to_dttm
        return QueryObject(
            datasource=datasource_model_instance,
            extras=extras,
            row_limit=row_limit,
            time_range=time_range,
            time_shift=time_shift,
            **kwargs,
        )

    def _convert_to_model(self, datasource: DatasourceDict) -> Explorable:
        return self._datasource_dao.get_datasource(
            datasource_type=DatasourceType(datasource["type"]),
            database_id_or_uuid=datasource["id"],
        )

    def _process_extras(
        self,
        extras: dict[str, Any] | None,
    ) -> dict[str, Any]:
        extras = extras or {}
        return extras

    def _process_row_limit(
        self,
        row_limit: int | None,
        result_type: ChartDataResultType,
        server_pagination: bool | None = None,
        preserve_null_row_limit: bool = False,
    ) -> int | None:
        """Process row limit taking into account server pagination.

        An explicit null means "no limit" only when ``preserve_null_row_limit``.
        """
        if row_limit is None and preserve_null_row_limit:
            return None

        default_row_limit = (
            self._config["SAMPLES_ROW_LIMIT"]
            if result_type == ChartDataResultType.SAMPLES
            else self._config["ROW_LIMIT"]
        )
        return apply_max_row_limit(
            row_limit or default_row_limit,
            server_pagination=server_pagination,
        )

    @staticmethod
    def _process_time_range(
        time_range: str | None,
        filters: list[QueryObjectFilterClause] | None = None,
        columns: list[Column] | None = None,
    ) -> str:
        return get_time_range_from_filters(time_range, filters, columns)
