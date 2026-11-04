from datetime import datetime

import numpy as np
import pandas as pd
import pytest

from core.dataframe import df_to_records
from core.legacy import update_time_range
from core.utils.core import (
    find_duplicates,
    format_list,
    get_column_name,
    get_column_names_from_columns,
    get_column_names_from_metrics,
    get_metric_name,
    get_x_axis_label,
    is_adhoc_column,
    is_adhoc_metric,
    markdown,
    remove_duplicates,
)
from core.utils.schema import is_query_context_metadata_complete

SIMPLE = {"expressionType": "SIMPLE", "aggregate": "SUM", "column": {"column_name": "num"}}
SQL = {"expressionType": "SQL", "sqlExpression": "COUNT(*)"}
ADHOC_COL = {"label": "x", "sqlExpression": "ds", "columnType": "BASE_AXIS"}


def test_adhoc_detection_and_names():
    assert is_adhoc_metric(SIMPLE) and not is_adhoc_metric("cnt")
    assert is_adhoc_column(ADHOC_COL) and not is_adhoc_column({"label": "x"})
    assert get_metric_name(SIMPLE) == "SUM(num)"
    assert get_metric_name(SQL) == "COUNT(*)"
    assert get_metric_name("cnt", {"cnt": "Count"}) == "Count"
    assert get_column_name("gender", {"gender": "Gender"}) == "Gender"
    assert get_column_name(ADHOC_COL) == "x"
    assert get_x_axis_label(["a", ADHOC_COL]) == "x"
    assert get_column_names_from_columns(["a", ADHOC_COL]) == ["a"]
    assert get_column_names_from_metrics([SIMPLE, SQL, "cnt"]) == ["num"]
    with pytest.raises(ValueError):
        get_metric_name({"expressionType": "SQL"})


def test_list_helpers():
    assert find_duplicates(["a", "b", "a", "c", "b"]) == ["a", "b"]
    assert remove_duplicates([1, 2, 1, 3]) == [1, 2, 3]
    assert remove_duplicates(["a", "A", "b"], key=str.lower) == ["a", "b"]
    assert format_list(['a', 'b"c']) == '"a", "b\\"c"'
    assert "<script" not in markdown("**hi** <script>x</script>")


def test_df_to_records():
    df = pd.DataFrame(
        {"ts": [datetime(2020, 1, 1), pd.NaT], "v": [1.5, np.nan], "big": [2**60, 1]}
    )
    assert df_to_records(df) == [
        {"ts": pd.Timestamp("2020-01-01"), "v": 1.5, "big": str(2**60)},
        {"ts": None, "v": None, "big": 1},
    ]


def test_update_time_range():
    fd = {"since": "2020", "until": None}
    update_time_range(fd)
    assert fd == {"time_range": "2020 : "}
    fd = {
        "granularity_sqla": "ds",
        "adhoc_filters": [{"subject": "ds", "comparator": "No filter"}],
    }
    update_time_range(fd)
    assert fd["time_range"] == "No filter"


def test_is_query_context_metadata_complete():
    ok = {"datasource": {"id": 1, "type": "table"}, "queries": []}
    assert is_query_context_metadata_complete(ok)
    assert not is_query_context_metadata_complete({**ok, "queries": None})
    assert not is_query_context_metadata_complete(
        {**ok, "datasource": {"id": 1, "type": "bogus"}}
    )
    assert not is_query_context_metadata_complete({**ok, "datasource": {"type": "table"}})
