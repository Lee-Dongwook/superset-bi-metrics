import json
import logging
import os
from typing import Any, Callable, Optional

import celery
from flask import Flask
from flask_appbuilder import AppBuilder

try:
    from flask_appbuilder.utils.legacy import get_sqla_class
except ImportError:
    from flask_sqlalchemy import SQLAlchemy

    def get_sqla_class() -> Any:
        return SQLAlchemy

from flask_caching.backends.base import BaseCache
from flask_migrate import Migrate
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect
from werkzeug.local import LocalProxy

class ResultsBackendManger:
    def __init__(self) -> None:
        self._results_backend = None
        self._use_msgpack = False


APP_DIR = os.path.join(os.path.dirname(__file__), os.path.pardir)
appbuilder = AppBuilder(update_perms=False)
celery_app = celery.Celery()
csrf = CSRFProtect()

_event_logger: dict[str, Any] = {}
event_logger = LocalProxy(lambda: _event_logger.get("event_logger"))
talisman = Talisman()
