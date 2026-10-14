
from core.utils.backports import StrEnum


DEFAULT_USER_AGENT = "BI Metrics User Agent"

NULL_STRING = "<NULL>"
EMPTY_STRING = "<empty string>"

CHANGE_ME_SECRET_KEY = "CHANGE_ME_TO_A_COMPLEX_RANDOM_SECRET" 
CHANGE_ME_GUEST_TOKEN_JWT_SECRET = "test-guest-secret-change-me" 
CHANGE_ME_WEBSOCKET_JWT_SECRET = "test-ws-secret-change-me"  

SKIP_VISIBILITY_FILTER_CLASSES = "_skip_visibility_filter_classes"

EXAMPLES_DB_UUID = "example-db-uuid"

PASSWORD_MASK = "X" * 10

EPOCH_FORMATS: dict[str, int] = {
    "epoch_s": 1,
    "epoch_ms": 1_000,
    "epoch_us": 1_000_000,
}

NO_TIME_RANGE = "No filter"

EMPTY_FILTER_SQL_EXPRESSION = "1 = 0"

QUERY_CANCEL_KEY = "cancel_query"
QUERY_EARLY_CANCEL_KEY = "early_cancel_query"
QUERY_DISPATCHED_KEY = "query_dispatched"

LRU_CACHE_MAX_SIZE = 256

class InstantTimeComparison(StrEnum):
    INHERITED = "r"
    YEAR = "y"
    MONTH = "m"
    WEEK = "w"

class RouteMethod:
    ACTION = "action"
    ACTION_POST = "action_post"
    ADD = "add"
    API_CREATE = "api_create"
    API_DELETE = "api_delete"
    API_GET = "api_get"
    API_READ = "api_read"
    API_UPDATE = "api_update"
    DELETE = "delete"
    DOWNLOAD = "download"
    EDIT = "edit"
    LIST = "list"
    SHOW = "show"
    INFO = "info"
    EXPORT = "export"
    IMPORT = "import_"
    GET = "get"
    GET_LIST = "get_list"
    POST = "post"
    PUT = "put"
    RELATED = "related"
    DISTINCT = "distinct"

    API_SET = {API_CREATE, API_DELETE, API_GET, API_READ, API_UPDATE}
    CRUD_SET = {ADD, LIST, EDIT, DELETE, ACTION_POST, SHOW}
    RELATED_VIEW_SET = {ADD, LIST, EDIT, DELETE}
    REST_MODEL_VIEW_CRUD_SET = {DELETE, GET, GET_LIST, POST, PUT, INFO}

MODEL_VIEW_RW_METHOD_PERMISSION_MAP = {
    "add": "write",
    "api": "read",
    "api_column_add": "write",
    "api_column_edit": "write",
    "api_create": "write",
    "api_delete": "write",
    "api_get": "read",
    "api_read": "read",
    "api_readvalues": "read",
    "api_update": "write",
    "annotation": "read",
    "delete": "write",
    "download": "read",
    "download_dashboards": "read",
    "edit": "write",
    "list": "read",
    "muldelete": "write",
    "mulexport": "read",
    "show": "read",
    "new": "write",
    "yaml_export": "read",
    "refresh": "write",
}

MODEL_API_RW_METHOD_PERMISSION_MAP = {
    "bulk_delete": "write",
    "delete": "write",
    "distinct": "read",
    "get": "read",
    "get_list": "read",
    "info": "read",
    "post": "write",
    "put": "write",
    "related": "read",
    "related_objects": "read",
    "bulk_related_objects": "read",
    "tables": "read",
    "schemas": "read",
    "catalogs": "read",
    "select_star": "read",
    "table_metadata": "read",
    "table_metadata_deprecated": "read",
    "table_extra_metadata": "read",
    "table_extra_metadata_deprecated": "read",
    "test_connection": "write",
    "validate_parameters": "write",
    "favorite_status": "read",
    "add_favorite": "read",
    "remove_favorite": "read",
    "thumbnail": "read",
    "import_": "write",
    "refresh": "write",
    "cache_screenshot": "read",
    "screenshot": "read",
    "data": "read",
    "data_from_cache": "read",
    "get_charts": "read",
    "get_datasets": "read",
    "get_tabs": "read",
    "function_names": "read",
    "available": "read",
    "validate_sql": "read",
    "get_data": "read",
    "samples": "read",
    "delete_ssh_tunnel": "write",
    "get_updated_since": "read",
    "stop_query": "read",
    "get_user_slices": "read",
    "schemas_access_for_file_upload": "read",
    "get_objects": "read",
    "get_all_objects": "read",
    "add_objects": "write",
    "delete_object": "write",
    "copy_dash": "write",
    "get_connection": "write",
    "upload_metadata": "upload",
    "slack_channels": "write",
    "put_filters": "write",
    "put_colors": "write",
    "sync_permissions": "write",
    "restore": "write",
    "list_versions": "read",
    "get_version": "read",
    "activity": "read",
}
