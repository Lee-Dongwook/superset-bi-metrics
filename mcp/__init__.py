import warnings

warnings.filterwarnings(
    "ignore",
    message=r"authlib\.jose module is deprecated",
)

__version__ = "1.0.0"

__all__ = [
    "__version__",
]
