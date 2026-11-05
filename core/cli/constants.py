from typing import Type
from core.cli.viz_migrations import VizType


MIGRATIONS: dict[(VizType, Type[MigrateViz])] = {
    VizType.AREA: ''
};
