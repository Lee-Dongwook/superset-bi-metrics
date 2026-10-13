from flask_appbuilder import Model
from sqlalchemy import Column, Integer, String

from core.mixins import AuditMixin, UUIDMixin
from core.utils.core import MediumText


class CssTemplate(AuditMixin, UUIDMixin, Model):
    """Reusable CSS snippet that dashboards can apply."""

    __tablename__ = "css_templates"
    id = Column(Integer, primary_key=True)
    template_name = Column(String(256))
    css = Column(MediumText(), default="")
