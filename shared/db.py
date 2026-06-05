from contextlib import contextmanager
from typing import Any, Callable, Iterable, TypeVar

from django.db import close_old_connections, connection, transaction
from django.db.utils import InterfaceError, OperationalError

T = TypeVar("T")


def _row_to_dict(columns: list[str], row: Iterable[Any]) -> dict[str, Any]:
    return dict(zip(columns, row))


def _reset_db_connection() -> None:
    from django.db import connections

    conn = connections["default"]
    conn.close()
    conn.connection = None
    close_old_connections()


def _with_db_retry(operation: Callable[[], T]) -> T:
    """Retry after Neon/pooler closes idle Django connections."""
    last_exc: InterfaceError | OperationalError | None = None
    for attempt in range(3):
        try:
            if attempt:
                _reset_db_connection()
            connection.ensure_connection()
            return operation()
        except (InterfaceError, OperationalError) as exc:
            last_exc = exc
    assert last_exc is not None
    raise last_exc


def fetch_one(query: str, params: Iterable[Any] | None = None) -> dict[str, Any] | None:
    def run() -> dict[str, Any] | None:
        with connection.cursor() as cursor:
            cursor.execute(query, params or [])
            row = cursor.fetchone()
            if row is None:
                return None
            columns = [col[0] for col in cursor.description]
            return _row_to_dict(columns, row)

    return _with_db_retry(run)


def fetch_all(query: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
    def run() -> list[dict[str, Any]]:
        with connection.cursor() as cursor:
            cursor.execute(query, params or [])
            rows = cursor.fetchall()
            columns = [col[0] for col in cursor.description]
            return [_row_to_dict(columns, row) for row in rows]

    return _with_db_retry(run)


def execute(query: str, params: Iterable[Any] | None = None) -> None:
    def run() -> None:
        with connection.cursor() as cursor:
            cursor.execute(query, params or [])

    _with_db_retry(run)


@contextmanager
def atomic():
    with transaction.atomic():
        yield
