from __future__ import annotations

import functools
import logging
from typing import Any, Callable, overload

from flask import Response
from flask_appbuilder.api import BaseApi

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
            # TODO: emit timing/success/error metrics like upstream send_stats_metrics
            return func(self, *args, **kwargs)

        return wraps

    return decorate(f) if f else decorate
