import json
from typing import Any, cast

import sqlalchemy as sa

from app.db.common import (
    DbConn,
    build_sqla_table,
    exec_sqla,
    get_sqla_row_fields_table,
)
from app.models.metadata import (
    SystemMetaColumn,
    SystemMetaNamespace,
    SystemMetaRelation,
    SystemMetaRowField,
    SystemMetaTable,
    SystemMetaView,
    utc_iso_now,
)
from app.models.schemas import (
    ColumnOptionItem,
    ColumnSchemaDict,
    CreateRowDict,
    CreateViewDict,
    NamespaceSchemaDict,
    ReferenceLinkItem,
    RowDict,
    RowsResponseDict,
    TableSchemaDict,
    TableSummaryDict,
    UpdateNamespaceDict,
    UpdateRowDict,
    UpdateTableConfigDict,
    UpdateViewConfigDict,
    ViewSchemaDict,
)


async def get_all_namespaces(conn: DbConn) -> list[NamespaceSchemaDict]:
    ns_records = await SystemMetaNamespace.all().order_by("id")
    all_tables = await get_all_tables(conn)

    for tbl in all_tables:
        views = await get_table_views(conn, tbl["id"])
        tbl["views"] = views

    namespaces: list[NamespaceSchemaDict] = []
    for ns in ns_records:
        ns_tables = [t for t in all_tables if t.get("namespace_id") == ns.id]
        namespaces.append({
            "id": ns.id,
            "name": ns.name,
            "emoji": ns.emoji or "📁",
            "is_collapsed": bool(ns.is_collapsed),
            "created_at": ns.created_at,
            "updated_at": ns.updated_at,
            "tables": ns_tables,
        })
    return namespaces


async def create_namespace(conn: DbConn, name: str, emoji: str = "📁") -> NamespaceSchemaDict:
    ns = await SystemMetaNamespace.create(
        name=name.strip(),
        emoji=emoji.strip() if emoji else "📁",
        is_collapsed=0,
    )
    return {
        "id": ns.id,
        "name": ns.name,
        "emoji": ns.emoji or "📁",
        "is_collapsed": False,
        "created_at": ns.created_at,
        "updated_at": ns.updated_at,
        "tables": [],
    }


async def update_namespace(conn: DbConn, ns_id: int, data: UpdateNamespaceDict) -> NamespaceSchemaDict:
    ns = await SystemMetaNamespace.get_or_none(id=ns_id)
    if not ns:
        raise ValueError(f"Namespace {ns_id} not found")

    if name := data.get("name"):
        ns.name = name.strip()
    if emoji := data.get("emoji"):
        ns.emoji = emoji.strip()
    if "is_collapsed" in data:
        ns.is_collapsed = 1 if data["is_collapsed"] else 0

    ns.updated_at = utc_iso_now()
    await ns.save()

    return {
        "id": ns.id,
        "name": ns.name,
        "emoji": ns.emoji or "📁",
        "is_collapsed": bool(ns.is_collapsed),
        "created_at": ns.created_at,
        "updated_at": ns.updated_at,
    }


async def delete_namespace(conn: DbConn, ns_id: int) -> bool:
    ns = await SystemMetaNamespace.get_or_none(id=ns_id)
    if not ns:
        return False
    await ns.delete()
    return True


async def get_all_tables(conn: DbConn) -> list[TableSummaryDict]:
    tbl_records = await SystemMetaTable.all().order_by("id")
    kanban_col_ids = [t.kanban_group_column_id for t in tbl_records if t.kanban_group_column_id]
    kanban_cols = (
        {c.id: c.name for c in await SystemMetaColumn.filter(id__in=kanban_col_ids)}
        if kanban_col_ids
        else {}
    )

    tables: list[TableSummaryDict] = []
    for t in tbl_records:
        phys_tbl = build_sqla_table(t.physical_table_name)
        cnt_stmt = sa.select(sa.func.count()).select_from(phys_tbl)
        count_cur = await exec_sqla(conn, cnt_stmt)
        c_row = await count_cur.fetchone()
        row_count = int(c_row[0]) if c_row else 0

        col_count = await SystemMetaColumn.filter(table_id=t.id).count()

        tables.append({
            "id": t.id,
            "name": t.name,
            "emoji": t.emoji or "📁",
            "title_alias": t.title_alias or "Title",
            "physical_table_name": t.physical_table_name,
            "namespace_id": t.namespace_id or 1,
            "kanban_group_column_id": t.kanban_group_column_id,
            "kanban_group_column_name": kanban_cols.get(t.kanban_group_column_id)
            if t.kanban_group_column_id
            else None,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "row_count": row_count,
            "column_count": col_count + 5,
        })
    return tables


