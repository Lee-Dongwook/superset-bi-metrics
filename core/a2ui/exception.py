import dataclasses
import enum
import re


@dataclasses.dataclass(frozen=True)
class BIMetricsA2UIErrorDetail:
    path: str
    code: str
    message: str
    surface_id: str | None = None

    def to_dict(self) -> dict[str, str]:
        res = {"path": self.path, "code": self.code, "message": self.message}
        if self.surface_id is not None:
            res["surfaceId"] = self.surface_id
        return res

_PASSTHROUGH_DETAIL_CODES = frozenset({
    "UNALLOWED_PARENT",
    "UNALLOWED_CHILD",
    "INVALID_FUNCTION_CALL",
    "INVALID_RESERVED_KEY",
})

class BIMetricsA2UIError(ValueError):
    DEFAULT_CODE: str | None = None

    def __init__(
        self,
        message: str,
        details: list[BIMetricsA2UIErrorDetail] | None = None,
        *,
        code: str | None = None,
        path: str | None = None,
        surface_id: str | None = None,
        function_call_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message: str = message
        self.details: list[BIMetricsA2UIErrorDetail] = details or []
        first_detail = self.details[0] if self.details else None
        resolved_code = code
        if resolved_code is None:
            if first_detail and first_detail.code in _PASSTHROUGH_DETAIL_CODES:
                resolved_code = first_detail.code
            else:
                resolved_code = self.DEFAULT_CODE
        self.code: str | None = resolved_code
        self.path: str | None = (
            path
            if path is not None
            else (first_detail.path if first_detail and first_detail.path else None)
        )
        self.surface_id: str | None = (
            surface_id
            if surface_id is not None
            else (first_detail.surface_id if first_detail else None)
        )
        self.function_call_id: str | None = function_call_id
