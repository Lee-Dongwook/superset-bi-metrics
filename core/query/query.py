from typing import TYPE_CHECKING

from sqlglot import Dialects

if TYPE_CHECKING:
    from core.common.models import Database

def get_sqlglot_dialect(database: "Database") -> Dialects:
    raise NotImplementedError("Function will be replaced during initialization")
