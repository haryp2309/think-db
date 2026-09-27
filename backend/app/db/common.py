from collections.abc import Sequence
from contextlib import suppress
from typing import Any, cast

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql, sqlite
from tortoise import BaseDBAsyncClient, Tortoise

from app.models.schemas import ColumnSchemaDict, ScalarValue

DbConn = BaseDBAsyncClient | None
RowTuple = tuple[Any, ...]


class DBResultWrapper:
    def __init__(
        self,
        rows: list[RowTuple],
        lastrowid: int | None = None,
        rowcount: int = 0,
        description: list[tuple[str, None]] | None = None,
    ) -> None:
        self._rows = rows
        self.lastrowid = lastrowid
        self.rowcount = rowcount
        self.description = description

    async def fetchall(self) -> list[RowTuple]:
        return self._rows

    async def fetchone(self) -> RowTuple | None:
        return self._rows[0] if self._rows else None


def build_sqla_table(
    table_name: str, columns: list[ColumnSchemaDict] | list[dict[str, Any]] | None = None
) -> sa.Table:
    metadata = sa.MetaData()
    sqla_cols: list[sa.Column[Any]] = [
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True)
    ]
    if columns:
        for c in columns:
            p_name = str(c["physical_column_name"])
            if p_name.startswith("virtual"):
                continue
            c_type = str(c["type"])
            if c_type == "number":
                sqla_cols.append(sa.Column(p_name, sa.Integer, nullable=True))
            elif c_type == "boolean":
                sqla_cols.append(sa.Column(p_name, sa.Boolean, nullable=True))
            else:
                sqla_cols.append(sa.Column(p_name, sa.Text, nullable=True))

    return sa.Table(table_name, metadata, *sqla_cols)


def get_sqla_row_fields_table() -> sa.Table:
    metadata = sa.MetaData()
    return sa.Table(
        "system_meta_row_fields",
        metadata,
        sa.Column("table_name", sa.String, nullable=False),
        sa.Column("row_id", sa.Integer, nullable=False),
        sa.Column("title", sa.Text, nullable=True),
        sa.Column("content", sa.Text, nullable=True),
        sa.Column("emoji", sa.String, nullable=True),
        sa.Column("created_at", sa.String, nullable=True),
        sa.Column("updated_at", sa.String, nullable=True),
    )


async def exec_sqla(db: DbConn, clause: Any) -> DBResultWrapper:
    """
    Executes a SQLAlchemy Core statement (Select, Insert, Update, Delete, CreateTable, DropTable, etc.)
    using Tortoise ORM BaseDBAsyncClient compiled natively to the active database dialect.
    """
    conn = db if db is not None else Tortoise.get_connection("default")
    dialect_name = getattr(conn.capabilities, "dialect", "sqlite")

    if dialect_name in ("postgres", "postgresql"):
        compiled_pg: Any = clause.compile(
            dialect=postgresql.dialect(), compile_kwargs={"render_postcompile_vars": True}
        )
        sql = str(compiled_pg).strip()
        raw_params_pg: Any = getattr(compiled_pg, "params", {})
        params_pg = cast(dict[str, ScalarValue], raw_params_pg) if isinstance(raw_params_pg, dict) else {}
        params_list: list[Any] = list(params_pg.values())
        parts = sql.split("?")
        if len(parts) > 1:
            sql = parts[0] + "".join(f"${i}{part}" for i, part in enumerate(parts[1:], 1))
    else:
        compiled_sq: Any = clause.compile(
            dialect=sqlite.dialect(), compile_kwargs={"render_postcompile_vars": True}
        )
        sql = str(compiled_sq).strip()
        raw_params_sq: Any = getattr(compiled_sq, "params", {})
        if isinstance(raw_params_sq, dict):
            p_dict = cast(dict[str, Any], raw_params_sq)
            params_list = [p_dict[k] for k in p_dict]
        else:
            params_list = []

    is_select = sql.upper().startswith("SELECT")
    if is_select:
        dict_res: Any = await conn.execute_query_dict(sql, params_list)  # type: ignore
        dict_list: list[dict[Any, Any]] = cast(list[dict[Any, Any]], dict_res) if dict_res else []
        if dict_list:
            d_keys: list[str] = [str(k) for k in dict_list[0]]
            d_rows: list[RowTuple] = [tuple(d.get(k) for k in d_keys) for d in dict_list]
            desc: list[tuple[str, None]] = [(k, None) for k in d_keys]
            first_val = d_rows[0][0] if d_rows and len(d_rows[0]) > 0 else None
            lastrowid = int(first_val) if isinstance(first_val, int) else None
            return DBResultWrapper(
                rows=d_rows, lastrowid=lastrowid, rowcount=len(d_rows), description=desc
            )
        return DBResultWrapper(rows=[], lastrowid=None, rowcount=0, description=None)

    affected, raw_rows = await conn.execute_query(sql, params_list)  # type: ignore
    rows: list[RowTuple] = []
    keys: list[str] = []
    if raw_rows:
        raw_seq: Sequence[Any] = cast(Sequence[Any], raw_rows)
        for r in raw_seq:
            r_obj: Any = r
            if hasattr(r_obj, "keys"):
                keys = [str(k) for k in r_obj]
                rows.append(tuple(r_obj))  # pyright: ignore[reportUnknownArgumentType]
            elif isinstance(r_obj, (tuple, list)):
                rows.append(tuple(r_obj))  # pyright: ignore[reportUnknownArgumentType]

    description_keys = [(k, None) for k in keys] if keys else None
    last_id: int | None = None
    if sql.upper().startswith("INSERT"):
        if rows and len(rows[0]) > 0 and isinstance(rows[0][0], int):
            last_id = rows[0][0]
        elif affected > 0:
            last_id = int(affected)
            if dialect_name == "sqlite":
                with suppress(Exception):
                    res: Any = await conn.execute_query_dict("SELECT last_insert_rowid() as id;")  # type: ignore
                    if res and len(res) > 0:
                        last_id = int(cast(dict[str, Any], res[0])["id"])

    rowcount = int(affected) if affected >= 0 else len(rows)
    return DBResultWrapper(rows=rows, lastrowid=last_id, rowcount=rowcount, description=description_keys)
