import logging
from typing import Any

from flask import Response
from flask_appbuilder.api import ModelRestApi, expose, protect, rison as parse_rison, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_babel import ngettext

from core.api.base import statsd_metrics
from core.constants import MODEL_API_RW_METHOD_PERMISSION_MAP, RouteMethod
from core.css.filters import CssTemplateAllTextFilter
from core.css.models import CssTemplate
from core.css.schemas import get_delete_ids_schema, openapi_spec_methods_override
from core.extension import event_logger

logger = logging.getLogger(__name__)

_AUDIT_COLUMNS = [
    "changed_on",
    "changed_by.id",
    "changed_by.first_name",
    "changed_by.last_name",
    "created_by.id",
    "created_by.first_name",
    "created_by.last_name",
]


class CssTemplateApi(ModelRestApi):
    """CRUD for CSS templates at /api/v1/css_template/."""

    datamodel = SQLAInterface(CssTemplate)
    include_route_methods = RouteMethod.REST_MODEL_VIEW_CRUD_SET | {"bulk_delete"}
    class_permission_name = "CssTemplate"
    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP
    resource_name = "css_template"
    allow_browser_login = True

    show_columns = ["id", "template_name", "css", *_AUDIT_COLUMNS]
    list_columns = ["id", "template_name", "css", "created_on", *_AUDIT_COLUMNS]
    add_columns = ["template_name", "css"]
    edit_columns = add_columns
    order_columns = ["template_name", "changed_on"]
    search_filters = {"template_name": [CssTemplateAllTextFilter]}

    apispec_parameter_schemas = {"get_delete_ids_schema": get_delete_ids_schema}
    openapi_spec_tag = "CSS Templates"
    openapi_spec_methods = openapi_spec_methods_override

    @expose("/", methods=("DELETE",))
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.bulk_delete",
        log_to_statsd=False,
    )
    @parse_rison(get_delete_ids_schema)
    def bulk_delete(self, **kwargs: Any) -> Response:
        """Delete CSS templates by id: DELETE /api/v1/css_template/?q=!(1,2,3)
        ---
        delete:
          summary: Bulk delete CSS templates
          responses:
            200:
              description: CSS templates deleted
            404:
              $ref: '#/components/responses/404'
        """
        ids: list[int] = kwargs["rison"]
        items = self.datamodel.session.query(CssTemplate).filter(CssTemplate.id.in_(ids)).all()
        # All-or-nothing: a missing id means the client's view is stale.
        if len(items) != len(set(ids)):
            return self.response_404()
        self.datamodel.delete_all(items)
        return self.response(
            200,
            message=ngettext(
                "Deleted %(num)d css template",
                "Deleted %(num)d css templates",
                num=len(items),
            ),
        )
