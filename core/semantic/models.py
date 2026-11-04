"""SemanticLayer / SemanticView models, ported from superset/semantic_layers/models.py.

Superset binds each layer to a provider SDK implementation; here every layer is
a Cube.js deployment and each view is one Cube (``Orders``). The view's members
come from its ``configuration`` (Cube ``/meta`` shape, see ``SemanticView.cube_meta``).
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Hashable
from dataclasses import dataclass
from typing import Any, TYPE_CHECKING

import pandas as pd
import sqlalchemy as sa
from flask import current_app
from flask_appbuilder import Model
from flask_babel import gettext as _
from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy_utils import JSONType, UUIDType

from core.errors import CommonErrorType, CoreError, ErrorLevel
from core.exceptions import (
    CoreSecurityException,
    InvalidPostProcessingError,
    QueryObjectValidationError,
)
from core.explorables.base import TimeGrainDict
from core.models.helpers import AuditMixinNullable, QueryResult
from core.semantic.bridge import CubeQueryBridge
from core.semantic.cube_client import CubeClient
from core.semantic.mapper import get_results, TIME_GRAIN_TO_CUBE_GRANULARITY
from core.semantic.mock_cube_client import MockCubeClient
from core.utils.core import GenericDataType

if TYPE_CHECKING:
    from core.common.query.object import QueryObject
    from core.type_defs import ExplorableData, QueryObjectDict

logger = logging.getLogger(__name__)

# Cube member types → generic chart types.
CUBE_TYPE_TO_GENERIC: dict[str, GenericDataType] = {
    "number": GenericDataType.NUMERIC,
    "count": GenericDataType.NUMERIC,
    "sum": GenericDataType.NUMERIC,
    "avg": GenericDataType.NUMERIC,
    "min": GenericDataType.NUMERIC,
    "max": GenericDataType.NUMERIC,
    "countDistinct": GenericDataType.NUMERIC,
    "time": GenericDataType.TEMPORAL,
    "boolean": GenericDataType.BOOLEAN,
    "string": GenericDataType.STRING,
}


@dataclass(frozen=True)
class MetricMetadata:
    metric_name: str
    expression: str
    verbose_name: str | None = None
    description: str | None = None
    d3format: str | None = None
    currency: dict[str, Any] | None = None
    warning_text: str | None = None
    certified_by: str | None = None
    certification_details: str | None = None


@dataclass(frozen=True)
class ColumnMetadata:
    column_name: str
    type: str
    is_dttm: bool
    verbose_name: str | None = None
    description: str | None = None
    groupby: bool = True
    filterable: bool = True
    expression: str | None = None
    python_date_format: str | None = None
    advanced_data_type: str | None = None
    extra: str | None = None


def _access_error() -> CoreSecurityException:
    return CoreSecurityException(
        CoreError(
            error_type=CommonErrorType.DATASOURCE_SECURITY_ACCESS_ERROR,
            message=str(_("You don't have access to this semantic view.")),
            level=ErrorLevel.ERROR,
        )
    )


def _can_access(permission_name: str, view_name: str | None) -> bool:
    """FAB permission check; outside a request (CLI, tests) access is not gated."""
    if not view_name:
        return False
    from core.extension import appbuilder  # pylint: disable=import-outside-toplevel

    sm = getattr(appbuilder, "sm", None)
    if sm is None:
        return True
    return bool(sm.has_access(permission_name, view_name))


class SemanticLayer(AuditMixinNullable, Model):
    """A semantic layer: one Cube.js deployment (``configuration`` holds base_url / api_token)."""

    __tablename__ = "semantic_layers"

    uuid = Column(UUIDType(binary=True), primary_key=True, default=uuid.uuid4)

    name = Column(String(250), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(250), nullable=False, default="cube")

    # TODO(port): Superset encrypts this column (encrypted_field_factory).
    configuration = Column(JSONType, default=dict)
    configuration_version = Column(Integer, nullable=False, default=1)
    cache_timeout = Column(Integer, nullable=True)

    perm = Column(String(1000), nullable=True)

    semantic_views = relationship(
        "SemanticView",
        back_populates="semantic_layer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return self.name or str(self.uuid)

    def get_perm(self) -> str:
        """Compute the permission string for this semantic layer."""
        return f"[{self.name}](id:{self.uuid.hex})"

    def raise_for_access(self) -> None:
        if _can_access("all_datasource_access", "all_datasource_access"):
            return
        if _can_access("datasource_access", self.perm):
            return
        raise _access_error()

    @property
    def implementation(self) -> CubeQueryBridge:
        """The provider binding; Superset returns the layer's SDK implementation."""
        if current_app.config.get("CUBE_MOCK"):
            return CubeQueryBridge(cube_client=MockCubeClient())
        config = self.configuration or {}
        client_kwargs = {k: config[k] for k in ("base_url", "api_token") if k in config}
        return CubeQueryBridge(cube_client=CubeClient(**client_kwargs))