async def get_table_schema(conn: DbConn, table_id: int) -> TableSchemaDict | None:
    tbl = await SystemMetaTable.get_or_none(id=table_id)
    if not tbl:
        return None

    kanban_col_name: str | None = None
    if tbl.kanban_group_column_id:
        kanban_col = await SystemMetaColumn.get_or_none(id=tbl.kanban_group_column_id)
        if kanban_col:
            kanban_col_name = kanban_col.name

    col_records = await SystemMetaColumn.filter(table_id=table_id).order_by("id")
    target_table_ids = [c.target_table_id for c in col_records if c.target_table_id]
    target_tables = (
        {t.id: t.name for t in await SystemMetaTable.filter(id__in=target_table_ids)}
        if target_table_ids
        else {}
    )

    columns: list[ColumnSchemaDict] = []
    for col in col_records:
        options_str = col.options
        try:
            raw_options: Any = json.loads(options_str) if options_str else []
        except (json.JSONDecodeError, TypeError, ValueError):
            raw_options = []

        options_with_defaults: list[ColumnOptionItem] = []
        plain_options: list[str] = []
        default_value: str | None = None
        relation_col_name: str | None = None
        target_prop_name: str | None = None

        if col.type == "rollup" and isinstance(raw_options, dict):
            raw_dict = cast(dict[str, Any], raw_options)
            rel_name = raw_dict.get("relation_column_name")
            target_prop = raw_dict.get("target_property_name")
            relation_col_name = str(rel_name) if rel_name is not None else None
            target_prop_name = str(target_prop) if target_prop is not None else None
        elif isinstance(raw_options, list):
            raw_list = cast(list[Any], raw_options)
            for opt in raw_list:
                if isinstance(opt, dict):
                    opt_dict = cast(dict[str, Any], opt)
                    opt_val = opt_dict.get("value", "")
                    val = str(opt_val)
                    is_def = bool(opt_dict.get("isDefault", False))
                    options_with_defaults.append({"value": val, "isDefault": is_def})
                    plain_options.append(val)
                    if is_def:
                        default_value = val
                else:
                    options_with_defaults.append({"value": str(opt), "isDefault": False})
                    plain_options.append(str(opt))

        is_inv = await SystemMetaRelation.filter(target_column_id=col.id).exists()

        columns.append({
            "id": col.id,
            "table_id": col.table_id,
            "name": col.name,
            "physical_column_name": col.physical_column_name,
            "type": col.type,
            "options": plain_options,
            "options_with_defaults": options_with_defaults,
            "default_value": default_value,
            "target_table_id": col.target_table_id,
            "target_table_name": target_tables.get(col.target_table_id)
            if col.target_table_id
            else None,
            "relation_column_name": relation_col_name,
            "target_property_name": target_prop_name,
            "is_inverse": is_inv,
        })

    rel_records = await SystemMetaRelation.filter(target_table_id=table_id).order_by("id")
    if rel_records:
        src_table_ids = [r.source_table_id for r in rel_records]
        src_col_ids = [r.source_column_id for r in rel_records]
        src_tables = {t.id: t.name for t in await SystemMetaTable.filter(id__in=src_table_ids)}
        src_cols = {c.id: c.name for c in await SystemMetaColumn.filter(id__in=src_col_ids)}

        existing_col_names = {c["name"].lower() for c in columns}
        src_counts: dict[str, int] = {}
        for r in rel_records:
            s_name = src_tables.get(r.source_table_id, "")
            src_counts[s_name] = src_counts.get(s_name, 0) + 1

        for r in rel_records:
            src_tbl_name = src_tables.get(r.source_table_id, "")
            src_col_name = src_cols.get(r.source_column_id, "")
            col_name = src_tbl_name
            if src_counts.get(src_tbl_name, 0) > 1 or src_tbl_name.lower() in existing_col_names:
                col_name = f"{src_tbl_name} ({src_col_name})"

            base_name = col_name
            counter = 1
            while col_name.lower() in existing_col_names:
                col_name = f"{base_name} ({counter})"
                counter += 1

            existing_col_names.add(col_name.lower())

            columns.append({
                "id": -r.id,
                "table_id": table_id,
                "name": col_name,
                "physical_column_name": f"virtual_rel_{r.id}",
                "type": "referenced",
                "options": [],
                "options_with_defaults": [],
                "default_value": None,
                "target_table_id": r.source_table_id,
                "target_table_name": src_tbl_name,
                "relation_column_name": src_col_name,
                "target_property_name": None,
                "is_inverse": True,
                "is_readonly": True,
                "source_column_id": r.source_column_id,
            })

    for col in columns:
        if (
            col["type"] == "rollup"
            and not col.get("target_table_id")
            and col.get("relation_column_name")
        ):
            rel_col = next((c for c in columns if c["name"] == col["relation_column_name"]), None)
            if rel_col and rel_col.get("target_table_id"):
                col["target_table_id"] = rel_col["target_table_id"]
                tgt_tbl = await SystemMetaTable.get_or_none(id=col["target_table_id"])
                if tgt_tbl:
                    col["target_table_name"] = tgt_tbl.name

    return {
        "id": tbl.id,
        "name": tbl.name,
        "emoji": tbl.emoji or "📁",
        "title_alias": tbl.title_alias or "Title",
        "physical_table_name": tbl.physical_table_name,
        "kanban_group_column_id": tbl.kanban_group_column_id,
        "kanban_group_column_name": kanban_col_name,
        "created_at": tbl.created_at,
        "updated_at": tbl.updated_at,
        "columns": columns,
    }


