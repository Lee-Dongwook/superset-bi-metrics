from marshmallow import fields, Schema


class MetricQueryRequestSchema(Schema):
    channel_id = fields.String(
        required=True,
        metadata={"description": "WebSocket channel that receives the query's progress events"},
    )
    query = fields.Dict(
        required=True,
        metadata={"description": "Cube.js query (measures, dimensions, timeDimensions, filters)"},
    )
