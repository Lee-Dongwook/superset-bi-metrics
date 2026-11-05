import copy
import logging
from typing import Any

from flask import current_app
from sqlalchemy import and_, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, Session

from core.constants import TimeGrain

logger = logging.getLogger("alembic.env")

Base = declarative_base()

class Slice(Base):
    __tablename__ = "slices"

    id = Column(Integer, primary_key=True)
    slice_name = Column(String(250))
    viz_type = Column(String(250))
    params = Column(Text)
    query_context = Column(Text)
    datasource_id: int = Column(Integer)
    datasource_type: str = Column(String(200))

FORM_DATA_BAK_FIELD_NAME = "form_data_bak"
QUERIES_BAK_FIELD_NAME = "queries_bak"
FULL_CONTEXT_BAK_KEY = "__query_context_bak__"

class MigrateViz:
    remove_keys: set[str] = set()
    rename_keys: dict[str, str] = {}
    source_viz_type: str
    target_viz_type: str
    has_x_axis_control: bool = False
    #WIP
