from __future__ import annotations

import logging
from typing import Any

from celery.exceptions import SoftTimeLimitExceeded
from flask import current_app
