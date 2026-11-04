from __future__ import annotations

from typing import Any

from flask import current_app, has_app_context

# Superset reads these from config.DEFAULT_FEATURE_FLAGS; only flags the ported
# code checks are listed here.
DEFAULT_FEATURE_FLAGS: dict[str, bool] = {
    "SOFT_DELETE": False,
    "DATE_RANGE_TIMESHIFTS_ENABLED": False,
}


class FeatureFlagManager:
    """Superset's FeatureFlagManager, reading flags lazily from the current app.

    Superset binds flags once in ``init_app``; reading ``FEATURE_FLAGS`` on each
    call keeps tests and the CLI working without an init step.
    """

    def get_feature_flags(self) -> dict[str, Any]:
        flags = dict(DEFAULT_FEATURE_FLAGS)
        if has_app_context():
            flags.update(current_app.config.get("FEATURE_FLAGS") or {})
        return flags

    def is_feature_enabled(self, feature: str) -> bool:
        return bool(self.get_feature_flags().get(feature, False))


feature_flag_manager = FeatureFlagManager()
is_feature_enabled = feature_flag_manager.is_feature_enabled
