from __future__ import annotations

import ast
import builtins
import copy
import dataclasses
import logging
import re
import uuid
from collections.abc import Hashable, Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import (
    Any,
    Callable,
    cast,
    ClassVar,
    Literal,
    NamedTuple,
    Optional,
    TYPE_CHECKING,
    TypedDict,
    Union,
)
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import dateutil.parser
from core.mixins import AuditMixin
from core.utils.core import get_user_id
import humanize
import numpy as np
import pandas as pd
import pytz
import sqlalchemy as sa
import yaml
from markupsafe import escape, Markup

from sqlalchemy.orm import (
    declared_attr,
    Mapped,
    Mapper,
    Session,
    validates,
    with_loader_criteria,
)

class ValidationResultDict(TypedDict):
    valid: bool
    errors: list[dict[str, Any]]

logger = logging.getLogger(__name__)

VIRTUAL_TABLE_ALIAS = "virtual_table"
SERIES_LIMIT_SUBQ_ALIAS = "series_limit"
OFFSET_JOIN_COLUMN_SUFFIX = "__offset_join_column_"

class UUIDMixin:
    @declared_attr
    def uuid(self) -> Mapped[Optional[uuid.UUID]]:
        return sa.Column(
            UUIDType(binary=True), primary_key=False, unique=True, default=uuid.uuid4
        )
    
    @validates("uuid")
    def _coerce_uuid(self, key: str, value: Any) -> Any:
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except ValueError:
                return value
        return value

    @property
    def short_uuid(self) -> str:
        return str(self.uuid)[:8]

class AuditMixinNullable(AuditMixin):
    created_on = sa.Column(sa.DateTime, default=datetime.now, nullable=True)
    changed_on = sa.Column(
        sa.DateTime, default=datetime.now, onupdate=datetime.now, nullable=True
    )

    @declared_attr
    def created_by_fk(self) -> Mapped[Optional[int]]:
        return sa.Column(
            sa.Integer,
            sa.ForeignKey("ab_user.id"),
            default=get_user_id,
            nullable=True,
        )
    
    @declared_attr
    def changed_by_fk(self) -> Mapped[Optional[int]]:
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
        return Markup(f'<span class="no-wrap">{self.changed_on}</span>')  

    @renders("changed_on")
    def changed_on_delta_humanized(self) -> str:
        return self.changed_on_humanized

    @renders("changed_on")
    def changed_on_dttm(self) -> float:
        return datetime_to_epoch(self.changed_on)

    @renders("created_on")
    def created_on_delta_humanized(self) -> str:
        return self.created_on_humanized
