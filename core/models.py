from __future__ import annotations

import builtins
import json
import logging
from re import M
import textwrap
import threading
from ast import literal_eval, parse
from contextlib import (
    AbstractContextManager,
    closing,
    contextmanager,
    ExitStack,
    nullcontext,
    suppress,
)
from copy import deepcopy
from datetime import datetime
from functools import lru_cache
from inspect import signature
from typing import Any, Callable, Sequence, cast, Iterator, Optional, TYPE_CHECKING, TypeVar
from core import utils
import numpy
import pandas as pd
import sqlalchemy as sqla
import sshtunnel
from flask import current_app as app, g, has_app_context
from flask_appbuilder import Model
from marshmallow.exceptions import ValidationError
from sqlalchemy import (
    Boolean,
    Column,
    create_engine,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table as SqlaTable,
    Text,
)
from sqlalchemy.engine import Connection, Dialect, Engine
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.engine.url import URL
from sqlalchemy.exc import NoSuchModuleError
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapper, relationship
from sqlalchemy.pool import NullPool
from sqlalchemy.schema import UniqueConstraint
from sqlalchemy.sql import ColumnElement, expression, Select

logger = logging.getLogger(__name__)
T = TypeVar("T")

_ENGINE_CACHE: dict[tuple[int, str, str], Engine] = {}
_ENGINE_CACHE_LOCK = threading.Lock()

class CssTemplate(AuditMixinNullable, UUIDMixin, Model):
    __tablename__ = "css_templates"
    id = Column(Integer, primary_key=True)
    template_name = Column(String(256))
    css = Column(utils.MediumText(), default="")