async def update_table_config(
    conn: DbConn, table_id: int, data: UpdateTableConfigDict
) -> TableSchemaDict | None:
    tbl = await SystemMetaTable.get_or_none(id=table_id)
    if not tbl:
        raise ValueError(f"Table id {table_id} does not exist")

    if name := data.get("name"):
        tbl.name = name
    if emoji := data.get("emoji"):
        tbl.emoji = emoji
    if title_alias := data.get("title_alias"):
        tbl.title_alias = title_alias
    if "kanban_group_column_id" in data:
        tbl.kanban_group_column_id = data["kanban_group_column_id"]
    if "namespace_id" in data and data["namespace_id"] is not None:
        tbl.namespace_id = data["namespace_id"]

    tbl.updated_at = utc_iso_now()
    await tbl.save()

    return await get_table_schema(conn, table_id)


# --- VIEWS MANAGEMENT ---


async def get_table_views(conn: DbConn, table_id: int) -> list[ViewSchemaDict]:
    view_records = await SystemMetaView.filter(table_id=table_id).order_by("position", "id")
    group_col_ids = [v.group_by_column_id for v in view_records if v.group_by_column_id]
    group_cols = (
        {c.id: c.name for c in await SystemMetaColumn.filter(id__in=group_col_ids)}
        if group_col_ids
        else {}
    )

    views: list[ViewSchemaDict] = []
    for v in view_records:
        views.append({
            "id": v.id,
            "table_id": v.table_id,
            "name": v.name,
            "emoji": v.emoji or "📋",
            "type": v.type,
            "filter_config": json.loads(v.filter_config) if v.filter_config else [],
            "sort_config": json.loads(v.sort_config) if v.sort_config else [],
            "group_by_column_id": v.group_by_column_id,
            "group_by_column_name": group_cols.get(v.group_by_column_id)
            if v.group_by_column_id
            else None,
            "visible_columns": json.loads(v.visible_columns) if v.visible_columns else [],
            "card_properties": json.loads(v.card_properties) if v.card_properties else [],
            "is_default": bool(v.is_default),
            "position": v.position or 0,
            "created_at": v.created_at,
            "updated_at": v.updated_at,
        })
    return views


