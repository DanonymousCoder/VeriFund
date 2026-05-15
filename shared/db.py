from contextlib import contextmanager
from typing import Any, Iterable

from django.db import connection, transaction


def _row_to_dict(columns: list[str], row: Iterable[Any]) -> dict[str, Any]:
    return dict(zip(columns, row))


def fetch_one(query: str, params: Iterable[Any] | None = None) -> dict[str, Any] | None:
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])
        row = cursor.fetchone()
        if row is None:
            return None
        columns = [col[0] for col in cursor.description]
        return _row_to_dict(columns, row)


def fetch_all(query: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [_row_to_dict(columns, row) for row in rows]


def execute(query: str, params: Iterable[Any] | None = None) -> None:
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])


@contextmanager
def atomic():
    with transaction.atomic():
        yield
