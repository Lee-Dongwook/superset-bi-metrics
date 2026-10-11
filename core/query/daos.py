from core.common.daos import BaseDAO
from core.query.models import Query, SavedQuery

class QueryDAO(BaseDAO[Query]):
    model_cls = None
    base_filter = None
    id_column_name = "id"

class SavedQueryDAO(BaseDAO[SavedQuery]):
    model_cls = None
    base_filter = None
    id_column_name = "id"
