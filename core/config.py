"""Default configuration.

Override by pointing ``SUPERSET_CONFIG`` at your own module, e.g. one that does
``from core.config import *`` and sets ``SQLALCHEMY_DATABASE_URI`` to the
Postgres from docker/docker-compose.yaml.
"""

from __future__ import annotations

import os
from importlib.resources import files

from flask_appbuilder.security.manager import AUTH_DB

from core.constants import CHANGE_ME_SECRET_KEY
from core.data.plugins.address import address
from core.data.plugins.port import port
from core.stats_logger import DummyStatsLogger
from core.utils.log import DBEventLogger

STATS_LOGGER = DummyStatsLogger()
EVENT_LOGGER = DBEventLogger()
SUPERSET_LOG_VIEW = True
SUPERSET_SECURITY_VIEW_MENU = True

BASE_DIR = str(files("core"))
DATA_DIR = os.environ.get("SUPERSET_HOME") or os.path.expanduser("~/.superset")

APP_NAME = "Superset BI Metrics"
SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY") or CHANGE_ME_SECRET_KEY

# SQLite keeps local dev dependency-free.
SQLALCHEMY_DATABASE_URI = (
    "sqlite:///"
    + os.path.join(DATA_DIR, "superset_bi_metrics.db")
    + "?check_same_thread=false"
)

AUTH_TYPE = AUTH_DB
FAB_ADD_SECURITY_API = True

WTF_CSRF_ENABLED = True
WTF_CSRF_EXEMPT_LIST: list[str] = []
WTF_CSRF_TIME_LIMIT = None

# Per-process cache; use RedisCache (docker-compose redis) to share across workers.
DATA_CACHE_CONFIG = {"CACHE_TYPE": "SimpleCache"}

SUPERSET_WEBSERVER_DOMAINS: list[str] | None = None

ADVANCED_DATA_TYPES = {
    "internet_address": address,
    "port": port,
}
