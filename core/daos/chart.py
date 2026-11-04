"""ChartDAO (lookup subset), ported from superset/daos/chart.py."""

from __future__ import annotations

from typing import Any

from core.extension import db
from core.models.slice import id_or_uuid_filter, Slice


class ChartDAO:
    model_cls = Slice

    @classmethod
    def find_by_id(cls, model_id: str | int) -> Slice | None:
        return db.session.query(Slice).filter(id_or_uuid_filter(model_id)).one_or_none()

    @classmethod
    def find_by_ids(cls, model_ids: list[Any]) -> list[Slice]:
        return db.session.query(Slice).filter(Slice.id.in_(model_ids)).all()