class SemanticView(AuditMixinNullable, Model):
    """A queryable view within a semantic layer: one Cube."""

    __tablename__ = "semantic_views"

    supports_samples: bool = False
    supports_drill_to_detail: bool = False

    fetch_values_predicate: None = None

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUIDType(binary=True), unique=True, default=uuid.uuid4)

    name = Column(String(250), nullable=False)
    description = Column(Text, nullable=True)

    # Cube /meta for this cube: {"measures": [...], "dimensions": [...],
    # "preferred_temporal_dimension": "..."}; members are {"name", "title",
    # "type", "description", "format"}.
    configuration = Column(JSONType, default=dict)
    configuration_version = Column(Integer, nullable=False, default=1)
    cache_timeout = Column(Integer, nullable=True)

    perm = Column(String(1000), nullable=True)

    semantic_layer_uuid = Column(
        UUIDType(binary=True),
        ForeignKey("semantic_layers.uuid", ondelete="CASCADE"),
        nullable=False,
    )
    semantic_layer = relationship(
        "SemanticLayer",
        back_populates="semantic_views",
        foreign_keys=[semantic_layer_uuid],
    )

    def __repr__(self) -> str:
        return self.name or str(self.uuid)

    def get_perm(self, layer_name: str | None = None) -> str:
        """Compute the permission string for this semantic view."""
        if layer_name is None:
            layer_name = self.semantic_layer.name if self.semantic_layer else "unknown"
        return f"[{layer_name}].[{self.name}](id:{self.id})"

    # ------------------------------------------------------------------
    # Explorable protocol implementation
    # ------------------------------------------------------------------

    @property
    def implementation(self) -> CubeQueryBridge:
        return self.semantic_layer.implementation

    def get_query_result(self, query_object: QueryObject) -> QueryResult:
        # Progress streams over Redis → WebSocket to the caller's channel, when given.
        channel_id = query_object.extras.get("channel_id") or f"semantic_view:{self.id}"
        result: QueryResult = get_results(query_object, self.implementation, channel_id)
        if query_object.post_processing and not result.df.empty:
            try:
                result.df = query_object.exec_post_processing(result.df)
            except InvalidPostProcessingError as ex:
                raise QueryObjectValidationError(ex.message) from ex
            except (TypeError, pd.errors.DataError) as ex:
                raise QueryObjectValidationError(str(ex)) from ex
        return result

    def get_query_str(self, query_obj: QueryObjectDict) -> str:
        """Reject previews because provider queries are returned with chart data."""
        raise QueryObjectValidationError(
            _(
                "A semantic view's provider query is produced when the chart runs "
                "and returned with its data."
            )
        )

    @property
    def cube_meta(self) -> dict[str, Any]:
        return self.configuration or {}

    @property
    def table_name(self) -> str:
        return self.name

    @property
    def kind(self) -> str:
        return "semantic_view"

    @property
    def uid(self) -> str:
        return f"{self.id}__semantic_view"

    @property
    def type(self) -> str:
        return "semantic_view"

    @property
    def metrics(self) -> list[MetricMetadata]:
        return [
            MetricMetadata(
                metric_name=measure["name"],
                expression=measure["name"],
                verbose_name=measure.get("title"),
                description=measure.get("description"),
                d3format=measure.get("format"),
            )
            for measure in self.cube_meta.get("measures", [])
        ]

    @property
    def columns(self) -> list[ColumnMetadata]:
        return [
            ColumnMetadata(
                column_name=dimension["name"],
                type=dimension.get("type", "string"),
                is_dttm=dimension.get("type") == "time",
                verbose_name=dimension.get("title"),
                description=dimension.get("description"),
            )
            for dimension in self.cube_meta.get("dimensions", [])
        ]

    @property
    def column_names(self) -> list[str]:
        return [column.column_name for column in self.columns]

    def _verbose_map(self) -> dict[str, str]:
        # Only exposed through ``data``: a ``verbose_map`` attribute would make
        # QueryObject.metric_names relabel results (Superset's SemanticView has none).
        verbose_map = {"__timestamp": "Time"}
        for member in (*self.metrics, *self.columns):
            name = getattr(member, "metric_name", None) or getattr(member, "column_name")
            verbose_map[name] = member.verbose_name or name
        return verbose_map

    @property
    def main_dttm_col(self) -> str | None:
        """Return the preferred exposed temporal dimension for backend and UI."""
        temporal = [column.column_name for column in self.columns if column.is_dttm]
        preferred = self.cube_meta.get("preferred_temporal_dimension")
        if preferred is None:
            return temporal[0] if len(temporal) == 1 else None
        if preferred not in temporal:
            logger.warning(
                "Semantic view %s preferred_temporal_dimension %r is not an "
                "exposed temporal dimension",
                self.name,
                preferred,
            )
            return None
        return preferred

    @property
    def data(self) -> ExplorableData:
        return {
            "id": self.id,
            "uid": self.uid,
            "type": self.type,
            "datasource_name": self.name,
            "name": self.name,
            "description": self.description,
            "main_dttm_col": self.main_dttm_col,
            "cache_timeout": self.cache_timeout,
            "offset": self.offset,
            "verbose_map": self._verbose_map(),
            "columns": [vars(column) for column in self.columns],
            "metrics": [vars(metric) for metric in self.metrics],
            "column_names": self.column_names,
            "time_grain_sqla": [
                (grain["duration"], grain["name"]) for grain in self.get_time_grains()
            ],
            "select_star": None,
            "sql": None,
            "is_sqllab_view": False,
            "health_check_message": None,
        }  # type: ignore[typeddict-unknown-key]

    def data_for_slices(self, slices: list[Any]) -> ExplorableData:
        return self.data

    def get_extra_cache_keys(self, query_obj: QueryObjectDict) -> list[Hashable]:
        # Superset keys on the layer's metadata generation; the configuration
        # version plays that role here.
        return [f"semantic-config-v{self.configuration_version}"]

    @property
    def catalog_perm(self) -> str | None:
        return None

    @property
    def schema_perm(self) -> str | None:
        return None

    @property
    def schema(self) -> str | None:
        return None

    @property
    def url(self) -> str:
        return f"/semantic_view/{self.uuid}/"

    @property
    def explore_url(self) -> str:
        return f"/explore/?datasource_type=semantic_view&datasource_id={self.id}"

    @property
    def offset(self) -> int:
        return 0

    def get_time_grains(self) -> list[TimeGrainDict]:
        if not any(column.is_dttm for column in self.columns):
            return []
        return [
            {"name": granularity.capitalize(), "function": "", "duration": duration}
            for duration, granularity in TIME_GRAIN_TO_CUBE_GRANULARITY.items()
        ]

    def has_drill_by_columns(self, column_names: list[str]) -> bool:
        dimension_names = set(self.column_names)
        return all(column_name in dimension_names for column_name in column_names)

    @property
    def is_rls_supported(self) -> bool:
        return False

    def raise_for_access(self) -> None:
        """Check that the user has access to this semantic view."""
        if _can_access("all_datasource_access", "all_datasource_access"):
            return
        if _can_access("datasource_access", self.perm):
            return
        layer_perm = self.semantic_layer.perm if self.semantic_layer else ""
        if _can_access("datasource_access", layer_perm):
            return
        raise _access_error()

    @property
    def query_language(self) -> str | None:
        return None

    def get_compatible_metrics(
        self, selected_metrics: list[str], selected_dimensions: list[str]
    ) -> list[str]:
        # A single cube's members are always mutually compatible.
        return [metric.metric_name for metric in self.metrics]

    def get_compatible_dimensions(
        self, selected_metrics: list[str], selected_dimensions: list[str]
    ) -> list[str]:
        return self.column_names


def _layer_set_perm(_mapper: Any, _connection: Any, target: SemanticLayer) -> None:
    if target.uuid is None:  # the column default only applies during the INSERT
        target.uuid = uuid.uuid4()
    target.perm = target.get_perm()


def _view_set_perm(_mapper: Any, _connection: Any, target: SemanticView) -> None:
    if target.id is not None:
        target.perm = target.get_perm()


def _view_after_insert(_mapper: Any, connection: Any, target: SemanticView) -> None:
    # The perm string embeds the id, which only exists once the row is inserted.
    target.perm = target.get_perm()
    connection.execute(
        SemanticView.__table__.update()
        .where(SemanticView.__table__.c.id == target.id)
        .values(perm=target.perm)
    )


sa.event.listen(SemanticLayer, "before_insert", _layer_set_perm)
sa.event.listen(SemanticLayer, "before_update", _layer_set_perm)
sa.event.listen(SemanticView, "before_update", _view_set_perm)
sa.event.listen(SemanticView, "after_insert", _view_after_insert)
