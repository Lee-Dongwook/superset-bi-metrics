from __future__ import annotations

import logging
import os
from typing import cast, Iterable, Optional
from wsgiref.types import StartResponse, WSGIApplication, WSGIEnvironment

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from flask import Flask, Response
from werkzeug.exceptions import NotFound

logger = logging.getLogger(__name__)

class CoreApp(Flask):
    def send_static_file(self, filename: str) -> Response:
        if ".hot-update." in filename:
            try:
                return super().send_static_file(filename)
            except NotFound:
                logger.debug("Webpack hot-update file not found: %s", filename)
                return Response("", status=204)
        return super().send_static_file(filename)
    
    def _is_db_up_to_date(self) -> bool:
        try:
            from core.extension import db
            
            with db.engine.connect() as conn:
                context = MigrationContext.configure(conn)
                current_rev = context.get_current_revision()

            alembic_config = Config()
            alembic_config.set_main_option("script_location","superset-bi-metrics:migrations")
            scripts = ScriptDirectory.from_config(alembic_config)
            head_rev = scripts.get_current_head()

            is_current = current_rev == head_rev
            if not is_current:
                logger.debug("Pending. Current: %s, Head: %s", current_rev, head_rev)
            return is_current

        except Exception as e:
            logger.debug("Couldn't check migration status: %s",e)
            return False

    def sync_config_to_db(self) -> None:
        try:
            if not self._is_db_up_to_date():
                logger.info("Please Migration by db upgrade")
                return

            logger.info("Syncing configuration to db...")
            # TODO
        except Exception as e:
            logger.error("Failed to sync db: %s",e)

class AppRootMiddleware:
    def __init__(
        self,
        wsgi_app: WSGIApplication,
        app_root: str,
    ):
        self.wsgi_app = wsgi_app
        self.app_root = app_root.rstrip("/")
    
    def __call__(
        self, environ: WSGIEnvironment, start_response: StartResponse
    ) -> Iterable[bytes]:
        origin_path_info = environ.get("PATH_INFO", "")
        
        if origin_path_info == self.app_root or origin_path_info.startswith(self.app_root + "/"):
            environ["PATH_INFO"] = origin_path_info[len(self.app_root) :]
            environ["SCRIPT_NAME"] = self.app_root
            return self.wsgi_app(environ, start_response)
        return NotFound()(environ, start_response)

def create_app(
    config_module: Optional[str] = None,
    app_root: Optional[str] = None,
) -> Flask:
    app = CoreApp(__name__)

    #TODO
