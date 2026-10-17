from abc import abstractmethod

from core.common.daos import BaseDAO
from core.tasks.models import Task

class TaskDAO(BaseDAO[Task]):
    model_cls = None
    base_filter = None
    id_column_name = "id"
    uuid_column_name = "uuid"

    @classmethod
    @abstractmethod
    def find_by_task_key(
        cls,
        task_type: str,
        task_key: str,
        scope: str = "private",
        user_id: int | None = None,
    ) -> Task | None:
        ...
