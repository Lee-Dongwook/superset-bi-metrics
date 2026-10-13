from __future__ import annotations

import re
from types import TracebackType
from typing import Callable, Iterable, Optional
from urllib.parse import quote
from wsgiref.types import StartResponse, WSGIApplication, WSGIEnvironment

from werkzeug.wrappers import Response

_PREFIX: str = "/superset"
_SQL_RE: re.Pattern[str] = re.compile(r"^/sql/(\d+)/?$")
_ASSET_PATH_RE: re.Pattern[str] = re.compile(
    r"^/api/v1/extensions/[^/]+/[^/]+/(?!storage/).+$"
)

class ExtensionCacheMiddleware:
    def __init__(self, wsgi_app: WSGIApplication) -> None:
        self.wsgi_app = wsgi_app
    
    def __call__(
        self, environ: WSGIEnvironment, start_response: StartResponse
    ) -> Iterable[bytes]:
        path = environ.get("PATH_INFO", "")
        if not _ASSET_PATH_RE.match(path):
            return self.wsgi_app(environ, start_response)

        def patched_start_response(
            status: str,
            response_headers: list[tuple[str, str]],
            exc_info: (
                tuple[type[BaseException], BaseException, TracebackType]
                | tuple[None, None, None]
                | None
            ) = None,
        ) -> Callable[[bytes], object]:
            new_headers = []
            for name, value in response_headers:
                if name.lower() == "vary":
                    parts = [
                        v.strip()
                        for v in value.split(",")
                        if v.strip().lower() != "cookie"
                    ]
                    if parts:
                        new_headers.append((name, ", ".join(parts)))
                else:
                    new_headers.append((name, value))
            return start_response(status, new_headers, exc_info)
        return self.wsgi_app(environ, patched_start_response)

class PrefixRedirectMiddleware:
    def __init__(
        self,
        wsgi_app: "WSGIApplication",
        app_root: str,
    ):
        self.wsgi_app = wsgi_app
        self.app_root_prefix: str = app_root.rstrip("/")
    
    
    def __call__(
        self,
        environ: "WSGIEnvironment",
        start_response: "StartResponse"
    ) -> Iterable[bytes]:
        path_info: str = environ.get("PATH_INFO", "")
        method: str = environ.get("REQUEST_METHOD", "GET").upper()
        method_for_match: str = "GET" if method == "HEAD" else method

        candidate = path_info
        if self.app_root_prefix and candidate.startswith(self.app_root_prefix + "/"):
            candidate = candidate[len(self.app_root_prefix) :]
        
        if not (
            candidate == _PREFIX or candidate.startswith(_PREFIX + "/")
        ):
            return self.wsgi_app(environ, start_response)
        
        canonical_after_strip = candidate[len(_PREFIX) :] or "/"

        if sql_match := _SQL_RE.match(canonical_after_strip):
            if method_for_match != "GET":
                return _response_with_location(410, None)(environ, start_response)
            #TODO

def _response_with_location(status: int, location: Optional[str]) -> Response:
    headers: list[tuple[str, str]] = []
    if location is not None:
        headers.append(("Location", quote(location, safe="/?&=#%:+,;@!$'()*-_.~")))
    return Response(status=status, headers=headers)
