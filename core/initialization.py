from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.app import CoreApp


class AppInitializer:
    def __init__(self, app: CoreApp) -> None:
        super().__init__()
        
        self._app = app
        self.config = app.config
        self.manifest: dict[Any, Any] = {}
        self._db_uri_cache: str | None = None
    
    @property
    def flask_app(self) -> CoreApp:
        return self._app

    #TODO
