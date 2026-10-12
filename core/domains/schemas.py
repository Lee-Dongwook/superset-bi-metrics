from marshmallow import fields, Schema

class DomainsSchema(Schema):
    domains = fields.List(fields.String())
