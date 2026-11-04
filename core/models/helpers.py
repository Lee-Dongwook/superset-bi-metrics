"""Model mixins and the query result type, ported from superset/models/helpers.py.

Out of scope for the semantic-view (Cube) core path and not ported:
``ImportExportMixin``, ``ExtraJSONMixin``, ``CertificationMixin`` and the SQL
generation in ``ExploreMixin``.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, ClassVar, Optional, TYPE_CHECKING, Union

import humanize
import pandas as pd
import pytz
import sqlalchemy as sa
from flask_appbuilder.models.decorators import renders
from flask_appbuilder.models.mixins import AuditMixin
from flask_babel import get_locale
from markupsafe import escape, Markup
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import declared_attr, Mapped, Session, validates, with_loader_criteria
from sqlalchemy.orm.session import ORMExecuteState
from sqlalchemy.sql.elements import ColumnElement
from sqlalchemy_utils import UUIDType

from core.constants import SKIP_VISIBILITY_FILTER_CLASSES
from core.query.types import QueryStatus
from core.utils.core import get_user_id
from core.utils.json import datetime_to_epoch
from core.utils.feature_flag_manager import is_feature_enabled

if TYPE_CHECKING:
    from flask_appbuilder.security.sqla.models import User

    from core.utils.core import Column as ColumnTyping

logger = logging.getLogger(__name__)


class UUIDMixin:  # pylint: disable=too-few-public-methods
    @declared_attr
    def uuid(self) -> Mapped[Optional[uuid.UUID]]:  # pylint: disable=arguments-renamed
        return sa.Column(
            UUIDType(binary=True), primary_key=False, unique=True, default=uuid.uuid4
        )

    @validates("uuid")
    def _coerce_uuid(self, key: str, value: Any) -> Any:  # noqa: ARG002
        """Coerce UUID strings to ``uuid.UUID`` on assignment; pass anything else through."""
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except ValueError:
                return value
        return value

    @property
    def short_uuid(self) -> str:
        return str(self.uuid)[:8]


def _user(user: User) -> str:
    if not user:
        return ""
    return escape(user)


def format_time_humanized(timestamp: datetime) -> str:
    """Humanize *timestamp* against the server's naive-local clock."""
    try:
        locale = str(get_locale())
    except Exception:  # pylint: disable=broad-except  # no request/babel context
        locale = "en"
    time_diff = datetime.now() - timestamp
    if locale == "en":
        return humanize.naturaltime(time_diff)
    try:
        humanize.i18n.activate(locale)
        try:
            return humanize.naturaltime(time_diff)
        finally:
            humanize.i18n.deactivate()
    except Exception as e:  # pylint: disable=broad-except
        logger.warning("Locale '%s' is not supported in humanize: %s", locale, e)
        return humanize.naturaltime(time_diff)


class AuditMixinNullable(AuditMixin):
    """AuditMixin with nullable fields, so objects can be created outside of CRUD."""

    created_on = sa.Column(sa.DateTime, default=datetime.now, nullable=True)
    changed_on = sa.Column(
        sa.DateTime, default=datetime.now, onupdate=datetime.now, nullable=True
    )

    @declared_attr
    def created_by_fk(self) -> Mapped[Optional[int]]:  # pylint: disable=arguments-renamed
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=get_user_id,
            nullable=True,
        )

    @declared_attr
    def changed_by_fk(self) -> Mapped[Optional[int]]:  # pylint: disable=arguments-renamed
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=get_user_id,
            onupdate=get_user_id,
            nullable=True,
        )

    @property
    def created_by_name(self) -> str:
        if self.created_by:
            return escape(f"{self.created_by}")
        return ""

    @property
    def changed_by_name(self) -> str:
        if self.changed_by:
            return escape(f"{self.changed_by}")
        return ""

    @renders("created_by")
    def creator(self) -> Union[Markup, str]:
        return _user(self.created_by)

    @property
    def changed_by_(self) -> Union[Markup, str]:
        return _user(self.changed_by)

    @renders("changed_on")
    def changed_on_(self) -> Markup:
        return Markup('<span class="no-wrap">{}</span>').format(self.changed_on)

    @renders("changed_on")
    def changed_on_delta_humanized(self) -> str:
        return self.changed_on_humanized

    @renders("changed_on")
    def changed_on_dttm(self) -> float:
        return datetime_to_epoch(self.changed_on)

    @renders("created_on")
    def created_on_delta_humanized(self) -> str:
        return self.created_on_humanized

    @renders("changed_on")
    def changed_on_utc(self) -> str:
        return self.changed_on.astimezone(pytz.utc).strftime("%Y-%m-%dT%H:%M:%S.%f%z")

    def _format_time_humanized(self, timestamp: datetime) -> str:
        return format_time_humanized(timestamp)

    @property
    def changed_on_humanized(self) -> str:
        return self._format_time_humanized(self.changed_on)

    @property
    def created_on_humanized(self) -> str:
        return self._format_time_humanized(self.created_on)

    @renders("changed_on")
    def modified(self) -> Markup:
        return Markup('<span class="no-wrap">{}</span>').format(self.changed_on_humanized)


