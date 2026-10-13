import logging
import marshmallow
from typing import Any

logger = logging.getLogger(__name__)

def patch_marshmallow_for_flask_appbuilder() -> None:
    if getattr(marshmallow.Schema._init_fields, "_fab_patched", False) or getattr(
        marshmallow.Schema._init_fields, "__superset_compat_patched__", False
    ): 
        return
    
    original_init_fields = marshmallow.Schema._init_fields

    def patched_init_fields(self: "marshmallow.Schema") -> Any:
        opts = self.opts
        candidates = set(opts.fields or ()) | set(getattr(opts, "additional", ()) or ())
        declared_fields = dict(getattr(self, "declared_fields", {}))
        for name in candidates:
            if name not in declared_fields and _looks_like_fab_field(name):
                logger.debug(
                    "marshmallow FAB compat: stubbing Raw field for %r on %s",
                    name,
                    type(self).__name__,
                )
                declared_fields[name] = marshmallow.fields.Raw(
                    allow_none=True,
                    load_default=None,
                )
        self.declared_fields = declared_fields
        return original_init_fields(self)
    
    patched_init_fields._fab_patched = True 
    patched_init_fields.__superset_compat_patched__ = True  
    marshmallow.Schema._init_fields = patched_init_fields


def _looks_like_fab_field(name: str) -> bool:
    return bool(name) and not name.startswith("_") and name.replace("_", "").isalnum()
