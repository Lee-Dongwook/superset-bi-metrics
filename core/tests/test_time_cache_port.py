from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pandas as pd
from flask import Flask

from core.common.utils.query_cache_manager import QueryCacheManager
from core.extension import data_cache
from core.query.types import QueryStatus
from core.stats_logger import DummyStatsLogger
from core.utils import json
from core.utils.date_parser import get_since_until
from core.utils.hashing import hash_from_dict


def test_get_since_until() -> None:
    assert get_since_until("No filter") == (None, None)

    since, until = get_since_until("Last week")
    today = datetime.combine(datetime.now().date(), datetime.min.time())
    assert (since, until) == (today - timedelta(days=7), today)

    assert get_since_until("2024-01-01 : 2024-02-01") == (
        datetime(2024, 1, 1),
        datetime(2024, 2, 1),
    )
    assert get_since_until('DATEADD(DATETIME("2024-01-10"), -7, day) : 2024-01-10') == (
        datetime(2024, 1, 3),
        datetime(2024, 1, 10),
    )


def test_hash_from_dict_is_key_order_independent() -> None:
    a = hash_from_dict({"a": 1, "b": [1, 2]})
    assert a == hash_from_dict({"b": [1, 2], "a": 1})
    assert a != hash_from_dict({"a": 2, "b": [1, 2]})
    assert len(a) == 64  # sha256 default outside an app context


def test_json_dumps_dates_and_nan() -> None:
    out = json.dumps(
        {"t": datetime(1970, 1, 2), "n": float("nan"), "l": [float("inf")]},
        default=json.json_int_dttm_ser,
        sort_keys=True,
    )
    assert out == '{"l": [null], "n": null, "t": 86400000.0}'
    assert json.loads(out)["t"] == 86400000.0


def test_query_cache_manager_round_trip() -> None:
    app = Flask(__name__)
    app.config["STATS_LOGGER"] = DummyStatsLogger()
    data_cache.init_app(app, config={"CACHE_TYPE": "SimpleCache"})
    df = pd.DataFrame({"x": [1, 2]})
    result = SimpleNamespace(
        status=QueryStatus.SUCCESS,
        query="Q",
        applied_template_filters=[],
        applied_filter_columns=[],
        rejected_filter_columns=[],
        error_message=None,
        df=df,
        sql_rowcount=2,
        semantic_cache_status=None,
    )
    with app.app_context():
        qcm = QueryCacheManager()
        qcm.set_query_result("k1", result, timeout=60)  # type: ignore[arg-type]
        assert qcm.result_persisted

        hit = QueryCacheManager.get("k1")
        assert hit.is_cached and hit.status == QueryStatus.SUCCESS
        assert hit.df.equals(df) and hit.query == "Q" and hit.sql_rowcount == 2
        assert not QueryCacheManager.get("missing").is_loaded