class Slice(
    CoreChart, SoftDeleteMixin, AuditMixinNullable, ImportExportMixin
):
    query_context_factory: QueryContextFactory | None = None

    __tablename__ = "slices"
    __table_args__: tuple[sqla.Index, ...] = (
        sqla.Index(
            "ix_slices_datasource_type_datasource_id",
            "datasource_type",
            "datasource_id",
        ),
    )

    __versioned__: dict[str, Any] = {
        "exclude": [
            "query_context",
            "owners",
            "editors",
            "viewers",
            "dashboards",
            "changed_on",
            "created_on",
            "changed_by_fk",
            "created_by_fk",
            "last_saved_at",
            "last_saved_by_fk",
            "perm",
            "schema_perm",
            "catalog_perm",
            "deleted_at",
        ]
    }

    id = Column(Integer, primary_key = True)
    slice_name = Column(String(256))
    datasource_id = Column(Integer)
    datasource_type = Column(String(256))
    datasource_name = Column(String(2000))
    viz_type = Column(String(256))
    params = Column(utils.MediumText())
    query_context = Column(utils.MediumText())
    description = Column(Text)
    cache_timeout = Column(Integer)
    perm = Column(String(1000))
    schema_perm = Column(String(1000))
    catalog_perm = Column(String(1000), nullable=True, default=None)
    last_saved_at = Column(DateTime, nullable=True)
    last_saved_by_fk = Column(Integer, ForeignKey("ab_user.id"), nullable=True)
    certified_by = Column(Text)
    certification_details = Column(Text)
    is_managed_externally = Column(Boolean, nullable=False, default=False)
    external_url = Column(Text, nullable=True)
    last_saved_by = relationship(
        security_manager.user_model, foreign_keys=[last_saved_by_fk]
    )
    editors = relationship(
        Subject,
        secondary=chart_editors,
        passive_deletes=True,
    )
    viewers = relationship(
        Subject,
        secondary=chart_viewers,
        passive_deletes=True,
    )
    tags = relationship(
        "Tag",
        secondary="tagged_object",
        overlaps="objects,tag,tags",
        primaryjoin="and_(Slice.id == TaggedObject.object_id, "
        "TaggedObject.object_type == 'chart')",
        secondaryjoin="TaggedObject.tag_id == Tag.id",
        viewonly=True, 
    )
    table = relationship(
        "SqlaTable",
        foreign_keys=[datasource_id],
        overlaps="table",
        primaryjoin="and_(Slice.datasource_id == SqlaTable.id, "
        "Slice.datasource_type == 'table')",
        remote_side="SqlaTable.id",
        lazy="subquery",
    )
    semantic_view = relationship(
        "SemanticView",
        foreign_keys=[datasource_id],
        primaryjoin="and_(Slice.datasource_id == SemanticView.id, "
        "Slice.datasource_type == 'semantic_view')",
        remote_side="SemanticView.id",
        viewonly=True,
        lazy="selectin",
    )
    token = ""

    export_fields = [
        "slice_name",
        "description",
        "certified_by",
        "certification_details",
        "datasource_type",
        "datasource_name",
        "viz_type",
        "params",
        "query_context",
        "cache_timeout",
    ]

    export_parent = "table"
    extra_import_fields = ["is_managed_externally", "external_url"]

    def __repr__(self) -> str:
        return self.slice_name or str(self.id)
    
    @property
    def datasource(self) -> SqlaTable | None:
        return self.table
    
    def _display_datasource(self) -> SqlaTable | SemanticView | None:
        if self.datasource_type == utils.DatasourceType.SEMANTIC_VIEW:
            return self.semantic_view
        return self.table

    @property
    def resolved_datasource(self) -> Datasource | None:
        if not self.datasource_id:
            return None
        if self.datasource_type == utils.DatasourceType.TABLE:
            return self.table
        if self.datasource_type == utils.DatasourceType.SEMANTIC_VIEW:
            return self.semantic_view
        
        #TODO
    
    @staticmethod
    def iter_resolved_datasources(
        slices: Sequence[Slice],
    ) -> Iterator[DataSource | None]:
        #TODO
    
    def clone(self) -> Slice:
        return Slice(
            slice_name=self.slice_name,
            datasource_id=self.datasource_id,
            datasource_type=self.datasource_type,
            datasource_name=self.datasource_name,
            viz_type=self.viz_type,
            params=self.params,
            description=self.description,
            cache_timeout=self.cache_timeout,
        )
    
    @renders("datasource_name")
    def datasource_link(self) -> Markup | None:
        return getattr(self._display_datasource(), "link", None)
    
    @renders("datasource_url")
    def datasource_url(self) -> str | None:
        return getattr(self._display_datasource(), "explore_url", None)

    def datasource_name_text(self) -> str | None:
        return getattr(self._display_datasource(), "name", None)
        
    @property
    def datasource_edit_url(self) -> str | None:
        return getattr(self._display_datasource(), "url", None)

    @property
    def description_markeddown(self) -> str:
        return utils.markdown(self.description or "")
    
    @property
    def data(self) -> dict[str, Any]:
        data: dict[str, Any] = {}
        self.token = ""

        try:
            data = self.form_data
            self.token = utils.get_from_data_token(data)
        except Exception as e:
            logger.exception(e)
            data["error"] = str(e)

        return {
            "cache_timeout": self.cache_timeout,
            "changed_on": self.changed_on.isoformat(),
            "changed_on_humanized": self.changed_on_humanized,
            "datasource": self.datasource_name,
            "description": self.description,
            "description_markeddown": self.description_markeddown,
            "edit_url": self.edit_url,
            "form_data": self.form_data,
            "query_context": self.query_context,
            "modified": self.modified(),
            "editors": [s.id for s in self.editors],
            "extra_editors": get_extra_editor_subject_ids(self),
            "viewers": [s.id for s in self.viewers],
            "slice_id": self.id,
            "slice_name": self.slice_name,
            "slice_url": self.slice_url,
            "certified_by": self.certified_by,
            "certification_details": self.certification_details,
            "is_managed_externally": self.is_managed_externally,
        }

    @property
    def digest(self) -> str | None:
        return get_chart_digest(self)
    
    @property
    def thumbnail_url(self) -> str | None:
        if digest := self.digest:
            if not has_request_context():
                return f"/api/v1/chart/{self.id}/thumbnail/{digest}/"
            return url_for("ChartRestApi.thumbnail", pk=self.id, digest=digest)

        return None
    
    @property
    def json_data(self) -> str:
        return json.dumps(self.data)
    
    @property
    def form_data(self) -> dict[str, Any]:
        form_data: dict[str, Any] = {}
        try:
            d = json.loads(self.params)
            if not isinstance(d, dict):
                raise ValueError("params is not a JSON object")
            form_data = d
        except Exception as e: 
            logger.error("Malformed json in slice's params", exc_info=True)
            logger.exception(e)
        form_data.update(
            {
                "slice_id": self.id,
                "viz_type": self.viz_type,
                "datasource": f"{self.datasource_id}__{self.datasource_type}",
            }
        )

        if self.cache_timeout:
            form_data["cache_timeout"] = self.cache_timeout
        update_time_range(form_data)
        return form_data

    def get_query_context(self) -> QueryContext | None:
        if self.query_context:
            try:
                return self.get_query_context_factory().create(
                    **{**json.loads(self.query_context), "current_slice": self}
                )
            except json.JSONDecodeError as ex:
                logger.error("Malformed json in slice's query context", exc_info=True)
                logger.exception(ex)
        return None
    
    def get_explore_url(
        self,
        base_url: str = "/explore",
        overrides: dict[str, Any] | None = None,
    ) -> str:
        return self.build_explore_url(self.id, base_url, overrides)

    @staticmethod
    def build_explore_url(
        id_: int, base_url: str = "/explore", overrides: dict[str, Any] | None = None
    ) -> str:
        overrides = overrides or {}
        form_data = {"slice_id": id_}
        form_data.update(overrides)
        params = parse.quote(json.dumps(form_data))
        return f"{base_url}/?slice_id={id_}&form_data={params}"
    
    @property
    def slice_url(self) -> str:
        return self.get_explore_url()

    @property
    def edit_url(self) -> str:
        return f"/chart/edit/{self.id}"

    @property
    def chart(self) -> str:
        return self.slice_name or "<empty>"
    

    @property
    def slice_link(self) -> Markup:
        name = escape(self.chart)
        href = url_for("ExploreView.root", slice_id = self.id)
        return Markup(f'<a href="{href}">{name}</a>')
    
    @property
    def icons(self) -> str:
        url = escape(self.datasource_edit_url)
        datasource = escape(self.datasource_name_text() or "")
        return f"""
        <a
                href="{url}"
                data-toggle="tooltip"
                title="{datasource}">
            <i class="fa fa-database"></i>
        </a>
        """
    
    @property
    def url(self) -> str:
        return f"/explore/?slice_id={self.id}"
    
    def get_query_context_factory(self) -> QueryContextFactory:
        if self.query_context_factory is None:
            from superset.common.query_context_factory import QueryContextFactory

            self.query_context_factory = QueryContextFactory()
        return self.query_context_factory

    @classmethod
    def get(cls, id_or_uuid: str) -> Slice:
        qry = db.session.query(Slice).filter(id_or_uuid_filter(id_or_uuid))
        return qry.one_or_none()



def id_or_uuid_filter(id_or_uuid: str | int) -> BinaryExpression:
    if isinstance(id_or_uuid, int):
        return Slice.id == id_or_uuid
    if id_or_uuid.isdecimal():
        return Slice.id == int(id_or_uuid)
    return Slice.uuid == id_or_uuid


def set_related_perm(_mapper: Mapper, _connection: Connection, target: Slice) -> None:
    #TODO

def event_after_chart_changed(
    _mapper: Mapper, _connection: Connection, target: Slice
) -> None:
    cache_chart_thumbnail.delay(
        current_user=get_current_user(), chart_id=target.id, force=True
    )


sqla.event.listen(Slice, "before_insert", set_related_perm)
sqla.event.listen(Slice, "before_update", set_related_perm)

if is_feature_enabled("THUMBNAILS_SQLA_LISTENERS"):
    sqla.event.listen(Slice, "after_insert", event_after_chart_changed)
    sqla.event.listen(Slice, "after_update", event_after_chart_changed)
