"""Slice (chart) model, ported from superset/models/slice.py.

Not ported yet (TODO(port)): the ``editors`` / ``viewers`` / ``tags``
relationships (Subject, Tag models), the ``table`` relationship (SqlaTable),
import/export (ImportExportMixin) and the thumbnail listeners.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator, Sequence
from typing import Any, TYPE_CHECKING
from urllib import parse

import sqlalchemy as sqla
from flask import has_request_context, url_for
from flask_appbuilder import Model
from flask_appbuilder.models.decorators import renders
from flask_appbuilder.security.sqla.models import User
from markupsafe import escape, Markup
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.engine.base import Connection
from sqlalchemy.orm import relationship
from sqlalchemy.orm.mapper import Mapper
from sqlalchemy.sql.elements import BinaryExpression

from core.extension import db
from core.legacy import update_time_range
from core.models.helpers import (
    AuditMixinNullable,
    skip_visibility_filter,
    SoftDeleteMixin,
    UUIDMixin,
)
from core.utils import core as utils, json
from core.utils.schema import is_query_context_metadata_complete

if TYPE_CHECKING:
    from core.common.query.context import QueryContext
    from core.common.query.context_factory import QueryContextFactory
    from core.daos.datasource import Datasource
    from core.semantic.models import SemanticView

metadata = Model.metadata  # pylint: disable=no-member
logger = logging.getLogger(__name__)


class Slice(  # pylint: disable=too-many-public-methods
    SoftDeleteMixin, AuditMixinNullable, UUIDMixin, Model
):
    """A slice is essentially a report or a view on data"""

    query_context_factory: QueryContextFactory | None = None

    __tablename__ = "slices"
    __table_args__: tuple[sqla.Index, ...] = (
        sqla.Index(
            "ix_slices_datasource_type_datasource_id",
            "datasource_type",
            "datasource_id",
        ),
    )
    # Columns excluded from content versioning (SQLAlchemy-Continuum in Superset).
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
    id = Column(Integer, primary_key=True)
    slice_name = Column(String(250))
    datasource_id = Column(Integer)
    datasource_type = Column(String(200))
    datasource_name = Column(String(2000))
    viz_type = Column(String(250))
    params = Column(utils.MediumText())
    query_context = Column(utils.MediumText())
    description = Column(Text)
    cache_timeout = Column(Integer)
    perm = Column(String(1000))
    schema_perm = Column(String(1000))
    catalog_perm = Column(String(1000), nullable=True, default=None)
    # the last time a user has saved the chart, changed_on is referencing
    # when the database row was last written
    last_saved_at = Column(DateTime, nullable=True)
    last_saved_by_fk = Column(Integer, ForeignKey("ab_user.id"), nullable=True)
    certified_by = Column(Text)
    certification_details = Column(Text)
    is_managed_externally = Column(Boolean, nullable=False, default=False)
    external_url = Column(Text, nullable=True)
    last_saved_by = relationship(User, foreign_keys=[last_saved_by_fk])

    # ``datasource_id`` is only unique within a ``datasource_type``, so the join
    # is guarded on the type. View-only: the chart writes ``datasource_id``.
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
    def datasource(self) -> SemanticView | None:
        # Superset pins this to the SqlaTable ``table`` relationship; semantic
        # views are the only datasource here.
        return self._display_datasource()

    def _display_datasource(self) -> SemanticView | None:
        """The datasource used to name and link this chart in listings."""
        if self.datasource_type == utils.DatasourceType.SEMANTIC_VIEW:
            return self.semantic_view
        return None

    @property
    def resolved_datasource(self) -> Datasource | None:
        """The chart's datasource, resolved across datasource types.

        ``None`` when the row does not exist, the type is unknown, or the model has
        no ``perm``; callers must treat ``None`` as inaccessible, never as absent.
        """
        if not self.datasource_id:
            return None
        if self.datasource_type == utils.DatasourceType.SEMANTIC_VIEW:
            return self.semantic_view
        # pylint: disable=import-outside-toplevel
        from core.daos.datasource import DatasourceDAO
        from core.daos.exceptions import (
            DatasourceNotFound,
            DatasourceTypeNotSupportedError,
            DatasourceValueIsIncorrect,
        )

        try:
            resolved = DatasourceDAO.get_datasource(
                self.datasource_type, self.datasource_id
            )
        except (
            DatasourceNotFound,
            DatasourceTypeNotSupportedError,
            DatasourceValueIsIncorrect,
        ):
            return None
        return resolved if hasattr(resolved, "perm") else None

    @staticmethod
    def iter_resolved_datasources(
        slices: Sequence[Slice],
    ) -> Iterator[Datasource | None]:
        """Resolve unique member references in order, batching each fallback type."""
        # pylint: disable=import-outside-toplevel
        from core.daos.datasource import DatasourceDAO
        from core.daos.exceptions import DatasourceTypeNotSupportedError

        seen: set[tuple[str | None, int | None]] = set()
        batches: dict[str, dict[int, Datasource]] = {}
        for slc in slices:
            key: tuple[str | None, int | None] = (
                slc.datasource_type,
                slc.datasource_id,
            )
            if key in seen:
                continue
            seen.add(key)
            if not slc.datasource_id or slc.datasource_type in (
                utils.DatasourceType.TABLE,
                utils.DatasourceType.SEMANTIC_VIEW,
            ):
                yield slc.resolved_datasource
                continue
            datasource_type: str = slc.datasource_type
            if datasource_type not in batches:
                ids: set[int] = {
                    member.datasource_id
                    for member in slices
                    if member.datasource_type == datasource_type
                    and member.datasource_id is not None
                }
                try:
                    batches[datasource_type] = DatasourceDAO.get_datasources_by_ids(
                        datasource_type, ids
                    )
                except DatasourceTypeNotSupportedError:
                    batches[datasource_type] = {}
            resolved: Datasource | None = batches[datasource_type].get(
                slc.datasource_id
            )
            yield (
                resolved if resolved is not None and hasattr(resolved, "perm") else None
            )

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

    # These read the datasource through ``getattr`` so an unresolved reference
    # yields ``None`` for that one chart instead of failing a whole listing.

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
        """Data used to render slice in templates"""
        data: dict[str, Any] = {}
        self.token = ""
        try:
            data = self.form_data
            self.token = utils.get_form_data_token(data)
        except Exception as ex:  # pylint: disable=broad-except
            logger.exception(ex)
            data["error"] = str(ex)
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
            # TODO(port): editors / extra_editors / viewers (Subject model).
            "editors": [],
            "extra_editors": [],
            "viewers": [],
            "slice_id": self.id,
            "slice_name": self.slice_name,
            "slice_url": self.slice_url,
            "certified_by": self.certified_by,
            "certification_details": self.certification_details,
            "is_managed_externally": self.is_managed_externally,
        }

    @property
    def digest(self) -> str | None:
        # TODO(port): superset/thumbnails/digest.py
        return None

    @property
    def thumbnail_url(self) -> str | None:
        """Thumbnail URL with a HEX digest, to avoid browser cache after changes."""
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
        except Exception as ex:  # pylint: disable=broad-except
            logger.error("Malformed json in slice's params", exc_info=True)
            logger.exception(ex)
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
                query_context_payload = json.loads(self.query_context)
            except json.JSONDecodeError as ex:
                logger.error("Malformed json in slice's query context", exc_info=True)
                logger.exception(ex)
                return None
            # ``QueryContextFactory.create()`` requires ``datasource`` and
            # ``queries``; an old row may be missing either.
            if not is_query_context_metadata_complete(query_context_payload):
                logger.error(
                    "Slice %s query_context is missing required "
                    "'datasource'/'queries' fields",
                    self.id,
                )
                return None
            return self.get_query_context_factory().create(
                **{**query_context_payload, "current_slice": self}
            )
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
        """Defines the url to access the slice"""
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
        href = url_for("ExploreView.root", slice_id=self.id)
        return Markup('<a href="{}">{}</a>').format(href, name)

    @property
    def icons(self) -> str:
        # Escape the data-controlled datasource name and edit URL.
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
            # pylint: disable=import-outside-toplevel
            from core.common.query.context_factory import QueryContextFactory

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
    # pylint: disable=import-outside-toplevel
    from core.daos.datasource import DatasourceDAO

    src_class: type[Datasource] | None = DatasourceDAO.sources.get(
        target.datasource_type
    )
    if src_class is None:
        # An unknown ``datasource_type`` has no resolvable datasource: fail closed
        # by clearing the denormalized perm columns.
        logger.warning(
            "Slice %r references unknown datasource_type %r; clearing perm "
            "columns (fail closed).",
            target.slice_name,
            target.datasource_type,
        )
        target.perm = None
        target.catalog_perm = None
        target.schema_perm = None
        return
    ds: Datasource | None = None
    if id_ := target.datasource_id:
        # A soft-deleted datasource is restorable, not missing.
        with skip_visibility_filter(db.session, src_class):
            ds = db.session.query(src_class).filter_by(id=int(id_)).first()
    if ds is None:
        target.perm = None
        target.catalog_perm = None
        target.schema_perm = None
        return
    target.perm = getattr(ds, "perm", None)
    target.catalog_perm = getattr(ds, "catalog_perm", None)
    target.schema_perm = getattr(ds, "schema_perm", None)


sqla.event.listen(Slice, "before_insert", set_related_perm)
sqla.event.listen(Slice, "before_update", set_related_perm)
