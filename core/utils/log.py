from __future__ import annotations

import functools
import inspect
import logging
import textwrap
import uuid
from abc import ABC, abstractmethod
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Callable, cast, Literal

import time

from flask import current_app, g, has_app_context, has_request_context, request
from flask_appbuilder.const import API_URI_RIS_KEY
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import SQLAlchemyError

from core.utils.core import get_user_id


logger = logging.getLogger(__name__)

LOG_OBJECT_ID_COLUMNS: dict[str, str] = {
    "Dashboard": "dashboard_id",
    "Slice": "slice_id",
}

OBJECT_ID_VIEW_ARGS: tuple[str, ...] = (
    "pk",
    "id_or_slug",
    "id_or_uuid",
    "uuid",
    "uuid_str",
)

class AbstractEventLogger(ABC):
    curated_payload_params = {
        "force",
        "standalone",
        "runAsync",
        "json",
        "csv",
        "queryLimit",
        "select_as_cta"
    }

    @abstractmethod
    def log(
        self,
        user_id: int | None,
        action: str,
        dashboard_id: int | None,
        duration_ms: int | None,
        slice_id: int | None,
        referrer: str | None,
        *args: Any,
        **kwargs: Any,
    ) -> None: ...

    def log_this_with_context(
        self,
        action: str | Callable[..., str] | None = None,
        log_to_statsd: bool = True,
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        """Decorator: records one event per call with its duration.

        ``action`` may be a string or a callable receiving the wrapped call's
        arguments (e.g. ``lambda self, *a, **kw: f"{type(self).__name__}.get"``).
        A failing logger never breaks the wrapped call.
        """

        def decorate(f: Callable[..., Any]) -> Callable[..., Any]:
            @functools.wraps(f)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                name = action(*args, **kwargs) if callable(action) else action or f.__name__
                start = time.perf_counter()
                try:
                    return f(*args, **kwargs)
                finally:
                    duration_ms = int((time.perf_counter() - start) * 1000)
                    self._emit(name, duration_ms, log_to_statsd)

            return wrapper

        return decorate

    def _emit(self, action: str, duration_ms: int, log_to_statsd: bool) -> None:
        try:
            if log_to_statsd and has_app_context():
                current_app.config["STATS_LOGGER"].incr(action)
            self.log(
                user_id=get_user_id(),
                action=action,
                dashboard_id=None,
                duration_ms=duration_ms,
                slice_id=None,
                referrer=request.referrer if has_request_context() else None,
            )
        except Exception:
            logger.exception("Failed to log event %s", action)


class DBEventLogger(AbstractEventLogger):
    def log(
        self,
        user_id: int | None,
        action: str,
        dashboard_id: int | None,
        duration_ms: int | None,
        slice_id: int | None,
        referrer: str | None,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        records = kwargs.get("records", [])
        curated_payload = kwargs.get("curated_payload")

        #TODO
