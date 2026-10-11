from __future__ import annotations

from pydantic import BaseModel, computed_field, Field  

from core.extension.constant import (
    DISPLAY_NAME_PATTERN,
    PUBLISHER_PATTERN,
    TECHNICAL_NAME_PATTERN,
    VERSION_PATTERN,
)

class CoreExtension(BaseModel):
    publisher: str = Field(
        ...,
        description="Publisher, organization namespace",
        min_length=1,
        pattern=PUBLISHER_PATTERN
    )

    name: str = Field(
        ...,
        description="Technical extension identifier",
        min_length=1,
        pattern=TECHNICAL_NAME_PATTERN,
    )

    displayName: str = Field(
        ...,
        description="Human-readable extension name",
        min_length=1,
        pattern=DISPLAY_NAME_PATTERN,
    )

    version: str = Field(
        default="0.0.0",
        description="Semantic version string",
        pattern=VERSION_PATTERN,
    )

    license: str | None = Field(
        default=None,
        description="License identifier (e.g., 'Apache-2.0')",
    )

    description: str | None = Field(
        default=None,
        description="Extension description",
    )
    dependencies: list[str] = Field(
        default_factory=list,
        description="List of extension IDs this extension depends on",
    )
    permissions: list[str] = Field(
        default_factory=list,
        description="Permissions required by this extension",
    )

    @computed_field(description="Composite extension ID")
    @property
    def id(self) -> str:
        return f"{self.publisher}.{self.name}"


class ExtensionConfigBackend(BaseModel):
    files: list[str] = Field(
        default_factory=list,
        description="Glob Patterns for file"
    )

class ExtensionConfig(CoreExtension):
    backend: ExtensionConfigBackend | None = Field(
        default=None,
        description="Backend configuration",
    )

class ManifestFrontend(BaseModel):
    remoteEntry: str = Field( 
        ...,
        description="Path to the built remote entry file",
    )
    moduleFederationName: str = Field( 
        ...,
        description="Webpack Module Federation container name (maps to window[name])",
    )

class ManifestBackend(BaseModel):
    entrypoint: str

class Manifest(CoreExtension):
    frontend: ManifestFrontend | None = Field(
        default=None,
        description="Frontend manifest",
    )
    backend: ManifestBackend | None = Field(
        default=None,
        description="Backend manifest",
    )
