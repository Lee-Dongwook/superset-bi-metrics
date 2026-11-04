from typing import Any

from core.utils.core import DatasourceType


def is_query_context_metadata_complete(value: Any) -> bool:
    """
    Whether a parsed ``query_context`` payload carries the ``datasource`` and
    ``queries`` keys ``QueryContextFactory.create()`` requires.

    ``datasource`` must be a mapping with a truthy ``id`` and a ``type`` that is a
    valid ``DatasourceType``; ``queries`` must be a (possibly empty) list of mappings.

    :param value: the object obtained by JSON-decoding a query_context string
    """
    if not isinstance(value, dict) or not isinstance(value.get("queries"), list):
        return False
    if not all(isinstance(query, dict) for query in value["queries"]):
        return False
    datasource = value.get("datasource")
    if not isinstance(datasource, dict) or not datasource.get("id"):
        return False
    datasource_type = datasource.get("type")
    if not isinstance(datasource_type, str):
        return False
    try:
        DatasourceType(datasource_type)
    except ValueError:
        return False
    return True
