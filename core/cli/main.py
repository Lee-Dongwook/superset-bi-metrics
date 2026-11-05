import importlib
import logging
import pkgutil
from typing import Any

import click
from colorama import Fore, Style
from core.cli.utils import normalize_token
from flask import current_app
from flask.cli import FlaskGroup, with_appcontext


logger = logging.getLogger(__name__)

def create_app() -> Any:
    from core.app import create_app as create_bi_metrics_app

    return create_bi_metrics_app()

@click.group(
    cls=FlaskGroup,
    create_app=create_app,
    context_settings={"token_normalize_func": normalize_token},
)
@with_appcontext
def bi_metrics() -> None:
    pass

for load, module_name, is_pkg in pkgutil.walk_packages(
    cli.__path__, cli.__name__ + "."
):
    module = importlib.import_module(module_name)
    for attribute in module.__dict__.values():
        if isinstance(attribute, (click.core.Command, click.core.Group)):
            bi_metrics.add_command(attribute)

            if isinstance(attribute, click.core.Group):
                break
