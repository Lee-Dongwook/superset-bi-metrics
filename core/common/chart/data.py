from core.utils.backports import StrEnum

class ChartDataResultFormat(StrEnum):
    CSV = "csv"
    JSON = "json"
    XLSX = "xlsx"
    ARROW = "arrow"

    @classmethod
    def table_like(cls) -> set["ChartDataResultFormat"]:
        return {cls.CSV} | {cls.XLSX}

class ChartDataResultType(StrEnum):
    COLUMNS = "columns"
    FULL = "full"
    QUERY = "query"
    RESULTS = "results"
    SAMPLES = "samples"
    TIMEGRAINS = "timegrains"
    POST_PROCESSED = "post_processed"
    DRILL_DETAIL = "drill_detail"
