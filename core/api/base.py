from __future__ import annotations

import functools
import logging
from typing import Any, Callable, cast, Optional, overload

from flask import current_app, request, Response
from flask_appbuilder import Model, ModelRestApi
from flask_appbuilder.api import (
    BaseApi,
    expose,
    protect,
    rison as parse_rison,
    safe,
)
from flask_appbuilder.const import API_FILTERS_RIS_KEY
from flask_appbuilder.models.filters import BaseFilter, Filters
from flask_appbuilder.models.sqla.filters import FilterStartsWith
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import permission_name
from flask_babel import lazy_gettext as _
from flask_jwt_extended import verify_jwt_in_request
from flask_login import current_user
from marshmallow import fields, Schema
from sqlalchemy import and_, distinct, func
from sqlalchemy.orm.query import Query

logger = logging.getLogger(__name__)

class BaseSuperSetBiMetricsAPI(BaseApi):
    pass


@overload
def statsd_metrics(
    f: Callable[..., Any],
    *,
    best_effort: bool = False,
) -> Callable[..., Any]: ...

@overload
def statsd_metrics(
    f: None = None,
    *,
    best_effort: bool = False,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]: ...

def statsd_metrics(
    f: Callable[...,Any] | None = None,
    *,
    best_effort: bool = False,
) -> Callable[..., Any]:
    def decorate(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wraps(self: Any, *args: Any, **kwargs: Any) -> Response:
            func_name = func.__name__
            #TODO
            return func(self, *args, **kwargs)

        return wraps

    return decorate(f) if f else decorate
