from marshmallow import fields, Schema, validate

# Ported from superset/charts/schemas.py
datasource_name_description = "The datasource name."
datasource_type_description = "The type of dataset/datasource identified on `datasource_id`."
datasource_uid_description = "The uid of the dataset/datasource this new chart will use. A complete datasource identification needs `datasource_uid` "

from core.utils.core import DatasourceType

class Datasource(Schema):
    database_name = fields.String(
        metadata={"description": "Datasource"}
    )
    datasource_name = fields.String(
        metadata={"description": datasource_name_description},
    )
    catalog = fields.String(
        allow_none=True,
        metadata={"description": "Datasource catalog"},
    )
    schema = fields.String(
        metadata={"description": "Datasource schema"},
    )
    datasource_type = fields.String(
        metadata={"description": datasource_type_description},
        validate=validate.OneOf(choices=[ds.value for ds in DatasourceType]),
        required=True,
    )

class CacheInvalidationRequestSchema(Schema):
    datasource_uids = fields.List(
        fields.String(),
        metadata={"description": datasource_uid_description},
    )
    datasources = fields.List(
        fields.Nested(Datasource),
        metadata={"description": "A list of the data source and database names"},
    )
