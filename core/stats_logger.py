import logging
from typing import Any, Optional

from colorama import Fore, Style

logger = logging.getLogger(__name__)

class BaseStatsLogger:
    def __init__(self, prefix: str = "superset") -> None:
        self.prefix = prefix

    def key(self, key: str) -> str:
        if self.prefix:
            return self.prefix + key
        return key
    
    def incr(self, key: str) -> None:
        raise NotImplementedError()
    
    def decr(self, key: str) -> None:
        raise NotImplementedError()
    
    def timing(self, key: str, value: float) -> None:
        raise NotImplementedError()
    
    def gauge(self, key: str, value: float) -> None:
        raise NotImplementedError()

class DummyStatsLogger(BaseStatsLogger):
    def incr(self, key: str) -> None:
        logger.debug("%s[stats_logger] (incr) %s%s", Fore.CYAN, key, Style.RESET_ALL)

    def decr(self, key: str) -> None:
        logger.debug("%s[stats_logger] (decr) %s%s", Fore.CYAN, key, Style.RESET_ALL)

    def timing(self, key: str, value: float) -> None:
        logger.debug(
            "%s[stats_logger] (timing) %s | %s %s",
            Fore.CYAN,
            key,
            value,
            Style.RESET_ALL,
        )

    def gauge(self, key: str, value: float) -> None:
        logger.debug(
            "%s[stats_logger] (gauge) %s%s%s", Fore.CYAN, key, value, Style.RESET_ALL
        )

try:
    from statsd import StatsClient

    class StatsdStatsLogger(BaseStatsLogger):
        def __init__(
            self,
            host: str = "localhost",
            port: int = 8100,
            prefix: str = "superset",
            statsd_client: Optional[StatsClient] = None,
        ) -> None:
            self.client = statsd_client or StatsClient(host=host, port=port, prefix=prefix)

        def incr(self, key: str) -> None:
            self.client.incr(key)

        def decr(self, key: str) -> None:
            self.client.decr(key)

        def timing(self, key: str, value: float) -> None:
            self.client.timing(key, value)

        def gauge(self, key: str, value: float) -> None:
            self.client.gauge(key, value)

except Exception as e:
    _saved_exception = e

    class StatsdStatsLogger(BaseStatsLogger):  
        def __init__(  
            self,
            host: str = "localhost",
            port: int = 8100,
            prefix: str = "superset",
            statsd_client: Any = None,
        ) -> None:
            raise _saved_exception
