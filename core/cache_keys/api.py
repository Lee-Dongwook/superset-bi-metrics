import logging

from flask import request, Response
from flask_appbuilder.api import BaseApi, expose, protect, safe
from marshmallow.exceptions import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from core.cache_keys.models import CacheKey
from core.cache_keys.schemas import CacheInvalidationRequestSchema
from core.extension import data_cache, db, event_logger

logger = logging.getLogger(__name__)


class CacheApi(BaseApi):
    """Invalidates cached query results per datasource: POST /api/v1/cachekey/invalidate."""

    resource_name = "cachekey"
    class_permission_name = "CacheRestApi"
    method_permission_name = {"invalidate": "invalidate"}
    allow_browser_login = True
    openapi_spec_tag = "Cache Keys"
    openapi_spec_component_schemas = (CacheInvalidationRequestSchema,)

    @expose("/invalidate", methods=("POST",))
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.invalidate",
        log_to_statsd=False,
    )
    def invalidate(self) -> Response:
        """Drop every cached result recorded for the given datasources.
        ---
        post:
          summary: Invalidate cache records for datasources
          requestBody:
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/CacheInvalidationRequestSchema'
          responses:
            201:
              description: Cache invalidated
            400:
              $ref: '#/components/responses/400'
        """
        try:
            payload = CacheInvalidationRequestSchema().load(request.json or {})
        except ValidationError as ex:
            return self.response_400(message=str(ex))
        if payload.get("datasources"):
            # ponytail: name-based lookup needs the dataset model; add once datasets are ported.
            return self.response_400(message="Lookup by datasource name is not supported yet; use datasource_uids")

        uids = set(payload.get("datasource_uids", []))
        keys = [
            k for (k,) in db.session.query(CacheKey.cache_key).filter(CacheKey.datasource_uid.in_(uids))
        ]
        if not keys:
            return self.response(201)

        # The cache is not persistent storage: keys may have expired already.
        if not data_cache.delete_many(*keys):
            logger.info("Some cache keys were already gone: %s", keys)
        try:
            db.session.execute(CacheKey.__table__.delete().where(CacheKey.cache_key.in_(keys)))
            db.session.commit()
        except SQLAlchemyError as ex:
            db.session.rollback()
            logger.exception("Failed to delete cache key records")
            return self.response_500(message=str(ex))
        logger.info("Invalidated %d cache records for %d datasources", len(keys), len(uids))
        return self.response(201)
