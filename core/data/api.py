from typing import Any

from flask import current_app as app
from flask.wrappers import Response
from flask_appbuilder.api import (
    expose,
    permission_name,
    protect,
    rison as parse_rison,
    safe,
)
from flask_babel import lazy_gettext as _

from core.data.schemas import (
    advanced_data_type_convert_schema,
    AdvancedDataTypeSchema,
)

from core.data.types import AdvancedDataTypeResponse
from core.extension import event_logger

class AdvancedDataTypeApi():
    allow_browser_login = True
    resource_name = "advanced_data_type"
    class_permission_name = "AdvancedDataType"

    openapi_spec_tag = "Advanced Data Type"
    apispec_parameter_schemas = {
        "advanced_data_type_convert_schema": advanced_data_type_convert_schema,
    }
    openapi_spec_component_schemas = (AdvancedDataTypeSchema,)
    @protect()
    @safe
    @expose("/convert", methods=("GET",))
    @permission_name("read")
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get",
        log_to_statsd=False,  
    )
    @parse_rison(advanced_data_type_convert_schema)
    def get(self, **kwargs: Any) -> Response:
        item = kwargs["rison"]
        advanced_data_type = item["type"]
        values = item["values"]
        addon = app.config["ADVANCED_DATA_TYPES"].get(advanced_data_type)
        if not addon:
            return self.response(
                400,
                message= _(
                    "Invalid advanced data type: %(advanced_data_type)s",
                    advanced_data_type=advanced_data_type,
                ),
            )
        
        bus_resp: AdvancedDataTypeResponse = addon.translate_type(
            {
                "values": values,
            }
        )
        return self.response(200, result=bus_resp)

    @protect()
    @safe
    @expose("/types", methods=("GET",))
    @permission_name("read")
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get",
        log_to_statsd=False, 
    )
    def get_types(self) -> Response:
        return self.response(200, result=list(app.config["ADVANCED_DATA_TYPES"].keys()))
