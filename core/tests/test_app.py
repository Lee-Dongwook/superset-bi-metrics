from __future__ import annotations

import sys

import pytest

from core.app import create_app


@pytest.fixture
def env(monkeypatch, tmp_path):
    monkeypatch.setenv("SUPERSET_HOME", str(tmp_path))
    monkeypatch.delenv("FLASK_DEBUG", raising=False)
    # core.config reads the environment at import time.
    monkeypatch.delitem(sys.modules, "core.config", raising=False)
    return monkeypatch


def test_create_app_serves_health_and_protects_apis(env) -> None:
    env.setenv("SUPERSET_SECRET_KEY", "test")
    client = create_app().test_client()

    assert client.get("/health").data == b"OK"
    assert client.get("/api/v1/domains/").status_code == 401


def test_create_app_refuses_default_secret_key_outside_debug(env) -> None:
    env.delenv("SUPERSET_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_app()
