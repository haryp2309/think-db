import asyncio

from app.core.database import close_db, get_db_ctx, init_db
from app.db import dynamic_sql


async def run_migration() -> None:
    print("Starting database schema migration...")
    await init_db()

    async with get_db_ctx() as conn:
        tables = await dynamic_sql.get_all_tables(conn)
        print(f"Discovered {len(tables)} tables in database.")

        for tbl in tables:
            tbl_id = tbl["id"]
            tbl_name = tbl["name"]

            # Ensure default view exists for each table
            views = await dynamic_sql.get_table_views(conn, tbl_id)
            if len(views) == 0:
                await dynamic_sql.create_table_view(
                    conn,
                    tbl_id,
                    {"name": "All Items", "emoji": "📋", "type": "grid", "is_default": True},
                )
                print(f"Created default view for table '{tbl_name}' (ID {tbl_id})")

    await close_db()
    print("Database schema migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
