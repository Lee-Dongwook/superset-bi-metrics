"""DAO exceptions, ported from superset/daos/exceptions.py."""

from core.exceptions import CoreException


class DAOException(CoreException):
    """Base DAO exception class"""


class DatasourceTypeNotSupportedError(DAOException):
    """DAO datasource query source type is not supported"""

    status = 422
    message = "DAO datasource query source type is not supported"


class DatasourceNotFound(DAOException):
    status = 404
    message = "Datasource does not exist"


class DatasourceValueIsIncorrect(DAOException):
    status = 422
    message = "Datasource value is incorrect"
