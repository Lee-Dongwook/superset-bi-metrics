import flask_appbuilder
from werkzeug.local import LocalProxy

flask_appbuilder.Model.__allow_unmapped__ = True

results_backend = LocalProxy()
