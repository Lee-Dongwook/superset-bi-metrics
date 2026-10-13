from __future__ import annotations

import pytest
from flask import Flask
from flask_appbuilder import AppBuilder

from core.cache_keys.api import CacheApi
from core.cache_keys.models import CacheKey
from core.css.api import CssTemplateApi
from core.domains.api import DomainRestApi
from core.extension import data_cache, db
from core.marshmallow_compatibility import patch_marshmallow_for_flask_appbuilder
from core.utils.log import AbstractEventLogger


@pytest.fixture
def client():
    patch_marshmallow_for_flask_appbuilder()
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY="test",
        SQLALCHEMY_DATABASE_URI="sqlite://",
        WTF_CSRF_ENABLED=False,
        FAB_ADD_SECURITY_API=True,
        STATS_LOGGER=None,
        CACHE_TYPE="SimpleCache",
        SUPERSET_WEBSERVER_DOMAINS=["a.example.com", "b.example.com"],
    )
    with app.app_context():
        db.init_app(app)
        data_cache.init_app(app)
        appbuilder = AppBuilder(app, db.session)
        appbuilder.add_api(CssTemplateApi)
        appbuilder.add_api(CacheApi)
        appbuilder.add_api(DomainRestApi)
        db.create_all()
        role = appbuilder.sm.find_role("Admin")
        appbuilder.sm.add_user("admin", "a", "d", "admin@x.io", role, password="pw")

        c = app.test_client()
        token = c.post(
            "/api/v1/security/login",
            json={"username": "admin", "password": "pw", "provider": "db"},
        ).json["access_token"]
        c.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        yield c


def test_css_template_crud(client) -> None:
    ids = [
        client.post("/api/v1/css_template/", json={"template_name": n, "css": "a{}"}).json["id"]
        for n in ("dark", "light")
    ]

    res = client.get("/api/v1/css_template/")
    assert res.status_code == 200
    assert {r["template_name"] for r in res.json["result"]} == {"dark", "light"}
    assert res.json["result"][0]["created_by"]["first_name"] == "a"

    # Missing id -> nothing deleted
    assert client.delete(f"/api/v1/css_template/?q=!({ids[0]},999)").status_code == 404
    res = client.delete(f"/api/v1/css_template/?q=!({ids[0]},{ids[1]})")
    assert res.status_code == 200, res.json
    assert res.json["message"] == "Deleted 2 css templates"
    assert client.get("/api/v1/css_template/").json["count"] == 0


def test_log_this_with_context_records_and_survives_logger_errors() -> None:
    events = []

    class Recorder(AbstractEventLogger):
        def log(self, user_id, action, dashboard_id, duration_ms, slice_id, referrer, *a, **kw):
            events.append(action)
            raise RuntimeError("logger down")

    rec = Recorder()

    class Api:
        @rec.log_this_with_context(action=lambda self, *a, **kw: f"{type(self).__name__}.get")
        def get(self) -> int:
            return 42

    assert Api().get() == 42
    assert events == ["Api.get"]


def test_cache_invalidate_by_datasource_uid(client) -> None:
    data_cache.set("k1", "rows")
    data_cache.set("k2", "rows")
    db.session.add_all(
        [
            CacheKey(cache_key="k1", datasource_uid="1__table"),
            CacheKey(cache_key="k2", datasource_uid="2__table"),
        ]
    )
    db.session.commit()

    res = client.post("/api/v1/cachekey/invalidate", json={"datasource_uids": ["1__table"]})
    assert res.status_code == 201
    assert data_cache.get("k1") is None
    assert data_cache.get("k2") == "rows"
    assert [k.cache_key for k in db.session.query(CacheKey)] == ["k2"]

    res = client.post(
        "/api/v1/cachekey/invalidate",
        json={"datasources": [{"datasource_name": "t", "datasource_type": "table"}]},
    )
    assert res.status_code == 400


def test_domains(client) -> None:
    res = client.get("/api/v1/domains/")
    assert res.status_code == 200
    assert res.json["result"] == {"domains": ["a.example.com", "b.example.com"]}