async def create_table_view(conn: DbConn, table_id: int, data: CreateViewDict) -> ViewSchemaDict:
    schema = await get_table_schema(conn, table_id)
    if not schema:
        raise ValueError(f"Table id {table_id} does not exist")

    existing_views = await SystemMetaView.filter(table_id=table_id).all()
    v_count = len(existing_views)
    max_pos = max((v.position for v in existing_views if v.position is not None), default=-1)

    name = data.get("name", "New View")
    emoji = data.get("emoji", "📋")
    v_type = data.get("type", "grid")
    filter_config = json.dumps(data.get("filter_config", []))
    sort_config = json.dumps(data.get("sort_config", []))
    group_by_column_id = data.get("group_by_column_id")
    raw_card_props = data.get("card_properties")
    if raw_card_props is None:
        col_names = ["content"] + [c["name"] for c in schema.get("columns", [])]
        card_properties = json.dumps(col_names)
    else:
        card_properties = json.dumps(raw_card_props)

    raw_vis_cols = data.get("visible_columns")
    if raw_vis_cols is None:
        vis_col_names = ["content"] + [c["name"] for c in schema.get("columns", [])]
        visible_columns = json.dumps(vis_col_names)
    else:
        visible_columns = json.dumps(raw_vis_cols)

    position = max_pos + 1
    is_default = 1 if v_count == 0 else 0

    view_obj = await SystemMetaView.create(
        table_id=table_id,
        name=name,
        emoji=emoji,
        type=v_type,
        filter_config=filter_config,
        sort_config=sort_config,
        group_by_column_id=group_by_column_id,
        visible_columns=visible_columns,
        card_properties=card_properties,
        is_default=is_default,
        position=position,
    )

    views = await get_table_views(conn, table_id)
    for v in views:
        if v["id"] == view_obj.id:
            return v
    return {"id": view_obj.id, "name": name, "emoji": emoji, "type": v_type}


async def update_view_config(
    conn: DbConn, view_id: int, data: UpdateViewConfigDict
) -> ViewSchemaDict:
    view_obj = await SystemMetaView.get_or_none(id=view_id)
    if not view_obj:
        raise ValueError(f"View id {view_id} does not exist")

    table_id = view_obj.table_id

    if name := data.get("name"):
        view_obj.name = name
    if emoji := data.get("emoji"):
        view_obj.emoji = emoji
    if view_type := data.get("type"):
        view_obj.type = view_type
    if "filter_config" in data:
        view_obj.filter_config = json.dumps(data["filter_config"])
    if "sort_config" in data:
        view_obj.sort_config = json.dumps(data["sort_config"])
    if "group_by_column_id" in data:
        view_obj.group_by_column_id = data["group_by_column_id"]
    if "visible_columns" in data:
        view_obj.visible_columns = json.dumps(data["visible_columns"])
    if "card_properties" in data:
        view_obj.card_properties = json.dumps(data["card_properties"])
    if "position" in data:
        view_obj.position = data["position"]
    if "is_default" in data:
        view_obj.is_default = 1 if data["is_default"] else 0

    view_obj.updated_at = utc_iso_now()
    await view_obj.save()

    views = await get_table_views(conn, table_id)
    for v in views:
        if v["id"] == view_id:
            return v

    return {"id": view_id, "table_id": table_id, "name": "", "emoji": "📋", "type": "grid"}


async def reorder_table_views(
    conn: DbConn, table_id: int, view_ids: list[int]
) -> list[ViewSchemaDict]:
    for idx, v_id in enumerate(view_ids):
        is_def = 1 if idx == 0 else 0
        await SystemMetaView.filter(id=v_id, table_id=table_id).update(
            position=idx,
            is_default=is_def,
            updated_at=utc_iso_now(),
        )
    return await get_table_views(conn, table_id)


async def delete_table_view(conn: DbConn, view_id: int) -> bool:
    view_obj = await SystemMetaView.get_or_none(id=view_id)
    if not view_obj:
        return False
    table_id = view_obj.table_id
    await view_obj.delete()

    remaining = await get_table_views(conn, table_id)
    if remaining:
        rem_ids = [v["id"] for v in remaining]
        await reorder_table_views(conn, table_id, rem_ids)
    return True


# --- ROWS OPERATIONS ---


