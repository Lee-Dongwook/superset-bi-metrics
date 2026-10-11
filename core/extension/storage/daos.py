class ExtensionStorageDAO(BaseDAO[ExtensionStorageEntry]):
    model_cls = None
    base_filter = None
    id_column_name = "id"
