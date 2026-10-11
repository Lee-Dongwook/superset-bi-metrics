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

from flask import g, has_request_context, request
from flask_appbuilder.const import API_URI_RIS_KEY
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import SQLAlchemyError


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

    #TODO


class DBEventLogger(AbstractEventLogger):
    def log(
        self,
        user_id: int | None,
        action: str,
        dashboard_id: int | None,
        durations_ms: int | None,
        slice_id: int | None,
        referrer: str | None,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        records = kwargs.get("records", [])
        curated_payload = kwargs.get("curated_payload")

        #TODO
