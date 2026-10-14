import os
from typing import Any

import celery
from flask_appbuilder import AppBuilder
from flask_appbuilder.utils.legacy import get_sqla_class
from flask_caching import Cache
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect
from werkzeug.local import LocalProxy


class ResultsBackendManager:
    def __init__(self) -> None:
        self._results_backend = None
        self._use_msgpack = False


APP_DIR = os.path.join(os.path.dirname(__file__), os.path.pardir)
appbuilder = AppBuilder(update_perms=False)
celery_app = celery.Celery()
csrf = CSRFProtect()
db = get_sqla_class()()

_event_logger: dict[str, Any] = {}


def _get_event_logger() -> Any:
    # API modules decorate with event_logger at import time, possibly before
    # app init registers the configured one; fall back to the default logger.
    if "event_logger" not in _event_logger:
        from core.utils.log import DBEventLogger

        _event_logger["event_logger"] = DBEventLogger()
    return _event_logger["event_logger"]


event_logger = LocalProxy(_get_event_logger)
talisman = Talisman()
# Chart/query result cache; app init configures it from DATA_CACHE_CONFIG.
data_cache = Cache()