async def get_table_rows(
    conn: DbConn,
    table_id: int,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> RowsResponseDict:
    schema = await get_table_schema(conn, table_id)
    if not schema:
        raise ValueError(f"Table id {table_id} does not exist")

    physical_tbl = schema["physical_table_name"]
    columns = schema["columns"]

    phys_tbl = build_sqla_table(physical_tbl, columns)
    row_fields_tbl = get_sqla_row_fields_table()

    j = sa.outerjoin(
        phys_tbl,
        row_fields_tbl,
        sa.and_(
            row_fields_tbl.c.table_name == physical_tbl,
            row_fields_tbl.c.row_id == phys_tbl.c.id,
        ),
    )

    cnt_stmt = sa.select(sa.func.count()).select_from(j)
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        cnt_stmt = cnt_stmt.where(
            sa.or_(
                row_fields_tbl.c.title.like(search_term),
                row_fields_tbl.c.content.like(search_term),
            )
        )

    count_cursor = await exec_sqla(conn, cnt_stmt)
    cnt_row = await count_cursor.fetchone()
    total_count = int(cnt_row[0]) if cnt_row else 0

    sel_stmt = (
        sa.select(
            phys_tbl.c.id.label("id"),
            sa.func.coalesce(row_fields_tbl.c.emoji, "").label("emoji"),
            sa.func.coalesce(row_fields_tbl.c.title, "").label("title"),
            sa.func.coalesce(row_fields_tbl.c.content, "").label("content"),
            cast(Any, sa.literal_column(f"{physical_tbl}.*")),
        )
        .select_from(j)
        .order_by(phys_tbl.c.id.desc())
        .limit(limit)
        .offset(offset)
    )

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        sel_stmt = sel_stmt.where(
            sa.or_(
                row_fields_tbl.c.title.like(search_term),
                row_fields_tbl.c.content.like(search_term),
            )
        )

    cursor = await exec_sqla(conn, sel_stmt)
    db_rows = await cursor.fetchall()
    col_names = [d[0] for d in cursor.description] if cursor.description else []

    rows: list[RowDict] = []
    for db_row in db_rows:
        row_dict = dict(zip(col_names, db_row))

        properties: dict[str, Any] = {}
        for col in columns:
            p_name = col["physical_column_name"]
            c_name = col["name"]
            raw_val = row_dict.get(p_name)

            if col.get("is_inverse") or col["type"] == "referenced":
                src_tbl_id = col.get("target_table_id")
                src_col_id = col.get("source_column_id")
                target_row_id = row_dict.get("id")
                linking_items: list[ReferenceLinkItem] = []
                if src_tbl_id and target_row_id is not None:
                    src_tbl = await SystemMetaTable.get_or_none(id=src_tbl_id)
                    if src_tbl:
                        src_phys_tbl_name = src_tbl.physical_table_name
                        src_col = await SystemMetaColumn.get_or_none(id=src_col_id)
                        if src_col:
                            src_phys_col = src_col.physical_column_name
                            src_sqla_tbl = build_sqla_table(src_phys_tbl_name)
                            src_j = sa.outerjoin(
                                src_sqla_tbl,
                                row_fields_tbl,
                                sa.and_(
                                    row_fields_tbl.c.table_name == src_phys_tbl_name,
                                    row_fields_tbl.c.row_id == src_sqla_tbl.c.id,
                                ),
                            )
                            ref_link_stmt = (
                                sa.select(
                                    src_sqla_tbl.c.id,
                                    sa.func.coalesce(row_fields_tbl.c.emoji, "").label("emoji"),
                                    sa.func.coalesce(row_fields_tbl.c.title, "").label("title"),
                                )
                                .select_from(src_j)
                                .where(sa.column(src_phys_col) == target_row_id)
                                .order_by(src_sqla_tbl.c.id.asc())
                            )
                            r_cur = await exec_sqla(conn, ref_link_stmt)
                            src_rows = await r_cur.fetchall()
                            linking_items = [
                                ReferenceLinkItem(
                                    id=sr[0],
                                    emoji=sr[1] or "",
                                    title=sr[2] or f"Row #{sr[0]}",
                                    table_name=col.get("target_table_name") or "",
                                )
                                for sr in src_rows
                            ]
                properties[c_name] = linking_items

            elif col["type"] == "tags":
                if isinstance(raw_val, str):
                    try:
                        properties[c_name] = json.loads(raw_val)
                    except (json.JSONDecodeError, TypeError, ValueError):
                        properties[c_name] = [
                            tag.strip() for tag in raw_val.split(",") if tag.strip()
                        ]
                else:
                    properties[c_name] = raw_val if raw_val is not None else []

            elif col["type"] == "reference":
                if raw_val is not None:
                    tgt_table_id = col["target_table_id"]
                    if tgt_table_id:
                        tgt_schema = await get_table_schema(conn, tgt_table_id)
                        if tgt_schema:
                            tgt_phys_tbl_name = tgt_schema["physical_table_name"]
                            tgt_sqla_tbl = build_sqla_table(tgt_phys_tbl_name)
                            tgt_j = sa.outerjoin(
                                tgt_sqla_tbl,
                                row_fields_tbl,
                                sa.and_(
                                    row_fields_tbl.c.table_name == tgt_phys_tbl_name,
                                    row_fields_tbl.c.row_id == tgt_sqla_tbl.c.id,
                                ),
                            )
                            ref_stmt = (
                                sa.select(
                                    tgt_sqla_tbl.c.id,
                                    sa.func.coalesce(row_fields_tbl.c.emoji, "").label("emoji"),
                                    sa.func.coalesce(row_fields_tbl.c.title, "").label("title"),
                                )
                                .select_from(tgt_j)
                                .where(tgt_sqla_tbl.c.id == raw_val)
                            )
                            r_cur = await exec_sqla(conn, ref_stmt)
                            ref_row = await r_cur.fetchone()
                            if ref_row:
                                properties[c_name] = {
                                    "id": ref_row[0],
                                    "emoji": ref_row[1] or "",
                                    "title": ref_row[2],
                                }
                            else:
                                properties[c_name] = {
                                    "id": raw_val,
                                    "emoji": "",
                                    "title": f"Row #{raw_val}",
                                }
                        else:
                            properties[c_name] = {
                                "id": raw_val,
                                "emoji": "",
                                "title": f"Row #{raw_val}",
                            }
                    else:
                        properties[c_name] = {
                            "id": raw_val,
                            "emoji": "",
                            "title": f"Row #{raw_val}",
                        }
                else:
                    properties[c_name] = None

            else:
                properties[c_name] = raw_val

        rows.append(
            RowDict(
                id=row_dict.get("id"),
                emoji=row_dict.get("emoji", ""),
                title=row_dict.get("title", ""),
                content=row_dict.get("content", ""),
                created_at=row_dict.get("created_at"),
                updated_at=row_dict.get("updated_at"),
                properties=properties,
                _raw=row_dict,
            )
        )

    return RowsResponseDict(
        table_id=table_id,
        table_name=schema["name"],
        total=total_count,
        limit=limit,
        offset=offset,
        rows=rows,
    )


async def create_row(conn: DbConn, table_id: int, data: CreateRowDict) -> RowDict:
    schema = await get_table_schema(conn, table_id)
    if not schema:
        raise ValueError(f"Table id {table_id} does not exist")

    physical_tbl = schema["physical_table_name"]
    columns = schema["columns"]

    emoji = data.get("emoji", "")
    title = data.get("title", "")
    content = data.get("content", "")
    properties_in = data.get("properties", {})

    insert_cols: list[str] = []
    insert_vals: list[Any] = []

    for col in columns:
        if (
            col.get("is_inverse")
            or col["type"] in ("referenced", "rollup")
            or col["physical_column_name"].startswith("virtual")
        ):
            continue
        c_name = col["name"]
        p_name = col["physical_column_name"]
        c_type = col["type"]
        col_default = col.get("default_value")

        if c_name in properties_in:
            val = properties_in[c_name]
            insert_cols.append(p_name)
            if c_type == "tags":
                if isinstance(val, list):
                    insert_vals.append(json.dumps(val))
                else:
                    insert_vals.append(json.dumps([]))
            elif c_type == "reference":
                if isinstance(val, dict):
                    val_dict = cast(dict[str, Any], val)
                    insert_vals.append(val_dict.get("id"))
                elif isinstance(val, (int, str)) and str(val).isdigit():
                    insert_vals.append(int(val))
                else:
                    insert_vals.append(None)
            else:
                insert_vals.append(val)
        elif col_default is not None:
            insert_cols.append(p_name)
            if c_type == "tags":
                insert_vals.append(json.dumps([col_default]))
            elif c_type == "reference":
                insert_vals.append(int(col_default) if str(col_default).isdigit() else col_default)
            else:
                insert_vals.append(col_default)

    phys_sqla_tbl = build_sqla_table(physical_tbl, columns)
    if insert_cols:
        val_map = dict(zip(insert_cols, insert_vals))
        ins_stmt = sa.insert(phys_sqla_tbl).values(**val_map)
    else:
        ins_stmt = sa.insert(phys_sqla_tbl)

    cursor = await exec_sqla(conn, ins_stmt)
    row_id = cursor.lastrowid if cursor.lastrowid is not None else 0

    now_str = utc_iso_now()
    row_field = await SystemMetaRowField.get_or_none(table_name=physical_tbl, row_id=row_id)
    if not row_field:
        row_field = await SystemMetaRowField.create(
            table_name=physical_tbl,
            row_id=row_id,
            title=title,
            content=content,
            emoji=emoji,
            created_at=now_str,
            updated_at=now_str,
        )
    else:
        row_field.title = title
        row_field.content = content
        row_field.emoji = emoji
        await row_field.save()

    rows_res = await get_table_rows(conn, table_id, limit=1, offset=0, search=None)
    for r in rows_res["rows"]:
        if r["id"] == row_id:
            return r

    return RowDict(id=row_id, title=title, content=content, properties=properties_in)


async def update_row(conn: DbConn, table_id: int, row_id: int, data: UpdateRowDict) -> RowDict:
    schema = await get_table_schema(conn, table_id)
    if not schema:
        raise ValueError(f"Table id {table_id} does not exist")

    physical_tbl = schema["physical_table_name"]
    columns = schema["columns"]

    now_str = utc_iso_now()
    row_field = await SystemMetaRowField.get_or_none(table_name=physical_tbl, row_id=row_id)
    if not row_field:
        row_field = await SystemMetaRowField.create(
            table_name=physical_tbl,
            row_id=row_id,
            title="",
            content="",
            emoji="",
            created_at=now_str,
            updated_at=now_str,
        )

    if "emoji" in data and data["emoji"] is not None:
        row_field.emoji = data["emoji"]
    if "title" in data and data["title"] is not None:
        row_field.title = data["title"]
    if "content" in data and data["content"] is not None:
        row_field.content = data["content"]

    row_field.updated_at = now_str
    await row_field.save()

    prop_updates: list[str] = []
    prop_vals: list[Any] = []

    if "properties" in data and data["properties"] is not None:
        properties_in = data["properties"]
        for col in columns:
            if (
                col.get("is_inverse")
                or col["type"] in ("referenced", "rollup")
                or col["physical_column_name"].startswith("virtual")
            ):
                continue
            c_name = col["name"]
            p_name = col["physical_column_name"]
            c_type = col["type"]

            if c_name in properties_in:
                val = properties_in[c_name]
                prop_updates.append(p_name)

                if c_type == "tags":
                    if isinstance(val, list):
                        prop_vals.append(json.dumps(val))
                    else:
                        prop_vals.append(json.dumps([]))
                elif c_type == "reference":
                    if isinstance(val, dict):
                        val_dict = cast(dict[str, Any], val)
                        prop_vals.append(val_dict.get("id"))
                    elif isinstance(val, (int, str)) and str(val).isdigit():
                        prop_vals.append(int(val))
                    else:
                        prop_vals.append(None)
                else:
                    prop_vals.append(val)

    if len(prop_updates) > 0:
        phys_sqla_tbl = build_sqla_table(physical_tbl, columns)
        val_map = dict(zip(prop_updates, prop_vals))
        upd_stmt = (
            sa.update(phys_sqla_tbl)
            .where(phys_sqla_tbl.c.id == row_id)
            .values(**val_map)
        )
        await exec_sqla(conn, upd_stmt)

    rows_res = await get_table_rows(conn, table_id, limit=1000, offset=0)
    for r in rows_res["rows"]:
        if r["id"] == row_id:
            return r

    return RowDict(id=row_id, properties={})


async def batch_update_rows(
    conn: DbConn, table_id: int, row_ids: list[int], data: UpdateRowDict
) -> list[RowDict]:
    schema = await get_table_schema(conn, table_id)
    if not schema:
        raise ValueError(f"Table id {table_id} does not exist")

    physical_tbl = schema["physical_table_name"]
    columns = schema["columns"]

    if not row_ids:
        return []

    now_str = utc_iso_now()

    for rid in row_ids:
        row_field = await SystemMetaRowField.get_or_none(table_name=physical_tbl, row_id=rid)
        if not row_field:
            row_field = await SystemMetaRowField.create(
                table_name=physical_tbl,
                row_id=rid,
                title="",
                content="",
                emoji="",
                created_at=now_str,
                updated_at=now_str,
            )

        if "emoji" in data and data["emoji"] is not None:
            row_field.emoji = data["emoji"]
        if "title" in data and data["title"] is not None:
            row_field.title = data["title"]
        if "content" in data and data["content"] is not None:
            row_field.content = data["content"]
        row_field.updated_at = now_str
        await row_field.save()

    prop_updates: list[str] = []
    prop_vals: list[Any] = []

    if "properties" in data and data["properties"] is not None:
        properties_in: dict[str, Any] = data["properties"]
        for col in columns:
            if (
                col.get("is_inverse")
                or col["type"] in ("referenced", "rollup")
                or col["physical_column_name"].startswith("virtual")
            ):
                continue
            c_name = col["name"]
            p_name = col["physical_column_name"]
            c_type = col["type"]

            if c_name in properties_in:
                val: Any = properties_in[c_name]
                prop_updates.append(p_name)

                if c_type == "tags":
                    if isinstance(val, list):
                        prop_vals.append(json.dumps(val))
                    else:
                        prop_vals.append(json.dumps([]))
                elif c_type == "reference":
                    if isinstance(val, dict):
                        val_dict = cast(dict[str, Any], val)
                        ref_id = val_dict.get("id")
                        prop_vals.append(ref_id)
                    elif isinstance(val, (int, str)) and str(val).isdigit():
                        prop_vals.append(int(val))
                    else:
                        prop_vals.append(None)
                else:
                    prop_vals.append(val)

    if len(prop_updates) > 0:
        phys_sqla_tbl = build_sqla_table(physical_tbl, columns)
        val_map = dict(zip(prop_updates, prop_vals))
        upd_stmt = (
            sa.update(phys_sqla_tbl)
            .where(phys_sqla_tbl.c.id.in_(row_ids))
            .values(**val_map)
        )
        await exec_sqla(conn, upd_stmt)

    rows_res = await get_table_rows(conn, table_id, limit=1000, offset=0)
    updated_rows = [r for r in rows_res["rows"] if r["id"] in row_ids]
    return updated_rows


async def delete_row(conn: DbConn, table_id: int, row_id: int) -> bool:
    schema = await get_table_schema(conn, table_id)
    if not schema:
        return False
    physical_tbl = schema["physical_table_name"]

    await SystemMetaRowField.filter(table_name=physical_tbl, row_id=row_id).delete()

    phys_sqla_tbl = build_sqla_table(physical_tbl)
    dlt_stmt = sa.delete(phys_sqla_tbl).where(phys_sqla_tbl.c.id == row_id)
    cursor = await exec_sqla(conn, dlt_stmt)

    ref_cols = await SystemMetaColumn.filter(target_table_id=table_id, type="reference").all()
    for col in ref_cols:
        options_str = col.options
        if not options_str:
            continue
        try:
            raw_options: Any = json.loads(options_str)
            modified = False
            new_options: list[Any] = []
            if isinstance(raw_options, list):
                raw_list = cast(list[Any], raw_options)
                for opt in raw_list:
                    if isinstance(opt, dict):
                        opt_dict = cast(dict[str, Any], opt)
                        opt_val = opt_dict.get("value")
                        if opt_val is not None and str(opt_val) == str(row_id):
                            modified = True
                        else:
                            new_options.append(opt)
                    else:
                        if str(opt) == str(row_id):
                            modified = True
                        else:
                            new_options.append(opt)
            if modified:
                col.options = json.dumps(new_options)
                await col.save()
        except (json.JSONDecodeError, TypeError, ValueError):
            continue

    return cursor.rowcount > 0
