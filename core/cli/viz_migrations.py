from __future__ import annotations

import logging
from enum import Enum
from typing import Type

import click
from click_option_group import optgroup, RequiredAnyOptionGroup
from flask.cli import with_appcontext

from core.extension import db
from .constants import MIGRATIONS
from core.migrations.shared.migrate_viz.base import Slice, FORM_DATA_BAK_FIELD_NAME, MigrateViz

class VizType(str, Enum):
    AREA = "area"
    BAR = "bar"
    BUBBLE = "bubble"
    COMPARE = "compare"
    DIST_BAR = "dist_bar"
    DUAL_LINE = "dual_line"
    HEATMAP = "heatmap"
    HISTOGRAM = "histogram"
    LINE = "line"
    PIVOT_TABLE = "pivot_table"
    SANKEY = "sankey"
    SUNBURST = "sunburst"
    TABLE = "table"
    TREEMAP = "treemap"

@click.group()
def migrate_viz() -> None:
    pass

def setup_logger() -> None:
    console_header = logging.StreamHandler()
    logger = logging.getLogger("alembic")
    logger.addHandler(console_header)

def migrate_by_viz_type(viz_type: VizType, is_downgrade: bool = False) -> None:
    migrations: Type[MigrateViz] = MIGRATIONS[viz_type]
    if is_downgrade:
        migrations.downgrade(db.session)
    else:
        migrations.upgrade(db.session)

def migrate_by_id(ids: tuple[int, ...], is_downgrade: bool = False) -> None:
    slices = db.session.query(Slice).filter(Slice.id.in_(ids))
    for slc in paginated_update(
        slices,
        lambda current, total: click.echo(
            f"{('Downgraded' if is_downgrade else 'Upgraded')} {current}/{total} charts"
        ),
    ):
        if is_downgrade:
            form_data = try_load_json(slc.params)
            source_viz_type = form_data.get(FORM_DATA_BAK_FIELD_NAME, {}).get(
                "viz_type"
            )
            migration = MIGRATIONS.get(source_viz_type) if source_viz_type else None
            if migration:
                migration.downgrade_slice(slc)
        elif slc.viz_type in MIGRATIONS:
            MIGRATIONS[slc.viz_type].upgrade_slice(slc)



@migrate_viz.command()
@with_appcontext
@optgroup.group(
    cls=RequiredAnyOptionGroup,
)
@optgroup.option(
    "--viz_type",
    "-t",
    help=f"viz type upgrade: {', '.join(list(VizType))}",
    type=str,
)
@optgroup.option(
    "--id",
    "ids",
    help="Chart ID to upgrade.",
    type=int,
    multiple=True,
)
def upgrade(viz_type: str, ids: tuple[int,...] | None) -> None:
    setup_logger()
    if viz_type:
        migrate_by_viz_type(VizType(viz_type))
    elif ids:
        migrate_by_id(ids)


@migrate_viz.command()
@with_appcontext
@optgroup.group(
    cls=RequiredAnyOptionGroup,
)
@optgroup.option(
    "--viz_type",
    "-t",
    help=f"viz type downgrade: {', '.join(list(VizType))}",
    type=str,
)
@optgroup.option(
    "--id",
    "ids",
    help="Chart ID to downgrade.",
    type=int,
    multiple=True,
)
def downgrade(viz_type: str, ids: tuple[int, ...] | None = None) -> None:
    setup_logger()
    if viz_type:
        migrate_by_viz_type(VizType(viz_type), is_downgrade=True)
    elif ids:
        migrate_by_id(ids, is_downgrade=True)
