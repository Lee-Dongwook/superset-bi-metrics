import json
import re
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from typing import Any, Callable

import click
import semver
from jinja2 import Environment, FileSystemLoader

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

REMOTE_ENTRY_REGEX = re.compile(r"^remoteEntry\..+\.js$")
FRONTEND_DIST_REGEX = re.compile(r"/frontend/dist")

@click.group(help="CLI for validating and bundling extensions.")
def app() -> None:
    pass

if __name__ == "__main__":
    app()
    
