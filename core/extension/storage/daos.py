from core.common.daos import BaseDAO
from core.extension.storage.models import ExtensionStorageEntry

class ExtensionStorageDAO(BaseDAO[ExtensionStorageEntry]):
    model_cls = None
    base_filter = None
    id_column_name = "id"
