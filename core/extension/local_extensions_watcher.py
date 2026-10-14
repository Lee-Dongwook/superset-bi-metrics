from __future__ import annotations

import logging
import os
import threading

from flask import Flask

logger = logging.getLogger(__name__)

_watcher_initialized = False
_watcher_lock = threading.Lock()

def setup_local_extensions_watcher(app: Flask) -> None:
    global _watcher_initialized

    with _watcher_lock:
        if _watcher_initialized:
            return
        _watcher_initialized = True

    if not (app.debug or app.config.get("FLASK_USE_RELOAD", False)):
        return
    
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        return
    
    local_extensions = app.config.get("LOCAL_EXTENSIONS", [])
    if not local_extensions:
        return

    #TODO


def start_local_extensions_watcher_thread(app: Flask) -> None:
    if threading.current_thread() is threading.main_thread():
        threading.Thread(
            target=lambda: setup_local_extensions_watcher(app), daemon=True
        ).start()