_NO_BYPASS: frozenset[type] = frozenset()


class SoftDeleteMixin:
    """Adds a nullable ``deleted_at`` column; soft-deleted rows are hidden from ORM
    SELECTs by the ``do_orm_execute`` listener (``_add_soft_delete_filter``) while
    the ``SOFT_DELETE`` feature flag is on.

    Bypass per statement with ``execution_options(_skip_visibility_filter_classes=
    {Model})`` or per session with ``skip_visibility_filter``.
    """

    _registered_subclasses: ClassVar[list[type[SoftDeleteMixin]]] = []

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        if cls in SoftDeleteMixin._registered_subclasses:
            return
        SoftDeleteMixin._registered_subclasses.append(cls)
        SoftDeleteMixin._registered_subclasses.sort(key=lambda c: c.__qualname__)

    deleted_at = sa.Column(sa.DateTime, nullable=True, index=True)

    @hybrid_property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @is_deleted.expression  # type: ignore
    def is_deleted(cls) -> ColumnElement:  # noqa: N805
        return cls.deleted_at.is_not(None)

    @classmethod
    def where_not_deleted(cls) -> ColumnElement:
        """SQL WHERE clause excluding soft-deleted rows (for ``.filter(...)``)."""
        return cls.deleted_at.is_(None)

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now()

    def restore(self) -> None:
        self.deleted_at = None


def _collect_bypass_classes(execute_state: ORMExecuteState) -> frozenset[type]:
    """Union of per-query (execution options) and per-session (session.info) bypasses."""
    per_query = execute_state.execution_options.get(SKIP_VISIBILITY_FILTER_CLASSES)
    per_session = execute_state.session.info.get(SKIP_VISIBILITY_FILTER_CLASSES)
    if not per_query and not per_session:
        return _NO_BYPASS
    return frozenset(per_query or ()) | frozenset(per_session or ())


def _should_attach_soft_delete_criteria(execute_state: ORMExecuteState) -> bool:
    """Primary and relationship SELECTs, not column loads; gated by ``SOFT_DELETE``."""
    return (
        execute_state.is_select
        and not execute_state.is_column_load
        and is_feature_enabled("SOFT_DELETE")
    )


def _all_soft_delete_subclasses() -> list[type[SoftDeleteMixin]]:
    return SoftDeleteMixin._registered_subclasses


def _add_soft_delete_filter(execute_state: ORMExecuteState) -> None:
    """Global ``do_orm_execute`` listener excluding soft-deleted rows from ORM SELECTs.

    Register once at app init: ``sa.event.listen(Session, "do_orm_execute",
    _add_soft_delete_filter)``.
    """
    if not _should_attach_soft_delete_criteria(execute_state):
        return

    bypass_classes = _collect_bypass_classes(execute_state)

    for cls in _all_soft_delete_subclasses():
        if cls in bypass_classes:
            continue
        # A lambda (not a concrete expression) so SQLAlchemy adapts the column to
        # whatever alias the class wears in the statement.
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                cls,
                lambda c: c.deleted_at.is_(None),
                include_aliases=True,
            )
        )


@contextmanager
def skip_visibility_filter(session: Session, *classes: type) -> Iterator[None]:
    """Bypass the soft-delete listener for ``classes`` within this session block.

    Nesting is safe: an inner block only removes the classes it added.
    """
    bypass = session.info.setdefault(SKIP_VISIBILITY_FILTER_CLASSES, set())
    added = set(classes) - bypass
    bypass.update(added)
    try:
        yield
    finally:
        bypass -= added


class QueryResult:  # pylint: disable=too-few-public-methods
    """Object returned by the query interface"""

    def __init__(  # pylint: disable=too-many-arguments
        self,
        df: pd.DataFrame,
        query: str,
        duration: timedelta,
        applied_template_filters: Optional[list[str]] = None,
        applied_filter_columns: Optional[list[ColumnTyping]] = None,
        rejected_filter_columns: Optional[list[ColumnTyping]] = None,
        status: str = QueryStatus.SUCCESS,
        error_message: Optional[str] = None,
        errors: Optional[list[dict[str, Any]]] = None,
        from_dttm: Optional[datetime] = None,
        to_dttm: Optional[datetime] = None,
        sql_shifted_temporal_labels: set[str] | None = None,
        semantic_cache_status: Optional[str] = None,
    ) -> None:
        self.df = df
        self.query = query
        self.duration = duration
        self.applied_template_filters = applied_template_filters or []
        self.applied_filter_columns = applied_filter_columns or []
        self.rejected_filter_columns = rejected_filter_columns or []
        self.status = status
        self.error_message = error_message
        self.errors = errors or []
        self.from_dttm = from_dttm
        self.to_dttm = to_dttm
        self.sql_shifted_temporal_labels = sql_shifted_temporal_labels or set()
        # A ``SemanticCacheStatus`` value, or None for non-semantic sources.
        self.semantic_cache_status: Optional[str] = semantic_cache_status
        self.sql_rowcount = len(self.df.index) if not self.df.empty else 0
