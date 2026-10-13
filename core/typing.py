from __future__ import annotations

from collections.abc import Hashable, Sequence
from datetime import datetime
from typing import Any, Literal, TYPE_CHECKING, TypeAlias, TypedDict

from sqlalchemy.sql.type_api import TypeEngine
from typing_extensions import NotRequired
from werkzeug.wrappers import Response

if TYPE_CHECKING:
    from core.utils.core import GenericDataType, QueryObjectFilterClause

SQLType: TypeAlias = TypeEngine | type[TypeEngine]
