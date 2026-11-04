"""Back-compat aliases; the mixins live in core/models/helpers.py (Superset's layout)."""

from core.models.helpers import AuditMixinNullable as AuditMixin, UUIDMixin

__all__ = ["AuditMixin", "UUIDMixin"]
