import itertools
import logging
import threading

from flask import current_app as app, request, Response
from flask_appbuilder.api import expose, protect, safe
from marshmallow.exceptions import ValidationError

from core.api.base import BaseSuperSetBiMetricsAPI, statsd_metrics
from core.extension import event_logger
from core.metrics.schemas import MetricQueryRequestSchema
from core.query.types import QueryStatus
from core.semantic import CubeAsyncQueryHandle, CubeClient, CubeQueryBridge, MockCubeClient

logger = logging.getLogger(__name__)

# ponytail: per-process handle registry, move to Redis (DATA_CACHE_CONFIG) once core runs multiple workers.
_handles: dict[int, CubeAsyncQueryHandle] = {}
_query_ids = itertools.count(1)


def _run(handle: CubeAsyncQueryHandle) -> None:
    try:
        handle.execute()
    except Exception:  # pylint: disable=broad-except
        logger.exception("Metric query %s crashed", handle.query_id)
        handle.status = QueryStatus.FAILED
    finally:
        handle.bridge.cube_client.close()


class MetricsRestApi(BaseSuperSetBiMetricsAPI):
    """Runs Cube metric queries asynchronously: POST /api/v1/metrics/query, GET .../query/<id>/result.

    Progress is streamed over Redis -> WebSocket to the request's channel_id.
    """

    resource_name = "metrics"
    class_permission_name = "Metrics"
    method_permission_name = {"query": "write", "result": "read"}
    allow_browser_login = True
    openapi_spec_tag = "Metrics"
    openapi_spec_component_schemas = (MetricQueryRequestSchema,)

    @expose("/query", methods=("POST",))
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.query",
        log_to_statsd=False,
    )
    def query(self) -> Response:
        """Start a metric query; progress events go to the given channel_id.
        ---
        post:
          summary: Start an async Cube metric query
          requestBody:
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/MetricQueryRequestSchema'
          responses:
            202:
              description: Query accepted
            400:
              $ref: '#/components/responses/400'
        """
        try:
            payload = MetricQueryRequestSchema().load(request.json or {})
        except ValidationError as ex:
            return self.response_400(message=str(ex))

        cube_client = MockCubeClient() if app.config["CUBE_MOCK"] else CubeClient()
        query_id = next(_query_ids)
        handle = CubeAsyncQueryHandle(
            query_id=query_id,
            channel_id=payload["channel_id"],
            query=payload["query"],
            bridge=CubeQueryBridge(cube_client=cube_client),
        )
        _handles[query_id] = handle
        threading.Thread(target=_run, args=(handle,), daemon=True).start()
        return self.response(
            202,
            query_id=query_id,
            channel_id=handle.channel_id,
            result_url=f"/api/v1/metrics/query/{query_id}/result",
        )

    @expose("/query/<int:query_id>/result", methods=("GET",))
    @protect()
    @safe
    @statsd_metrics
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.result",
        log_to_statsd=False,
    )
    def result(self, query_id: int) -> Response:
        """Fetch a metric query's rows; 202 while it is still running.
        ---
        get:
          summary: Get an async Cube metric query result
          parameters:
          - in: path
            name: query_id
            schema:
              type: integer
          responses:
            200:
              description: Query finished (success or failure)
            202:
              description: Query still running
            404:
              $ref: '#/components/responses/404'
        """
        handle = _handles.get(query_id)
        if handle is None:
            return self.response_404()

        status = handle.get_status()
        if status in (QueryStatus.PENDING, QueryStatus.RUNNING):
            return self.response(202, query_id=query_id, status=status.value)
        try:
            result = handle.get_result()
        except RuntimeError:
            # Canceled or crashed before the bridge returned a result.
            return self.response(200, query_id=query_id, status=status.value, data=[], error=None)

        data = result.statements[0].data.to_dict(orient="records") if result.statements else []
        return self.response(
            200,
            query_id=query_id,
            status=result.status.value,
            data=data,
            error=result.error_message,
        )
