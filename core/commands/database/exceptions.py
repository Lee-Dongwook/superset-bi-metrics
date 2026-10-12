from flask_babel import lazy_gettext as _
from marshmallow.validate import ValidationError

from core.commands.exceptions import (
    CommandException,
    CommandInvalidError,
    CreateFailedError,
    DeleteFailedError,
    ImportFailedError,
    UpdateFailedError,
)
from core.exceptions import CoreErrorException, CoreErrorsException

class DatabaseInvalidError(CommandInvalidError):
    message = _("Database parmeters invalid.")

class DatabaseExistsValidationError(ValidationError):
    def __init__(self) -> None:
        super().__init__(
            _("A database with the same name already exists."),
            field_name="database_name",
        )

class DatabaseUpdateUnsafeRebindError(ValidationError):
    def __init__(self, field_name: str = "sqlalchemy_uri") -> None:
        super().__init__(
            _(
                "This update would change the connection's effective destination (host/port, engine parameters, SSH tunnel endpoint, or OAuth2 endpoint URIs) while reusing the stored credential."
            ),
            field_name=field_name,
        )

class DatabaseRequiredFieldValidationError(ValidationError):
    def __init__(self, field_name: str) -> None:
        super().__init__(
            [_("Field is required")],
            field_name=field_name,
        )

class DatabaseConnectionSyncPermissionsError(CommandException):
    status = 500
    message = _("Unable to sync permissions for this database connection.")


class DatabaseNotFoundError(CommandException):
    status = 404
    message = _("Database not found.")


class DatabaseSchemaNotFoundError(CommandException):
    status = 404
    message = _("Schema not found.")


class UserNotFoundInSessionError(CommandException):
    status = 500
    message = _("Could not validate the user in the current session.")


class DatabaseSchemaUploadNotAllowed(CommandException):
    status = 403
    message = _("Database schema is not allowed for csv uploads.")

class DatabaseUploadNotSupported(CommandException):
    status = 422
    message = _("Database type does not support file uploads.")


class DatabaseUploadFailed(CommandException):
    status = 422
    message = _("Database upload file failed")


class DatabaseUploadFileTooLarge(CommandException):
    status = 413
    message = _("Database upload file exceeds the maximum allowed size.")


class DatabaseUploadSoftDeletedDatasetExistsError(DatabaseUploadFailed):
    def __init__(self, dataset_uuid: str) -> None:
        super().__init__(
            _(
                "A soft-deleted dataset (uuid %(uuid)s) already references "
                "this table. Restore it via POST",
                uuid=dataset_uuid,
            )
        )

class DatabaseUploadSaveMetadataFailed(CommandException):
    status = 500
    message = _("Database upload file failed.")
