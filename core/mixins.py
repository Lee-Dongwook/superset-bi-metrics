"""Declarative mixins shared by core models."""

from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from flask_appbuilder.models.mixins import AuditMixin as FabAuditMixin
from sqlalchemy.orm import Mapped, declared_attr
from sqlalchemy_utils import UUIDType

from core.utils.core import get_user_id


class AuditMixin(FabAuditMixin):
    """FAB audit columns, but nullable so rows can be created outside a request
    (CLI, Celery, tests) where there is no logged-in user."""

    created_on = sa.Column(sa.DateTime, default=datetime.now, nullable=True)
    changed_on = sa.Column(
        sa.DateTime, default=datetime.now, onupdate=datetime.now, nullable=True
    )

    @declared_attr
    def created_by_fk(cls) -> Mapped[int | None]:  # noqa: N805
        return sa.Column(
            sa.Integer, sa.ForeignKey("ab_user.id"), default=get_user_id, nullable=True
        )

    @declared_attr
    def changed_by_fk(cls) -> Mapped[int | None]:  # noqa: N805
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=get_user_id,
            onupdate=get_user_id,
            nullable=True,
        )


class UUIDMixin:
    uuid = sa.Column(UUIDType(binary=True), unique=True, default=uuid.uuid4)
