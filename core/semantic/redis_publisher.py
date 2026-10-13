from __future__ import annotations

import logging
from typing import Any

import redis

from core.semantic.types import CubeQueryEvent, CubeQueryStage

logger = logging.getLogger(__name__)


class RedisEventPublisher:
    """Publishes query lifecycle and stage events to Redis pub/sub.

    The Go WebSocket server subscribes to these events and pushes
    real-time updates to connected frontend clients.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        default_channel: str = "query_events",
    ) -> None:
        self.redis_url = redis_url
        self.default_channel = default_channel
        self._client: redis.Redis | None = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.Redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=2.0,
            )
        return self._client

    def publish(self, event: CubeQueryEvent, channel: str | None = None) -> bool:
        """Publishes a CubeQueryEvent to the target Redis channel."""
        target_channel = channel or self.default_channel
        payload = event.to_json()
        try:
            self.client.publish(target_channel, payload)
            logger.debug(
                "Published query event to Redis [%s] for query [%s], status: %s",
                target_channel,
                event.query_id,
                event.status,
            )
            return True
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning(
                "Failed to publish query event to Redis [%s]: %s",
                target_channel,
                exc,
            )
            return False

    def publish_stage(
        self,
        channel_id: str,
        query_id: str,
        status: str,
        step: str,
        description: str,
        progress_percent: float = 0.0,
        elapsed_ms: int = 0,
        extra: dict[str, Any] | None = None,
    ) -> bool:
        """Convenience method to publish a progress stage event."""
        stage = CubeQueryStage(
            step=step,
            description=description,
            progress_percent=progress_percent,
            elapsed_ms=elapsed_ms,
        )
        event = CubeQueryEvent(
            channel_id=channel_id,
            query_id=query_id,
            status=status,
            stage=stage,
            extra=extra or {},
        )
        return self.publish(event)

    def publish_success(
        self,
        channel_id: str,
        query_id: str,
        result_url: str | None = None,
        stage: CubeQueryStage | None = None,
        extra: dict[str, Any] | None = None,
    ) -> bool:
        """Convenience method to publish a query completion event."""
        completed_stage = stage or CubeQueryStage(
            step="COMPLETED",
            description="Query execution completed successfully",
            progress_percent=100.0,
        )
        event = CubeQueryEvent(
            channel_id=channel_id,
            query_id=query_id,
            status="SUCCESS",
            stage=completed_stage,
            result_url=result_url,
            extra=extra or {},
        )
        return self.publish(event)

    def publish_failed(
        self,
        channel_id: str,
        query_id: str,
        error: str,
        stage: CubeQueryStage | None = None,
        extra: dict[str, Any] | None = None,
    ) -> bool:
        """Convenience method to publish a query failure event."""
        failed_stage = stage or CubeQueryStage(
            step="FAILED",
            description=f"Query execution failed: {error}",
            progress_percent=0.0,
        )
        event = CubeQueryEvent(
            channel_id=channel_id,
            query_id=query_id,
            status="FAILED",
            stage=failed_stage,
            error=error,
            extra=extra or {},
        )
        return self.publish(event)

    def close(self) -> None:
        """Closes the Redis client connection if opened."""
        if self._client is not None:
            try:
                self._client.close()
            except Exception:  # pylint: disable=broad-except
                pass
            self._client = None
