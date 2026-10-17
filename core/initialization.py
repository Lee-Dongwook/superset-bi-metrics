from __future__ import annotations

import logging
import os
from typing import Any, TYPE_CHECKING

from flask_appbuilder import Model

from core.constants import CHANGE_ME_SECRET_KEY
from core.extension import _event_logger, appbuilder, csrf, data_cache, db

if TYPE_CHECKING:
    from core.app import CoreApp

logger = logging.getLogger(__name__)


def health() -> str:
    return "OK"


class AppInitializer:
    def __init__(self, app: CoreApp) -> None:
        self._app = app
        self.config = app.config
        self.manifest: dict[Any, Any] = {}

    @property
    def flask_app(self) -> CoreApp:
        return self._app

    def init_app(self) -> None:
        self.pre_init()
        self.check_secret_key()
        self.setup_db()
        self.setup_event_logger()
        self.configure_wtf()
        self.configure_cache()
        with self.flask_app.app_context():
            self.init_app_in_ctx()

    def pre_init(self) -> None:
        os.makedirs(self.config["DATA_DIR"], exist_ok=True)

    def check_secret_key(self) -> None:
        if self.config["SECRET_KEY"] != CHANGE_ME_SECRET_KEY:
            return
        if self.flask_app.debug or self.config.get("TESTING"):
            logger.warning("Using the default SECRET_KEY; fine for local development only.")
            return
        raise RuntimeError(
            "Refusing to start with the default SECRET_KEY. Set SUPERSET_SECRET_KEY "
            "(e.g. `openssl rand -base64 42`) or run with --debug for local development."
        )

    def setup_db(self) -> None:
        db.init_app(self.flask_app)

    def setup_event_logger(self) -> None:
        _event_logger["event_logger"] = self.config["EVENT_LOGGER"]

    def configure_wtf(self) -> None:
        if not self.config["WTF_CSRF_ENABLED"]:
            return
        csrf.init_app(self.flask_app)
        for view in self.config["WTF_CSRF_EXEMPT_LIST"]:
            csrf.exempt(view)

    def configure_cache(self) -> None:
        data_cache.init_app(self.flask_app, self.config["DATA_CACHE_CONFIG"])

    def init_app_in_ctx(self) -> None:
        appbuilder.init_app(self.flask_app, db.session)
        self.init_views()
        # Models subclass FAB's Model (not db.Model), so create from its metadata.
        # ponytail: create_all only adds missing tables; switch to alembic once migrations exist.
        Model.metadata.create_all(db.engine)

    def init_views(self) -> None:
        # Imported here so models/APIs load after the extensions are bound to the app.
        from core.cache_keys.api import CacheApi
        from core.css.api import CssTemplateApi
        from core.data.api import AdvancedDataTypeApi
        from core.domains.api import DomainRestApi
        from core.metrics.api import MetricsRestApi

        for api in (AdvancedDataTypeApi, CacheApi, CssTemplateApi, DomainRestApi, MetricsRestApi):
            appbuilder.add_api(api)

        for rule in ("/health", "/healthcheck", "/ping"):
            self.flask_app.add_url_rule(rule, view_func=health)
