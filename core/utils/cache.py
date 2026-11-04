"""Cache helpers, ported from superset/utils/cache.py."""

from __future__ import annotations

import logging
import pickle
from datetime import datetime, timezone
from typing import Any

from flask import current_app as app
from flask_caching import Cache
from flask_caching.backends import NullCache

from core.constants import CACHE_DISABLED_TIMEOUT
from core.utils.hashing import hash_from_dict
from core.utils.json import json_int_dttm_ser

logger = logging.getLogger(__name__)

# Superset config default (1 day), used when the app config doesn't set one.
CACHE_DEFAULT_TIMEOUT = 60 * 60 * 24


def generate_cache_key(values_dict: dict[str, Any], key_prefix: str = "") -> str:
    hash_str = hash_from_dict(values_dict, default=json_int_dttm_ser)
    cache_key = f"{key_prefix}{hash_str}"
    logger.debug(
        "Cache key generated: %s from dict keys: %s", cache_key, list(values_dict)
    )
    return cache_key


def set_and_log_cache(
    cache_instance: Cache,
    cache_key: str,
    cache_value: dict[str, Any],
    cache_timeout: int | None = None,
    datasource_uid: str | None = None,
) -> bool:
    """Write a value to the cache, logging outcomes.

    :returns: ``True`` only when the value was actually persisted; ``False``
        when caching was skipped (null cache, disabled timeout, value too large)
        or the backend write failed.
    """
    if isinstance(cache_instance.cache, NullCache):
        return False

    timeout = (
        cache_timeout
        if cache_timeout is not None
        else app.config.get("CACHE_DEFAULT_TIMEOUT", CACHE_DEFAULT_TIMEOUT)
    )
    if timeout == CACHE_DISABLED_TIMEOUT:
        return False
    try:
        dttm = datetime.now(timezone.utc).replace(tzinfo=None).isoformat().split(".")[0]
        value = {**cache_value, "dttm": dttm}

        # Skip oversized values to protect the cache backend; off when None.
        max_value_size = app.config.get("DATA_CACHE_MAX_VALUE_SIZE")
        if max_value_size is not None:
            value_size = len(pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL))
            if value_size > max_value_size:
                logger.warning(
                    "Skipping cache set for key %s: serialized value size %d bytes "
                    "exceeds DATA_CACHE_MAX_VALUE_SIZE (%d bytes)",
                    cache_key,
                    value_size,
                    max_value_size,
                )
                app.config["STATS_LOGGER"].incr("skip_cache_value_too_large")
                return False

        # set() returns bool | None; only an explicit False is a failure.
        if cache_instance.set(cache_key, value, timeout=timeout) is False:
            logger.warning("Cache backend reported a failed set for key %s", cache_key)
            return False
        app.config["STATS_LOGGER"].incr("set_cache_key")
        logger.debug(
            "CACHE SET - Key: %s, Datasource: %s, Timeout: %s",
            cache_key,
            datasource_uid,
            timeout,
        )
        # TODO(port): STORE_CACHE_KEYS_IN_METADATA_DB -> CacheKey row (needs the
        # superset.models.cache.CacheKey model, not ported).
        return True
    except Exception as ex:  # pylint: disable=broad-except
        logger.warning("Could not cache key %s", cache_key)
        logger.exception(ex)
        return False


# TODO(port): memoized_func / etag_cache view decorators are not ported; they
# need cache_manager.cache, configurable_hash_method and werkzeug responses,
# none of which the chart -> QueryContext -> Cube path uses yet.
