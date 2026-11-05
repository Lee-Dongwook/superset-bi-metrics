
from collections.abc import Iterable

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


class CacheRegion(StrEnum):
    DEFAULT = "default"
    DATA = "data"
    THUMBNAIL = "thumbnail"


# Special cache timeout value meaning "do not cache".
CACHE_DISABLED_TIMEOUT = -1


class SemanticCacheStatus(StrEnum):
    """Containment-cache provenance of a semantic query result (HIT/MISS/MIXED)."""

    HIT = "HIT"
    MISS = "MISS"
    MIXED = "MIXED"

    @classmethod
    def from_hits(cls, hits: Iterable[bool]) -> "SemanticCacheStatus":
        """Roll per-semantic-query hit flags up to one status."""
        outcomes: tuple[bool, ...] = tuple(hits)
        if outcomes and all(outcomes):
            return cls.HIT
        if any(outcomes):
            return cls.MIXED
        return cls.MISS

    @classmethod
    def combine(cls, statuses: Iterable[object]) -> "SemanticCacheStatus":
        """Roll per-query statuses up; missing statuses count as misses."""
        values: tuple[object, ...] = tuple(statuses)
        if values and all(value == cls.HIT for value in values):
            return cls.HIT
        if any(value in (cls.HIT, cls.MIXED) for value in values):
            return cls.MIXED
        return cls.MISS

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


class TimeGrain(StrEnum):
    SECOND = "PT1S"
    FIVE_SECONDS = "PT5S"
    THIRTY_SECONDS = "PT30S"
    MINUTE = "PT1M"
    FIVE_MINUTES = "PT5M"
    TEN_MINUTES = "PT10M"
    FIFTEEN_MINUTES = "PT15M"
    THIRTY_MINUTES = "PT30M"
    HALF_HOUR = "PT0.5H"
    HOUR = "PT1H"
    SIX_HOURS = "PT6H"
    DAY = "P1D"
    WEEK = "P1W"
    WEEK_STARTING_SUNDAY = "1969-12-28T00:00:00Z/P1W"
    WEEK_STARTING_MONDAY = "1969-12-29T00:00:00Z/P1W"
    WEEK_ENDING_SATURDAY = "P1W/1970-01-03T00:00:00Z"
    WEEK_ENDING_SUNDAY = "P1W/1970-01-04T00:00:00Z"
    MONTH = "P1M"
    QUARTER = "P3M"
    QUARTER_YEAR = "P0.25Y"
    YEAR = "P1Y"
