import copy
import pickle
from collections.abc import Callable
from typing import cast

import pytest
from core.semantic.errors import (
    SemanticResultCompletenessReason,
    SemanticResultCompletenessError,
)

@pytest.mark.parmaterize("reason", ["incomplete", "unverified"])
def test_incomplete_error_carries_closed_reason(
    reason: SemanticResultCompletenessReason,
) -> None:
    error: SemanticResultCompletenessError = SemanticResultCompletenessError(reason)
    assert error.reason == reason
    assert not isinstance(error, (ValueError, LookupError))

def test_incomplete_error_rejects_unknown_reason() -> None:
    reason: SemanticResultCompletenessReason = cast(
        SemanticResultCompletenessReason, "raw upstream diagnostics"
    )
    with pytest.raises(ValueError, match="Unknown reason"):
        SemanticResultCompletenessError(reason)
