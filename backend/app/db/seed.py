from app.db import dynamic_sql, schema_builder
from app.db.common import DbConn
from app.models.metadata import SystemMetaTable


async def seed_data(conn: DbConn) -> None:
    tables = await dynamic_sql.get_all_tables(conn)
    if len(tables) > 0:
        return

    # 1. Projects Table
    proj_meta = await schema_builder.create_table(conn, "Projects")
    proj_id = proj_meta["id"]

    col_status = await schema_builder.add_column(
        conn,
        proj_id,
        "Status",
        "enum",
        options=["Planning", "In Progress", "Review", "Done"],
    )
    await schema_builder.add_column(
        conn,
        proj_id,
        "Tags",
        "tags",
        options=["Frontend", "Backend", "Design", "Critical", "Infrastructure"],
    )

    tbl_proj = await SystemMetaTable.get_or_none(id=proj_id)
    if tbl_proj:
        tbl_proj.emoji = "🚀"
        tbl_proj.kanban_group_column_id = col_status["id"]
        await tbl_proj.save()

    # Seed Views for Projects
    await dynamic_sql.create_table_view(
        conn, proj_id, {"name": "All Projects", "emoji": "🚀", "type": "grid", "is_default": True}
    )
    await dynamic_sql.create_table_view(
        conn,
        proj_id,
        {
            "name": "Project Board",
            "emoji": "📋",
            "type": "kanban",
            "group_by_column_id": col_status["id"],
        },
    )

    # 2. Tasks Table
    task_meta = await schema_builder.create_table(conn, "Tasks")
    task_id = task_meta["id"]

    col_priority = await schema_builder.add_column(
        conn, task_id, "Priority", "enum", options=["Low", "Medium", "High", "Urgent"]
    )
    await schema_builder.add_column(
        conn, task_id, "Category", "tags", options=["Feature", "Bug", "Refactor", "Documentation"]
    )
    await schema_builder.add_column(
        conn, task_id, "Project", "reference", target_table_id=proj_id
    )

    tbl_task = await SystemMetaTable.get_or_none(id=task_id)
    if tbl_task:
        tbl_task.emoji = "📋"
        tbl_task.kanban_group_column_id = col_priority["id"]
        await tbl_task.save()

    # Seed Views for Tasks
    await dynamic_sql.create_table_view(
        conn, task_id, {"name": "All Tasks", "emoji": "📋", "type": "grid", "is_default": True}
    )
    await dynamic_sql.create_table_view(
        conn,
        task_id,
        {
            "name": "High Priority",
            "emoji": "⚡",
            "type": "grid",
            "filter_config": [{"property": "Priority", "operator": "equals", "value": "High"}],
        },
    )
    await dynamic_sql.create_table_view(
        conn,
        task_id,
        {
            "name": "Priority Board",
            "emoji": "📌",
            "type": "kanban",
            "group_by_column_id": col_priority["id"],
        },
    )

    # 3. Team Members Table
    member_meta = await schema_builder.create_table(conn, "Team Members")
    member_id = member_meta["id"]

    col_role = await schema_builder.add_column(
        conn,
        member_id,
        "Role",
        "enum",
        options=[
            "Product Manager",
            "Lead Architect",
            "Frontend Engineer",
            "Backend Developer",
            "UI/UX Designer",
        ],
    )
    await schema_builder.add_column(
        conn,
        member_id,
        "Skills",
        "tags",
        options=["React", "FastAPI", "PostgreSQL", "Polars", "Tailwind", "TypeScript", "Python"],
    )

    tbl_member = await SystemMetaTable.get_or_none(id=member_id)
    if tbl_member:
        tbl_member.emoji = "👥"
        tbl_member.kanban_group_column_id = col_role["id"]
        await tbl_member.save()

    await dynamic_sql.create_table_view(
        conn, member_id, {"name": "Directory", "emoji": "👥", "type": "grid", "is_default": True}
    )

    # Add sample rows
    p1 = await dynamic_sql.create_row(
        conn,
        proj_id,
        {
            "title": "Notion-like Dynamic Database Engine",
            "content": "### Overview\nBuild a flexible workspace app with dynamic tables, instant schema customization, and bidirectional relations.\n\n- [x] FastAPI REST API\n- [x] PostgreSQL async storage\n- [x] Alembic schema migrations\n- [x] Polars fast CSV export",
            "properties": {"Status": "In Progress", "Tags": ["Backend", "Critical", "Infrastructure"]},
        },
    )

    p2 = await dynamic_sql.create_row(
        conn,
        proj_id,
        {
            "title": "Mobile App Client (Jetpack Compose)",
            "content": "Native Android mobile client featuring clean MVVM architecture, custom Compose grid components, and live markdown previewers.",
            "properties": {"Status": "Planning", "Tags": ["Frontend", "Design"]},
        },
    )

    await dynamic_sql.create_row(
        conn,
        proj_id,
        {
            "title": "High-Performance Polars CSV Exporter",
            "content": "Stream CSV files directly out of server memory with custom column and row filters.",
            "properties": {"Status": "Done", "Tags": ["Backend", "Infrastructure"]},
        },
    )

    await dynamic_sql.create_row(
        conn,
        task_id,
        {
            "title": "Migrate schema storage engine to PostgreSQL",
            "content": "Configure PostgreSQL engine with asyncpg, SQLModel metadata, and Alembic migrations.",
            "properties": {
                "Priority": "Urgent",
                "Category": ["Feature", "Backend"],
                "Project": {"id": p1["id"]},
            },
        },
    )

    await dynamic_sql.create_row(
        conn,
        task_id,
        {
            "title": "Build modern Notion spreadsheet UI in React",
            "content": "Create rich interactive DataGrid with inline badges, custom color pickers, and live row detail drawer.",
            "properties": {
                "Priority": "High",
                "Category": ["Feature", "Refactor"],
                "Project": {"id": p1["id"]},
            },
        },
    )

    await dynamic_sql.create_row(
        conn,
        task_id,
        {
            "title": "Configure Ktor networking engine for Android client",
            "content": "Set up HTTP client with content negotiation and response models matching FastAPI API schemas.",
            "properties": {
                "Priority": "Medium",
                "Category": ["Documentation"],
                "Project": {"id": p2["id"]},
            },
        },
    )

    await dynamic_sql.create_row(
        conn,
        member_id,
        {
            "title": "Alex Mercer",
            "content": "Senior Full-Stack Architect focused on dynamic schemas and high-throughput data processing.",
            "properties": {
                "Role": "Lead Architect",
                "Skills": ["FastAPI", "PostgreSQL", "Polars", "Python"],
            },
        },
    )

    await dynamic_sql.create_row(
        conn,
        member_id,
        {
            "title": "Elena Rostova",
            "content": "Product & UI/UX Designer crafting seamless spreadsheet interactions and dark theme aesthetics.",
            "properties": {
                "Role": "UI/UX Designer",
                "Skills": ["React", "Tailwind", "TypeScript"],
            },
        },
    )
