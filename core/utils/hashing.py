"""Non-cryptographic hashing helpers, ported from superset/utils/hashing.py."""

from __future__ import annotations

import hashlib
import logging
from typing import Any, Callable, Literal, Optional

from flask import current_app, has_app_context

from core.utils import json

logger = logging.getLogger(__name__)

HashAlgorithm = Literal["md5", "sha256"]

DEFAULT_HASH_ALGORITHM: HashAlgorithm = "sha256"

_HASH_CONSTRUCTORS: dict[HashAlgorithm, Callable[[bytes], Any]] = {
    "sha256": hashlib.sha256,
    "md5": hashlib.md5,  # noqa: S324
}


def get_hash_algorithm() -> HashAlgorithm:
    """App config ``HASH_ALGORITHM``, or sha256 outside an app context."""
    if has_app_context():
        return current_app.config.get("HASH_ALGORITHM", DEFAULT_HASH_ALGORITHM)
    return DEFAULT_HASH_ALGORITHM


def hash_from_str(val: str, algorithm: Optional[HashAlgorithm] = None) -> str:
    """Hex digest of ``val`` using the configured (or given) algorithm."""
    if algorithm is None:
        algorithm = get_hash_algorithm()

    ctor = _HASH_CONSTRUCTORS.get(algorithm)
    if ctor is None:
        raise ValueError(f"Unsupported hash algorithm: {algorithm}")

    return ctor(val.encode("utf-8")).hexdigest()


def hash_from_dict(
    obj: dict[Any, Any],
    ignore_nan: bool = False,
    default: Optional[Callable[[Any], Any]] = None,
    algorithm: Optional[HashAlgorithm] = None,
) -> str:
    """Hash of the key-sorted JSON form of ``obj``."""
    json_data = json.dumps(
        obj, sort_keys=True, ignore_nan=ignore_nan, default=default, allow_nan=True
    )
    return hash_from_str(json_data, algorithm=algorithm)


# Legacy Superset names (pre-HASH_ALGORITHM), always md5.
def md5_sha_from_str(val: str) -> str:
    return hash_from_str(val, algorithm="md5")


def md5_sha_from_dict(
    obj: dict[Any, Any],
    ignore_nan: bool = False,
    default: Optional[Callable[[Any], Any]] = None,
) -> str:
    return hash_from_dict(obj, ignore_nan=ignore_nan, default=default, algorithm="md5")
