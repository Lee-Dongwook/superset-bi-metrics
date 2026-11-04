"""JSON helpers, ported from superset/utils/json.py.

Superset uses simplejson; this port uses stdlib ``json`` and re-implements
simplejson's ``ignore_nan`` (NaN/Infinity -> null) by sanitizing floats.
"""

from __future__ import annotations

import decimal
import json
import logging
import math
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Callable, Optional, Union

import numpy as np
import pandas as pd
from flask_babel.speaklater import LazyString

logger = logging.getLogger(__name__)

JSONDecodeError = json.JSONDecodeError

# superset.utils.dates.EPOCH / datetime_to_epoch, inlined to keep the port small.
EPOCH = datetime(1970, 1, 1)


def datetime_to_epoch(dttm: datetime) -> float:
    """Convert datetime to milliseconds since epoch."""
    if dttm.tzinfo:
        return (dttm - EPOCH.replace(tzinfo=timezone.utc)).total_seconds() * 1000
    return (dttm - EPOCH).total_seconds() * 1000


class DashboardEncoder(json.JSONEncoder):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.sort_keys = True

    def default(self, o: Any) -> Union[dict[Any, Any], str]:
        if isinstance(o, uuid.UUID):
            return str(o)
        try:
            vals = {k: v for k, v in o.__dict__.items() if k != "_sa_instance_state"}
            return {f"__{o.__class__.__name__}__": vals}
        except Exception:  # pylint: disable=broad-except
            if isinstance(o, datetime):
                return {"__datetime__": o.replace(microsecond=0).isoformat()}
            return json.JSONEncoder(sort_keys=True).default(o)


def format_timedelta(time_delta: timedelta) -> str:
    """Render negative deltas readably: '-1 day, 5:06:00' not '-2 days, 18:54:00'."""
    if time_delta < timedelta(0):
        return "-" + str(abs(time_delta))
    return str(time_delta)


def base_json_conv(obj: Any) -> Any:  # noqa: C901
    """Convert additional types to JSON compatible forms, else raise TypeError."""
    if isinstance(obj, memoryview):
        obj = obj.tobytes()
    if isinstance(obj, np.int64):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, set):
        return list(obj)
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (uuid.UUID, time, LazyString)):
        return str(obj)
    if isinstance(obj, timedelta):
        return format_timedelta(obj)
    if isinstance(obj, pd.DateOffset):
        offset_attrs = ", ".join(f"{k}={v}" for k, v in obj.kwds.items())
        return f"DateOffset({offset_attrs})"
    if isinstance(obj, bytes):
        try:
            return obj.decode("utf-8")
        except Exception:  # pylint: disable=broad-except
            try:
                return obj.decode("utf-16")
            except Exception:  # pylint: disable=broad-except
                return "[bytes]"

    raise TypeError(f"Unserializable object {obj} of type {type(obj)}")


def json_iso_dttm_ser(obj: Any, pessimistic: bool = False) -> Any:
    """Serialize dates to ISO 8601; pessimistic mode never raises."""
    if isinstance(obj, (datetime, date, pd.Timestamp)):
        return obj.isoformat()

    try:
        return base_json_conv(obj)
    except TypeError:
        if pessimistic:
            logger.error("Failed to serialize %s", obj)
            return f"Unserializable [{type(obj)}]"
        raise


def pessimistic_json_iso_dttm_ser(obj: Any) -> Any:
    """json_iso_dttm_ser that succeeds even for unserializable objects."""
    return json_iso_dttm_ser(obj, pessimistic=True)


def json_int_dttm_ser(obj: Any) -> Any:
    """Serialize dates to epoch milliseconds."""
    if isinstance(obj, (datetime, pd.Timestamp)):
        return datetime_to_epoch(obj)

    if isinstance(obj, date):
        return (obj - EPOCH.date()).total_seconds() * 1000

    return base_json_conv(obj)


def json_dumps_w_dates(payload: dict[Any, Any], sort_keys: bool = False) -> str:
    """Dumps payload to JSON with Datetime objects properly converted"""
    return dumps(payload, default=json_int_dttm_ser, sort_keys=sort_keys)


def validate_json(obj: Union[bytes, bytearray, str]) -> None:
    """Raise JSONDecodeError if ``obj`` is non-empty and not valid JSON."""
    if obj:
        try:
            loads(obj)
        except JSONDecodeError as ex:
            logger.error("JSON is not valid %s", str(ex), exc_info=True)
            raise


def _nan_to_none(obj: Any) -> Any:
    # ponytail: full walk of the payload (simplejson does this in its encoder);
    # override the encoder's float formatting if this shows up in profiles.
    if isinstance(obj, float):
        return None if math.isnan(obj) or math.isinf(obj) else obj
    if isinstance(obj, dict):
        return {k: _nan_to_none(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_nan_to_none(v) for v in obj]
    return obj


def dumps(  # pylint: disable=too-many-arguments
    obj: Any,
    default: Optional[Callable[[Any], Any]] = json_iso_dttm_ser,
    allow_nan: bool = False,
    ignore_nan: bool = True,
    sort_keys: bool = False,
    indent: Union[str, int, None] = None,
    separators: Union[tuple[str, str], None] = None,
    cls: Union[type[json.JSONEncoder], None] = None,
    encoding: Optional[str] = "utf-8",  # kept for API parity; stdlib has no encoding
    ensure_ascii: bool = True,
) -> str:
    """Dump ``obj`` to JSON; with ``ignore_nan`` NaN/Infinity become null."""
    if ignore_nan:
        obj = _nan_to_none(obj)
        if default is not None:
            inner = default
            default = lambda o: _nan_to_none(inner(o))  # noqa: E731
    return json.dumps(
        obj,
        default=default,
        allow_nan=allow_nan,
        sort_keys=sort_keys,
        indent=indent,
        separators=separators,
        cls=cls,
        ensure_ascii=ensure_ascii,
    )


def _reject_constant(value: str) -> Any:
    raise JSONDecodeError(f"Out of range float values are not allowed: {value}", "", 0)


def loads(
    obj: Union[bytes, bytearray, str],
    encoding: Union[str, None] = None,
    allow_nan: bool = False,
    object_hook: Union[Callable[[dict[Any, Any]], Any], None] = None,
) -> Any:
    """Deserialize JSON; NaN/Infinity are rejected unless ``allow_nan``."""
    if encoding and isinstance(obj, (bytes, bytearray)):
        obj = obj.decode(encoding)
    return json.loads(
        obj,
        object_hook=object_hook,
        parse_constant=None if allow_nan else _reject_constant,
    )


# TODO(port): redact_sensitive / reveal_sensitive / get_masked_fields /
# set_masked_fields need jsonpath_ng and are only used for database
# encrypted_extra editing, which is outside the chart/query core path.
