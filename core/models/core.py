from __future__ import annotations

import builtins
import logging
import textwrap
import threading
from ast import literal_eval
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
from typing import Any, Callable, cast, Iterator, Optional, TYPE_CHECKING, TypeVar

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
from core.common.models import Database as CoreDatabase

from core.utils import cache as cache_util, core as utils, json
from core.models.helpers import UUIDMixin, AuditMixinNullable

metadata = Model.metadata
logger = logging.getLogger(__name__)
T = TypeVar("T")

_ENGINE_CACHE: dict[tuple[int, str, str], Engine] = {}
_ENGINE_CACHE_LOCK = threading.Lock()

class KeyValue(Model):
    __tablename__ = "keyvalue"
    id = Column(Integer, primary_key=True)
    value = Column(utils.MediumText(), nullable=False)

class CssTemplate(AuditMixinNullable, UUIDMixin, Model):
    __tablename__ = "css_templates"
    id = Column(Integer, primary_key=True)
    template_name = Column(String(250))
    css = Column(utils.MediumText(), default="")
