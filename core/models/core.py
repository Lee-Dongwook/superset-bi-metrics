from __future__ import annotations

from flask_appbuilder import Model
from sqlalchemy import Column, Integer

from core.css.models import CssTemplate  # noqa: F401  Superset keeps it in models/core.py
from core.utils.core import MediumText

metadata = Model.metadata


class KeyValue(Model):  # pylint: disable=too-few-public-methods
    """Used for any type of key-value store"""

    __tablename__ = "keyvalue"
    id = Column(Integer, primary_key=True)
    value = Column(MediumText(), nullable=False)
