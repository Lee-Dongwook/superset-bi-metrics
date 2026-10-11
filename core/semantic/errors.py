from __future__ import annotations

from typing import get_args, Literal, TypeAlias

SemanticResultCompletenessReason: TypeAlias = Literal["incomplete", "unverified"]

class SemanticResultCompletenessError(Exception):
    def __init__(self, reason: SemanticResultCompletenessReason) -> None:
        if reason not in get_args(SemanticResultCompletenessReason):
            raise ValueError("Unknown reason")
        
        super().__init__(reason)
        self.reason: SemanticResultCompletenessReason = reason
