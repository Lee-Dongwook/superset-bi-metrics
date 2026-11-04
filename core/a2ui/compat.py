from __future__ import annotations

import importlib
import inspect
from typing import Any
import warnings

def warn_moved(old: str, new: str) -> None:
    warnings.warn(
        f"'{old}' is deprecated, use '{new}' instead",
        DeprecationWarning,
        stacklevel=2,
    )

def re_export_all(new: str, target: dict[str, Any]) -> list[str]:
    mod = importlib.import_module(new)
    if hasattr(mod, "__all__"):
        public_names: list[str] = list(mod.__all__)
    else:
        public_names = [
            name
            for name in dir(mod)
            if not name.startswith("_") and not inspect.ismodule(getattr(mod, name))
        ]
        for name in target:
            if not name.startswith("_") and inspect.ismodule(target[name]):
                target.pop(name, None)
    for name in public_names:
        target[name] = getattr(mod, name)
    return public_names
