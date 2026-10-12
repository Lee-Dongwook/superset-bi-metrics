import logging

from flask import current_app as app, Response
from flask_appbuilder.api import expose, protect, safe

from core.domains.schemas import DomainsSchema
from core.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from core.extension import event_logger
from core.api.base import BaseSuperSetBiMetricsAPI, statsd_metrics

logger = logging.getLogger(__name__)

class DomainRestApi:
    domains_schema = DomainsSchema()
    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP
    allow_browser_login = True
    class_permission_name="Domains"
    openapi_spec_tag="Real Domain"
    openapi_spec_component_schemas = (DomainsSchema,)

    @expose("/", methods=("GET",))
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get",
        log_to_statsd=True,
    )
    def get(self) -> Response:
        result = self.domains_schema.dump(
            {"domains": app.config.get("SUPERSET_WEBSERVER_DOMAINS")}
        )
        return self.response(200, result=result)

