from re import M
from core.errors import CommonErrorType, ErrorLevel

error_payload_content = {
    "application/json": {
        "schema": {
            "type": "object",
            "properties": {
                "errors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string"},
                            "error_type": {
                                "type": "string",
                                "enum": [enum.value for enum in CommonErrorType]
                            },
                            "level": {
                                "type": "string",
                                "enum": [enum.value for enum in ErrorLevel]
                            },
                            "extra": {"type": "object"},
                        },
                    },
                },
                "message": {"type": "string"},
            },
        },
    },
}
