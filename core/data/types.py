from dataclasses import dataclass
from typing import Any, Callable, Optional, TypedDict, Union

from sqlalchemy import Column
from sqlalchemy.sql.expression import BinaryExpression

from core.utils.core import FilterValues, FilterOperator, FilterStringOperators

class AdvancedDataTypeRequest(TypedDict):
    advanced_data_type: str
    values: list[
        Union[FilterValues, None]
    ]

class AdvancedDataTypeResponse(TypedDict, total=False):
    error_message: Optional[str]
    values: list[Any]
    display_value: str
    valid_filter_operators: list[FilterStringOperators]


@dataclass
class AdvancedDataType:
    verbose_name: str
    description: str
    valid_data_types: list[str]
    translate_type: Callable[[AdvancedDataTypeRequest], AdvancedDataTypeResponse]
    translate_filter: Callable[[Column, FilterOperator, Any], BinaryExpression]
