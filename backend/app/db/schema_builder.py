import json
import re
from contextlib import suppress
from typing import Any, cast

import sqlalchemy as sa

from app.core.config import settings
from app.db.common import DbConn, build_sqla_table, exec_sqla
from app.models.metadata import (
    SystemMetaColumn,
    SystemMetaRelation,
    SystemMetaRowField,
    SystemMetaTable,
    SystemMetaView,
)
from app.models.schemas import ColumnOptionInput, ColumnSchemaDict


def slugify(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", name.strip().lower())
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    return cleaned or "col"


async def create_table(
    conn: DbConn = None, display_name: str = "", namespace_id: int | None = 1
) -> dict[str, Any]:
    """
    Creates a new dynamic table metadata entry using Tortoise ORM
    and creates its physical app_data_table_<id> SQL table using SQLAlchemy Core.
    """
    tbl = await SystemMetaTable.create(
        name=display_name,
        emoji="📁",
        title_alias="Title",
        physical_table_name="temp_name",
        namespace_id=namespace_id or 1,
    )
    physical_name = f"app_data_table_{tbl.id}"
    tbl.physical_table_name = physical_name
    await tbl.save()

    sqla_tbl = build_sqla_table(physical_name)
    await exec_sqla(conn, sa.schema.CreateTable(sqla_tbl, if_not_exists=True))

    return {"id": tbl.id, "name": display_name, "physical_table_name": physical_name}


async def delete_table(conn: DbConn = None, table_id: int = 0) -> bool:
    """
    Deletes a dynamic table metadata entry, drops its physical SQL table using SQLAlchemy Core,
    and cleans up associated system_meta_row_fields and relations using Tortoise ORM.
    """
    tbl = await SystemMetaTable.get_or_none(id=table_id)
    if not tbl:
        return False

    physical_name = tbl.physical_table_name

    await SystemMetaRelation.filter(source_table_id=table_id).delete()
    await SystemMetaRelation.filter(target_table_id=table_id).delete()
    await SystemMetaRowField.filter(table_name=physical_name).delete()

    sqla_tbl = sa.Table(
        physical_name, sa.MetaData(), sa.Column("id", sa.Integer, primary_key=True)
    )
    await exec_sqla(conn, sa.schema.DropTable(sqla_tbl, if_exists=True))

    await tbl.delete()
    return True


async def add_column(
    conn: DbConn = None,
    table_id: int = 0,
    column_name: str = "",
    column_type: str = "",
    options: list[ColumnOptionInput] | None = None,
    target_table_id: int | None = None,
    relation_column_name: str | None = None,
    target_property_name: str | None = None,
) -> ColumnSchemaDict:
    """
    Adds a custom property column to a dynamic table using Tortoise ORM models & SQLAlchemy Core DDL.
    """
    if column_type == "rollup":
        options_json = json.dumps(
            {
                "relation_column_name": relation_column_name,
                "target_property_name": target_property_name,
            }
        )
        if not target_table_id and relation_column_name:
            rc_col = await SystemMetaColumn.get_or_none(
                table_id=table_id, name=relation_column_name
            )
            if rc_col and rc_col.target_table_id:
                target_table_id = rc_col.target_table_id
            else:
                rel = await SystemMetaRelation.filter(target_table_id=table_id).first()
                if rel:
                    target_table_id = rel.source_table_id
    else:
        options_json = json.dumps(options if options else [])

    if column_type == "reference":
        if not target_table_id:
            raise ValueError("target_table_id is required for reference column type")
        target_tbl = await SystemMetaTable.get_or_none(id=target_table_id)
        if not target_tbl:
            raise ValueError(f"Target table id {target_table_id} does not exist")

    source_tbl = await SystemMetaTable.get_or_none(id=table_id)
    if not source_tbl:
        raise ValueError(f"Table id {table_id} does not exist")

    dup_count = await SystemMetaColumn.filter(table_id=table_id, name=column_name.strip()).count()
    if dup_count > 0:
        raise ValueError(f"A column named '{column_name.strip()}' already exists in this table")

    src_physical_tbl = source_tbl.physical_table_name

    col = await SystemMetaColumn.create(
        table_id=table_id,
        name=column_name,
        physical_column_name="temp",
        type=column_type,
        options=options_json,
        target_table_id=target_table_id,
    )
    col_id = col.id
    physical_col_name = f"col_{col_id}"
    col.physical_column_name = physical_col_name
    await col.save()

    pg_type = "TEXT"
    if column_type == "reference" and target_table_id:
        tgt_row = await SystemMetaTable.get_or_none(id=target_table_id)
        tgt_physical_tbl = tgt_row.physical_table_name if tgt_row else ""
        pg_type = f"INTEGER REFERENCES {tgt_physical_tbl}(id) ON DELETE SET NULL"

    await exec_sqla(
        conn, sa.DDL(f"ALTER TABLE {src_physical_tbl} ADD COLUMN {physical_col_name} {pg_type};")
    )

    if column_type == "reference" and target_table_id:
        await SystemMetaRelation.create(
            source_table_id=table_id,
            source_column_id=col_id,
            target_table_id=target_table_id,
            target_column_id=None,
        )

    return ColumnSchemaDict(
        id=col_id,
        table_id=table_id,
        name=column_name,
        physical_column_name=physical_col_name,
        type=column_type,
        options=[str(x) for x in (options or [])],
        options_with_defaults=[],
        default_value=None,
        target_table_id=target_table_id,
        target_table_name=None,
        relation_column_name=relation_column_name,
        target_property_name=target_property_name,
        is_inverse=False,
    )


async def update_column(
    conn: DbConn = None,
    table_id: int = 0,
    column_id: int = 0,
    column_name: str | None = None,
    options: list[ColumnOptionInput] | None = None,
    target_table_id: int | None = None,
) -> ColumnSchemaDict:
    """
    Updates a custom property column's metadata using Tortoise ORM.
    """
    col = await SystemMetaColumn.get_or_none(id=column_id, table_id=table_id)
    if not col:
        raise ValueError(f"Column id {column_id} not found for table {table_id}")

    if column_name is not None and column_name.strip():
        col.name = column_name.strip()

    if options is not None:
        col.options = json.dumps(options)

    if target_table_id is not None:
        col.target_table_id = target_table_id

    await col.save()

    opts_raw = cast(list[Any], json.loads(col.options)) if col.options else []
    opts_list: list[str] = [str(x) for x in opts_raw]
    return ColumnSchemaDict(
        id=col.id,
        table_id=col.table_id,
        name=col.name,
        physical_column_name=col.physical_column_name,
        type=col.type,
        options=opts_list,
        options_with_defaults=[],
        default_value=None,
        target_table_id=col.target_table_id,
        target_table_name=None,
        relation_column_name=None,
        target_property_name=None,
        is_inverse=False,
    )


async def delete_column(conn: DbConn = None, table_id: int = 0, column_id: int = 0) -> bool:
    """
    Deletes a custom property column using Tortoise ORM models and drops its physical column via SQLAlchemy Core DDL.
    """
    if column_id < 0:
        rel_id = -column_id
        count = await SystemMetaRelation.filter(id=rel_id, target_table_id=table_id).delete()
        return count > 0

    col = await SystemMetaColumn.get_or_none(id=column_id, table_id=table_id)
    if not col:
        return False

    phys_col, col_name = col.physical_column_name, col.name
    tbl = await SystemMetaTable.get_or_none(id=table_id)
    phys_tbl = tbl.physical_table_name if tbl else None

    if col.type == "reference":
        await SystemMetaRelation.filter(source_table_id=table_id, source_column_id=column_id).delete()
        await SystemMetaRelation.filter(target_table_id=table_id, target_column_id=column_id).delete()

    if phys_tbl and phys_col:
        with suppress(Exception):
            is_pg = "postgres" in settings.tortoise_database_url
            ddl_sql = (
                f"ALTER TABLE {phys_tbl} DROP COLUMN IF EXISTS {phys_col} CASCADE;"
                if is_pg
                else f"ALTER TABLE {phys_tbl} DROP COLUMN {phys_col};"
            )
            await exec_sqla(conn, sa.DDL(ddl_sql))

    views = await SystemMetaView.filter(table_id=table_id).all()
    for v in views:
        try:
            vis_cols: list[Any] = json.loads(v.visible_columns) if v.visible_columns else []
            new_vis_cols = [c for c in vis_cols if c != col_name]
        except (json.JSONDecodeError, TypeError, ValueError):
            new_vis_cols = []

        try:
            card_props: list[Any] = json.loads(v.card_properties) if v.card_properties else []
            new_card_props = [c for c in card_props if c != col_name]
        except (json.JSONDecodeError, TypeError, ValueError):
            new_card_props = []

        new_group_col_id = None if v.group_by_column_id == column_id else v.group_by_column_id

        v.visible_columns = json.dumps(new_vis_cols)
        v.card_properties = json.dumps(new_card_props)
        v.group_by_column_id = new_group_col_id
        await v.save()

    await col.delete()
    return True
