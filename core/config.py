from __future__ import annotations

import hashlib
import importlib.util
import json
import logging
import os
import re
import sys
from collections import OrderedDict
from contextlib import contextmanager
from datetime import timedelta
from email.mime.multipart import MIMEMultipart
from importlib.resources import files
from typing import Any, Callable, Iterator, Literal, Optional, TYPE_CHECKING, TypedDict

import click
from celery.schedules import crontab
from flask import Blueprint
from flask_appbuilder.security.manager import AUTH_DB
from flask_caching.backends.base import BaseCache
from pandas import Series
from pandas._libs.parsers import STR_NA_VALUES
from sqlalchemy.engine.url import URL
from sqlalchemy.orm import Session
from sqlalchemy.orm.query import Query

from core.stats_logger import DummyStatsLogger
from core.utils.log import DBEventLogger

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from flask_appbuilder.security.sqla import models
    from sqlglot import Dialect, Dialects

    DialectExtensions = dict[str, Dialects | type[Dialect]]

STATS_LOGGER = DummyStatsLogger()
EVENT_LOGGER = DBEventLogger()
SUPERSET_LOG_VIEW = True
SUPERSET_SECURITY_VIEW_MENU = True

BASE_DIR = str(files("superset"))
if "SUPERSET_HOME" in os.environ:
    DATA_DIR = os.environ["SUPERSET_HOME"]
else:
    DATA_DIR = os.path.expanduser("~/.superset")
