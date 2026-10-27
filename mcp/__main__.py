import contextlib
import io
import logging
import os
import sys
from typing import Any, Callable

import click

if os.environ.get("FASTMCP_TRANSPORT", "stdio") == "stdio":
    original_echo = click.echo
    original_secho = click.secho

    def redirect_to_stderr(
        origianl_func: Callable[..., None],
        *args: Any,
        **kwargs: Any,
    ) -> None:
        if len(args) >= 2:
            args = (args[0], sys.stderr, *args[2:])
            kwargs.pop("file", None)
        else:
            kwargs["file"] = sys.stderr
        
        original_func(*args, **kwargs)
    
    def echo_to_stderr(*args: Any, **kwargs: Any) -> None:
        redirect_to_stderr(original_echo, *args, **kwargs)

    def secho_to_stderr(*args: Any, **kwargs: Any) -> None:
        redirect_to_stderr(original_secho, *args, **kwargs)

    click.echo = echo_to_stderr
    click.secho = secho_to_stderr
