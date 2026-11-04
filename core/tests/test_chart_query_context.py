"""End-to-end: saved chart → QueryContext → SemanticView (mock Cube) → JSON payload."""

from __future__ import annotations

import json

import pytest
from flask import Flask
from flask_appbuilder import AppBuilder

from core.common.query.object import QueryObject
from core.daos.chart import ChartDAO
from core.exceptions import QueryObjectValidationError
from core.extension import data_cache, db
from core.marshmallow_compatibility import patch_marshmallow_for_flask_appbuilder
from core.models.slice import Slice
from core.query.types import QueryStatus
from core.semantic.mapper import map_filter, map_query_object
from core.semantic.models import SemanticLayer, SemanticView
from core.semantic.redis_publisher import RedisEventPublisher
from core.utils import json as core_json
from core.utils.json import json_int_dttm_ser

CUBE_META = {
    "measures": [
        {"name": "Orders.count", "title": "Orders", "type": "count"},
        {"name": "Orders.totalAmount", "title": "Revenue", "type": "sum"},
    ],
    "dimensions": [
        {"name": "Orders.status", "title": "Status", "type": "string"},
        {"name": "Orders.createdAt", "title": "Created", "type": "time"},
    ],
}
X_AXIS = {
    "columnType": "BASE_AXIS",
    "sqlExpression": "Orders.createdAt",
    "label": "Orders.createdAt",
    "timeGrain": "P1M",
}
TIME_RANGE = "2026-01-01 : 2026-04-01"


@pytest.fixture
def app(monkeypatch):
    # No Redis/WebSocket in tests, and skip the mock Cube's continue-wait polling delay.
    monkeypatch.setattr(RedisEventPublisher, "publish", lambda *a, **kw: True)
    monkeypatch.setattr("core.semantic.bridge.time.sleep", lambda _s: None)

    patch_marshmallow_for_flask_appbuilder()
    app = Flask(__name__)
    app.config.from_object("core.config")
    app.config.update(
        SQLALCHEMY_DATABASE_URI="sqlite://",
        CUBE_MOCK=True,
        DATA_CACHE_CONFIG={"CACHE_TYPE": "SimpleCache"},
    )
    with app.app_context():
        db.init_app(app)
        data_cache.init_app(app, app.config["DATA_CACHE_CONFIG"])
        AppBuilder(app, db.session)
        db.create_all()
        yield app


def _chart(view: SemanticView, queries: list[dict]) -> Slice:
    chart = Slice(
        slice_name="Orders by month",
        viz_type="echarts_timeseries_bar",
        datasource_id=view.id,
        datasource_type="semantic_view",
        params=json.dumps({"x_axis": "Orders.createdAt", "time_range": TIME_RANGE}),
        query_context=json.dumps(
            {"datasource": {"id": view.id, "type": "semantic_view"}, "queries": queries}
        ),
    )
    db.session.add(chart)
    db.session.commit()
    return chart


def _view() -> SemanticView:
    layer = SemanticLayer(name="cube", type="cube")
    view = SemanticView(name="Orders", configuration=CUBE_META, semantic_layer=layer)
    db.session.add(view)
    db.session.commit()
    return view


def test_saved_chart_runs_through_cube(app) -> None:
    view = _view()
    assert view.perm == f"[cube].[Orders](id:{view.id})"

    chart = _chart(
        view,
        [
            {
                "metrics": ["Orders.count"],
                "columns": [X_AXIS, "Orders.status"],
                "filters": [{"col": "Orders.createdAt", "op": "TEMPORAL_RANGE", "val": "No filter"}],
                "time_range": TIME_RANGE,
                "orderby": [["Orders.count", False]],
            }
        ],
    )
    assert chart.perm == view.perm  # set_related_perm copies the datasource's perm
    assert ChartDAO.find_by_id(chart.id) is chart
    assert Slice.get(str(chart.uuid)) is chart

    payload = chart.get_query_context().get_payload()
    (query,) = payload["queries"]
    assert query["status"] == QueryStatus.SUCCESS, query["error"]
    assert query["colnames"] == ["Orders.createdAt", "Orders.status", "Orders.count"]
    assert query["rowcount"] == 9  # Jan–Mar × 3 statuses
    first = query["data"][0]
    assert isinstance(first["Orders.count"], int)
    # Timestamps stay as-is; the response serializer turns them into epoch ms.
    serialized = json.loads(core_json.dumps(first, default=json_int_dttm_ser))
    assert serialized["Orders.createdAt"] == 1767225600000  # 2026-01-01T00:00:00Z
    assert not query["is_cached"]  # None on a fresh run, as in Superset

    # The TEMPORAL_RANGE filter was overwritten with the query's time range and
    # became the Cube dateRange; Superset's exclusive end maps to Cube's inclusive one.
    cube_query = json.loads(query["query"])
    assert cube_query["timeDimensions"] == [
        {
            "dimension": "Orders.createdAt",
            "granularity": "month",
            "dateRange": ["2026-01-01T00:00:00.000", "2026-03-31T23:59:59.999"],
        }
    ]
    assert cube_query["order"] == {"Orders.count": "desc"}

    again = chart.get_query_context().get_payload()["queries"][0]
    assert again["is_cached"] is True
    assert again["data"] == query["data"]


def test_query_failures_are_reported_in_the_payload(app) -> None:
    view = _view()
    chart = _chart(
        view,
        [
            {"metrics": ["Orders.count"], "columns": ["Orders.nope"]},
            {
                "metrics": ["Orders.count"],
                "columns": ["Orders.status"],
                "post_processing": [{"operation": "pivot", "options": {}}],
            },
        ],
    )
    missing, post_processed = chart.get_query_context().get_payload()["queries"]
    assert missing["status"] == QueryStatus.FAILED
    assert "Orders.nope" in missing["error"]
    assert post_processed["status"] == QueryStatus.FAILED
    assert "Unsupported post processing operation: pivot" in post_processed["error"]


def test_mapper_filters_and_rejections() -> None:
    assert map_filter({"col": "Orders.status", "op": "IN", "val": ["shipped", "completed"]}) == {
        "member": "Orders.status",
        "operator": "equals",
        "values": ["shipped", "completed"],
    }
    assert map_filter({"col": "Orders.status", "op": "ILIKE", "val": "%ship%"})["operator"] == "contains"
    assert map_filter({"col": "Orders.status", "op": "IS NULL"}) == {
        "member": "Orders.status",
        "operator": "notSet",
    }
    assert map_filter({"col": "Orders.createdAt", "op": "TEMPORAL_RANGE", "val": "Last week"}) is None

    sql_metric = {"expressionType": "SQL", "sqlExpression": "SUM(x)", "label": "s"}
    with pytest.raises(QueryObjectValidationError):
        map_query_object(QueryObject(metrics=[sql_metric], columns=["Orders.status"]))
    with pytest.raises(QueryObjectValidationError):
        map_query_object(QueryObject(metrics=["Orders.count"], series_limit=5))
