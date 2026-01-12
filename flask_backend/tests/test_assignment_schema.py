import pytest
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError

from api.models import Assignment
from api.models.schemas import AssignmentSchema