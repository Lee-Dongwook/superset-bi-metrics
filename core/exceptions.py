from __future__ import annotations

from typing import Any, Optional

from flask_babel import gettext as _


from core.errors import ErrorLevel, CoreError, CommonErrorType

class CoreException(Exception):
    status = 500
    message = ""

    def __init__(
        self,
        message: str = "",
        exception: Optional[Exception] = None,
        error_type: Optional[CommonErrorType] = None,
    ) -> None:
        if message:
            self.message = message
        self._exception = exception
        self._error_type = error_type
        super().__init__(self.message)
    
    @property
    def exception(self) -> Optional[Exception]:
        return self._exception

    @property
    def error_type(self) -> Optional[CommonErrorType]:
        return self._error_type
    
    def to_dict(self) -> dict[str, Any]:
        rv = {}
        if hasattr(self, "message"):
            rv["message"] = self.message
        if self.error_type:
            rv["error_type"] = self.error_type
        if self.exception is not None and hasattr(self.exception, "to_dict"):
            rv = {**rv, **self.exception.to_dict()}
        return rv

class CoreErrorException(CoreException):
    def __init__(self, error: CoreError, status: Optional[int] = None) -> None:
        super().__init__(error.message)
        self.error = error
        if status is not None:
            self.status = status

    def to_dict(self) -> dict[str, Any]:
        return self.error.to_dict()

class GenericErrorException(CoreErrorException):
    def __init__(self, message: str, status: Optional[int] = None) -> None:
        super().__init__(
            CoreError(
                message=message,
                error_type=CommonErrorType.GENERIC_BACKEND_ERROR,
                level=ErrorLevel.ERROR,
            )
        )

        if status is not None:
            self.status = status

class CoreErrorFromParamsException(CoreErrorException):
    def __init__(
        self,
        error_type: CommonErrorType,
        message: str,
        level: ErrorLevel,
        extra: Optional[dict[str, Any]] = None,
    ) -> None:
        super().__init__(
            CoreError(
                error_type=error_type, message=message, level=level, extra=extra or {}
            )
        )

class CoreErrorsException(CoreException):
    def __init__(
        self, errors: list[CoreError], status: Optional[int] = None
    ) -> None:
        super().__init__(str(errors))
        self.errors = errors
        if status is not None:
            self.status = status


class NoDataException(CoreException):
    status = 400


class NullValueException(CoreException):
    status = 400

class OAuth2Error(CoreErrorException):
    def __init__(self, error: str):
        super().__init__(
            CoreError(
                message="OAuth2 Error",
                error_type=CommonErrorType.OAUTH2_REDIRECT_ERROR,
                level=ErrorLevel.ERROR,
                extra={"error": error},
            )
        )

class OAuth2RejectedError(CoreErrorException):
    status = 400

    def __init__(self, error: str):
        super().__init__(
            CoreError(
                message=error,
                error_type=CommonErrorType.OAUTH2_REDIRECT_ERROR,
                level=ErrorLevel.WARNING,
            )
        )

class CoreDisallowedSQLTableException(CoreErrorException):
    def __init__(self, tables: set[str]):
        super().__init__(
            CoreError(
                message=f"SQL statement references disallowed table(s): {tables}",
                error_type=CommonErrorType.SYNTAX_ERROR,
                level=ErrorLevel.ERROR,
            )
        )

class CoreDisallowedClientFileTransferException(CoreErrorException):
    def __init__(self, commands: list[str]):
        super().__init__(
            CoreError(
                message=(
                    "SQL statement contains disallowed client-side "
                    f"file-transfer command(s): {', '.join(commands)}"
                ),
                error_type=CommonErrorType.SYNTAX_ERROR,
                level=ErrorLevel.ERROR,
            )
        )


class AcquireDistributedLockFailedException(Exception):
    pass

class LockAlreadyHeldException(AcquireDistributedLockFailedException):
    pass

class ReleaseDistributedLockFailedException(Exception):
    pass

class DatabaseNotFoundException(CoreErrorException):
    status = 404

    def __init__(self, message: str):
        super().__init__(
            CoreError(
                message=message,
                error_type=CommonErrorType.DATABASE_NOT_FOUND_ERROR,
                level=ErrorLevel.ERROR,
            )
        )

class TableNotFoundException(CoreErrorException):
    status = 404

    def __init__(self, message: str):
        super().__init__(
            CoreError(
                message=message,
                error_type=CommonErrorType.TABLE_NOT_FOUND_ERROR,
                level=ErrorLevel.ERROR,
            )
        )

class CoreDMLNotAllowedException(CoreErrorException):
    def __init__(self) -> None:
        error = CoreError(
            message=_(
                "This database does not allow for DDL/DML."
            ),
            error_type=CommonErrorType.DML_NOT_ALLOWED_ERROR,
            level=ErrorLevel.ERROR,
        )
        super().__init__(error)

class CoreInvalidCTASException(CoreErrorException):
    def __init__(self) -> None:
        error = CoreError(
            message=_(
                "create table as select can only be run with a query where the last statement is a SELECT."
            ),
            error_type=CommonErrorType.INVALID_CTAS_QUERY_ERROR,
            level=ErrorLevel.ERROR,
        )
        super().__init__(error)

class CoreInvalidCVASException(CoreErrorException):
    def __init__(self) -> None:
        error = CoreError(
            message=_(
                "create view as select can only be run with a query with a single SELECT statement."
            ),
            error_type=CommonErrorType.INVALID_CVAS_QUERY_ERROR,
            level=ErrorLevel.ERROR,
        )
        super().__init__(error)

class CoreResultsBackendNotConfigureException(CoreErrorException):
    def __init__(self) -> None:
        error = CoreError(
            message=_("Results backend is not configured"),
            error_type=CommonErrorType.RESULTS_BACKEND_NOT_CONFIGURED_ERROR,
            level=ErrorLevel.ERROR,
        )
        super().__init__(error)

class ScreenshotImageNotAvailableException(CoreException):
    status = 404

class TemplateException(CoreException):
    status = 422
