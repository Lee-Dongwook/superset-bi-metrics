from __future__ import annotations

import logging
from typing import Any, ClassVar, TYPE_CHECKING

import pandas as pd

logger = logging.getLogger(__name__)

class QueryContext:
    cache_type: ClassVar[str] = "df"
    enforce_numerical_metrics: ClassVar[bool] = True

    #TODO
