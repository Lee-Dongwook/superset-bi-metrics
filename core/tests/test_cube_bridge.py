from __future__ import annotations

import json
from unittest.mock import MagicMock


from core.query.types import QueryStatus
from core.semantic.bridge import CubeAsyncQueryHandle, CubeQueryBridge
from core.semantic.cube_client import CubeClient
from core.semantic.redis_publisher import RedisEventPublisher
from core.semantic.types import CubeQueryEvent, CubeQueryStage


def test_cube_query_event_schema_serialization() -> None:
    stage = CubeQueryStage(
        step="BUILDING_PRE_AGGREGATIONS",
        description="Building pre-aggregation: orders_summary",
        progress_percent=65.5,
        elapsed_ms=2500,
    )
    event = CubeQueryEvent(
        channel_id="chan-xyz-123",
        query_id="q-456",
        status="RUNNING",
        stage=stage,
        result_url=None,
    )

    data = event.to_dict()
    assert data["channel_id"] == "chan-xyz-123"
    assert data["query_id"] == "q-456"
    assert data["status"] == "RUNNING"
    assert data["stage"]["step"] == "BUILDING_PRE_AGGREGATIONS"
    assert data["stage"]["progress_percent"] == 65.5
    assert data["stage"]["elapsed_ms"] == 2500

    raw_json = event.to_json()
    parsed = json.loads(raw_json)
    assert parsed["channel_id"] == "chan-xyz-123"
    assert parsed["stage"]["step"] == "BUILDING_PRE_AGGREGATIONS"


def test_cube_client_parse_stage() -> None:
    client = CubeClient()

    # Pre-aggregation stage with dict
    dict_stage_resp = {
        "error": "Continue wait",
        "stage": {
            "stage": "Building pre-aggregations",
            "preAggregation": "orders_monthly_rollup",
            "progress": 42.0,
        },
    }
    stage = client.parse_stage(dict_stage_resp, elapsed_ms=1000)
    assert stage.step == "BUILDING_PRE_AGGREGATIONS"
    assert "orders_monthly_rollup" in stage.description
    assert stage.progress_percent == 42.0
    assert stage.elapsed_ms == 1000

    # Executing query string stage
    str_stage_resp = {
        "error": "Continue wait",
        "stage": "Executing query",
    }
    stage2 = client.parse_stage(str_stage_resp, elapsed_ms=2000)
    assert stage2.step == "EXECUTING_QUERY"
    assert stage2.progress_percent == 75.0


def test_redis_publisher_mock() -> None:
    publisher = RedisEventPublisher(default_channel="test_events")
    mock_redis = MagicMock()
    publisher._client = mock_redis

    success = publisher.publish_stage(
        channel_id="c1",
        query_id="q1",
        status="RUNNING",
        step="BUILDING_PRE_AGGREGATIONS",
        description="Pre-agg warming",
        progress_percent=50.0,
    )

    assert success is True
    mock_redis.publish.assert_called_once()
    channel, payload = mock_redis.publish.call_args[0]
    assert channel == "test_events"
    assert "BUILDING_PRE_AGGREGATIONS" in payload


def test_cube_query_bridge_lifecycle() -> None:
    mock_client = MagicMock(spec=CubeClient)
    # 1st call: Continue wait, 2nd call: Data
    mock_client.load_query.side_effect = [
        {
            "error": "Continue wait",
            "stage": {"stage": "Building pre-aggregations", "preAggregation": "orders_rollup"},
        },
        {
            "data": [{"status": "paid", "amount": 100}],
        },
    ]
    mock_client.parse_stage.return_value = CubeQueryStage(
        step="BUILDING_PRE_AGGREGATIONS",
        description="Building pre-aggregation: orders_rollup",
        progress_percent=50.0,
        elapsed_ms=100,
    )

    mock_publisher = MagicMock(spec=RedisEventPublisher)

    bridge = CubeQueryBridge(cube_client=mock_client, publisher=mock_publisher)

    result = bridge.execute_query(
        channel_id="chan-test",
        query_id="101",
        query={"measures": ["Orders.count"]},
        poll_interval=0.01,
        timeout_seconds=5.0,
    )

    assert result.status == QueryStatus.SUCCESS
    assert len(result.statements) == 1
    assert result.statements[0].row_count == 1
    assert result.statements[0].data is not None
    assert result.statements[0].data.iloc[0]["status"] == "paid"

    # Verify publisher calls: dispatched -> stage (pre-agg) -> success
    assert mock_publisher.publish_stage.call_count >= 2
    mock_publisher.publish_success.assert_called_once()


def test_cube_query_bridge_failure() -> None:
    mock_client = MagicMock(spec=CubeClient)
    mock_client.load_query.return_value = {"error": "Cube model 'InvalidCube' not found"}
    mock_publisher = MagicMock(spec=RedisEventPublisher)

    bridge = CubeQueryBridge(cube_client=mock_client, publisher=mock_publisher)

    result = bridge.execute_query(
        channel_id="chan-err",
        query_id="202",
        query={"measures": ["InvalidCube.count"]},
        poll_interval=0.01,
        timeout_seconds=5.0,
    )

    assert result.status == QueryStatus.FAILED
    assert "InvalidCube" in str(result.error_message)
    mock_publisher.publish_failed.assert_called_once()


def test_cube_async_query_handle() -> None:
    mock_bridge = MagicMock(spec=CubeQueryBridge)
    mock_bridge.publisher = MagicMock(spec=RedisEventPublisher)
    mock_bridge.execute_query.return_value = MagicMock(
        status=QueryStatus.SUCCESS,
        statements=[],
    )

    handle = CubeAsyncQueryHandle(
        query_id=1,
        channel_id="chan-async",
        query={"measures": ["Orders.count"]},
        bridge=mock_bridge,
    )

    assert handle.get_status() == QueryStatus.PENDING

    result = handle.execute()
    assert result.status == QueryStatus.SUCCESS
    assert handle.get_status() == QueryStatus.SUCCESS
    assert handle.get_result() == result

    # Cancel after completion is a no-op and must not publish a contradicting event
    assert handle.cancel() is False
    assert handle.get_status() == QueryStatus.SUCCESS
    mock_bridge.publisher.publish_failed.assert_not_called()


def test_cube_query_bridge_cancel() -> None:
    mock_client = MagicMock(spec=CubeClient)
    mock_client.load_query.return_value = {"error": "Continue wait"}
    mock_client.parse_stage.return_value = CubeQueryStage(step="WAITING", description="queued")
    mock_publisher = MagicMock(spec=RedisEventPublisher)
    bridge = CubeQueryBridge(cube_client=mock_client, publisher=mock_publisher)

    polls = iter([False, True])
    result = bridge.execute_query(
        channel_id="chan-cancel",
        query_id="7",
        query={},
        poll_interval=0,
        should_cancel=lambda: next(polls),
    )

    assert result.status == QueryStatus.STOPPED
    assert mock_client.load_query.call_count == 1
    mock_publisher.publish_failed.assert_called_once()


def test_parse_stage_waiting_for_query() -> None:
    stage = CubeClient(base_url="http://x", api_token="t").parse_stage(
        {"stage": {"stage": "Waiting for query"}}
    )
    assert stage.step == "WAITING"
