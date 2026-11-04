"""DatasourceDAO, ported from superset/daos/datasource.py.

Only semantic views are registered; Superset also maps tables, queries and
saved queries here (TODO(port) with the SQL datasources).
"""

from __future__ import annotations

import logging
import uuid
from typing import Union

from core.daos.exceptions import (
    DatasourceNotFound,
    DatasourceTypeNotSupportedError,
    DatasourceValueIsIncorrect,
)
from core.extension import db
from core.semantic.models import SemanticView
from core.utils.core import DatasourceType

logger = logging.getLogger(__name__)

Datasource = SemanticView


class DatasourceDAO:
    sources: dict[Union[DatasourceType, str], type[Datasource]] = {
        DatasourceType.SEMANTIC_VIEW: SemanticView,
    }

    @classmethod
    def get_datasource(
        cls,
        datasource_type: Union[DatasourceType, str],
        database_id_or_uuid: int | str,
    ) -> Datasource:
        if datasource_type not in cls.sources:
            raise DatasourceTypeNotSupportedError()

        model = cls.sources[datasource_type]

        if str(database_id_or_uuid).isdecimal():
            filter_ = model.id == int(database_id_or_uuid)
        else:
            try:
                key = uuid.UUID(str(database_id_or_uuid))
            except ValueError as err:
                logger.warning(
                    "database_id_or_uuid %s isn't valid uuid", database_id_or_uuid
                )
                raise DatasourceValueIsIncorrect() from err
            filter_ = model.uuid == key

        datasource = db.session.query(model).filter(filter_).one_or_none()

        if not datasource:
            logger.warning(
                "Datasource not found datasource_type: %s, database_id_or_uuid: %s",
                datasource_type,
                database_id_or_uuid,
            )
            raise DatasourceNotFound()

        return datasource

    @classmethod
    def get_datasources_by_ids(
        cls, datasource_type: str, datasource_ids: set[int]
    ) -> dict[int, Datasource]:
        """Fetch typed integer references in one query; omit invalid/missing IDs."""
        if datasource_type not in cls.sources:
            raise DatasourceTypeNotSupportedError()
        ids: set[int] = {
            value for value in datasource_ids if type(value) is int and value > 0
        }
        if not ids:
            return {}
        model = cls.sources[datasource_type]
        return {
            item.id: item
            for item in db.session.query(model).filter(model.id.in_(ids)).all()
        }
