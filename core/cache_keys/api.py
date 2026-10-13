import logging

from flask import request, Response
from flask_appbuilder import expose
from flask_appbuilder.api import safe
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import protect
from marshmallow.exceptions import ValidationError
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

class CacheApi():
    datamodel = SQLAInterface(CacheKey)
    resource_name = "cachekey"
    allow_browser_login = True
    #TODO:
