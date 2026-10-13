import itertools
import string
from typing import Any

from sqlalchemy import Column

from core.data.types import (
    AdvancedDataType,
    AdvancedDataTypeRequest,
    AdvancedDataTypeResponse,
)
from core.utils.core import FilterOperator, FilterStringOperators

port_conversion_dict: dict[str, list[int]] = {
    "http": [80],
    "ssh": [22],
    "https": [443],
    "ftp": [20, 21],
    "ftps": [989, 990],
    "telnet": [23],
    "telnets": [992],
    "smtp": [25],
    "submissions": [465],
    "kerberos": [88],
    "kerberos-adm": [749],
    "poperator3": [110],
    "poperator3s": [995],
    "nntp": [119],
    "nntps": [563],
    "ntp": [123],
    "snmp": [161],
    "ldap": [389],
    "ldaps": [636],
    "imap2": [143],
    "imaps": [993],
    "MySQL": [3306],
    "Remote Desktop": [3389],
    "dns": [53],
    "ctf": [84],
    "pdap": [344],
}

def port_translation_func(req: AdvancedDataTypeRequest) -> AdvancedDataTypeResponse:
    resp: AdvancedDataTypeResponse = {

    }

    if req["values"] == [""]:
        resp["values"].append("")
        return resp
    for val in req["values"]:
        string_value = str(val)
        try:
            if string_value.isnumeric():
                if not 1 <= int(string_value) <= 65535:
                    raise ValueError
            resp["values"].append(
                [int(string_value)]
                if string_value.isnumeric()
                else port_conversion_dict[string_value]
            )
        except (KeyError, ValueError):
            resp["error_message"] = (
                f"'{string_value}' is invalid to be a port name or number"
            )
            break
        else:
            resp["display_value"] = ", ".join(
                map( # noqa: C417
                    lambda x: (
                        f"{x['start']} - {x['end']}" if isinstance(x, dict) else str(x)
                    ),
                    resp["values"],
                )
            )
    return resp

def port_translate_filter_func(col: Column, operator: FilterOperator, values: list[Any]) -> Any:
    return_expression: Any
    if operator in (FilterOperator.IN, FilterOperator.NOT_IN):
        vals_list = itertools.chain.from_iterable(values)
        if operator == FilterOperator.IN:
            cond = col.in_(vals_list)
        elif operator == FilterOperator.NOT_IN:
            cond = ~(col.in_(vals_list))
        return_expression = cond

    if len(values) == 1:
        value = values[0]
        value.sort()

        if operator == FilterOperator.EQUALS:
            return_expression = col.in_(value)
        if operator == FilterOperator.GREATER_THAN_OR_EQUALS:
            return_expression = col >= value[0]
        if operator == FilterOperator.GREATER_THAN:
            return_expression = col > value[0]
        if operator == FilterOperator.LESS_THAN:
            return_expression = col < value[-1]
        if operator == FilterOperator.LESS_THAN_OR_EQUALS:
            return_expression = col <= value[-1]
        if operator == FilterOperator.NOT_EQUALS:
            return_expression = ~col.in_(value)
    
    return return_expression

port: AdvancedDataType = AdvancedDataType(
    verbose_name="port",
    description="represents of a port",
    valid_data_types=["int"],
    translate_filter=port_translate_filter_func,
    translate_type=port_translation_func,
)
