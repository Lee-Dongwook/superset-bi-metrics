import logging
from typing import Any

from flask import Response
from flask_appbuilder.api import expose, protect, rison as parse_rison, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_babel import ngettext

from core.models import CssTemplate

logger = logging.getLogger(__name__)

class CssTemplateApi():
    datamodel = SQLAInterface(CssTemplate)
    #TODO
