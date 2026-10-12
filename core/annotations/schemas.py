from marshmallow import fields, Schema
from marshmallow.validate import Length

openapi_spec_methods_override = {}

class AnnotationLayerPostSchema(Schema):
    name = fields.String(
        metadata={"description": ""},
        required=True,
        validate=[Length(1, 250)],
    )
