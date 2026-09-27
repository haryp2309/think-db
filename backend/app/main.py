from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.core.database import close_db, get_db_ctx, init_db
from app.db import seed
from app.routers import export, namespaces, rows, tables, views


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with get_db_ctx() as conn:
        await seed.seed_data(conn)
    yield
    await close_db()

tags_metadata = [
    {
        "name": "Namespaces",
        "description": "Manage top-level workspace categories (namespaces) for organizing related tables and view subpages.",
    },
    {
        "name": "Tables & Columns Schema",
        "description": "Create dynamic physical database tables, manage columns (`string`, `enum`, `tags`, `reference`, `rollup`), and automatic inverse relationships.",
    },
    {
        "name": "Row Operations",
        "description": "CRUD and batch update operations for table rows with JSON property storage and relation resolution.",
    },
    {
        "name": "Saved Views Management",
        "description": "Create, update, reorder, and delete customized views (`grid` or `kanban`) with column visibility, sorting, and filtering configurations.",
    },
    {
        "name": "Polars CSV Export",
        "description": "High-performance streaming CSV exporter powered by Polars, supporting custom column selection and row ID filtering.",
    },
]

app = FastAPI(
    title="Think DB — Dynamic Workspace Database API",
    description="""
### Overview
**Think DB** is a dynamic, high-performance database backend with flexible relational capabilities similar to Notion or Airtable.

#### Key Features
- **Namespaces**: Organize databases into top-level workspace categories.
- **Dynamic Tables & Columns**: Dynamically alter schemas on-the-fly (`string`, `enum`, `tags`, `reference`, `rollup`).
- **Bidirectional Relations**: Creating a `reference` column automatically maintains reciprocal `referenced` inverse relation columns on target tables.
- **Calculated Rollups**: Compute counts, sums, or lists of values aggregated from linked reference records.
- **Saved Views**: Store multi-view configurations (`grid` or `kanban` boards) with custom column visibility, filters, and sorts.
- **Fast CSV Export**: Export table data directly to CSV using **Polars** streaming dataframe engine.
""",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tables.router)
app.include_router(rows.router)
app.include_router(export.router)
app.include_router(views.router)
app.include_router(namespaces.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "think-db-backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
