from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.db import dynamic_sql, schema_builder
from app.db.common import DbConn
from app.models.schemas import (
    ColumnOptionInput,
    ColumnSchemaDict,
    TableSchemaDict,
    TableSummaryDict,
    UpdateTableConfigDict,
)

router = APIRouter(prefix="/api/v1/tables", tags=["Tables & Columns Schema"])
DbSession = Annotated[DbConn, Depends(get_db)]


class CreateTableRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Display name for the new dynamic table", json_schema_extra={"example": "Project Tasks"})
    emoji: str | None = Field(default="📁", description="Table icon emoji", json_schema_extra={"example": "📌"})
    title_alias: str | None = Field(default="Title", description="Visual display alias for the primary item title column", json_schema_extra={"example": "Task Name"})


class UpdateTableConfigRequest(BaseModel):
    name: str | None = Field(default=None, description="Updated table display name")
    emoji: str | None = Field(default=None, description="Updated table icon emoji")
    title_alias: str | None = Field(default=None, description="Updated title column alias")
    kanban_group_column_id: int | None = Field(default=None, description="Column ID used for grouping Kanban cards")
    namespace_id: int | None = Field(default=None, description="Assigned namespace category ID")


class AddColumnRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Column display name", json_schema_extra={"example": "Status"})
    type: str = Field(..., description="Property type: 'string', 'enum', 'tags', 'reference', or 'rollup'", json_schema_extra={"example": "enum"})
    options: list[ColumnOptionInput] | None = Field(default=[], description="Configured options for 'enum' or 'tags' (or rollup configuration)", json_schema_extra={"example": ["Backlog", "In Progress", "Done"]})
    target_table_id: int | None = Field(default=None, description="Target table ID required when creating 'reference' or 'rollup' columns")
    relation_column_name: str | None = Field(default=None, description="Name of the reference column to roll up from (for 'rollup' columns)")
    target_property_name: str | None = Field(default=None, description="Name of the target property to aggregate (for 'rollup' columns)")


class UpdateColumnRequest(BaseModel):
    name: str | None = Field(default=None, description="Updated column display name")
    options: list[ColumnOptionInput] | None = Field(default=None, description="Updated options list or options containing default selection")
    target_table_id: int | None = Field(default=None, description="Updated target table ID for reference column")


@router.get(
    "",
    summary="List all dynamic tables",
    description="""
Retrieve a metadata summary of all dynamic tables in the database, including physical table names, namespaces, and timestamps.
"""
)
async def list_tables(db: DbSession) -> dict[str, list[TableSummaryDict]]:
    tables = await dynamic_sql.get_all_tables(db)
    return {"tables": tables}


@router.post(
    "",
    status_code=201,
    summary="Create a dynamic table",
    description="""
Create a new dynamic physical table.
- Dynamically creates the backing physical PostgreSQL table with `id` primary key.
- Automatically generates a default `"All Items"` Grid View for the table.
"""
)
async def create_table(req: CreateTableRequest, db: DbSession) -> TableSchemaDict | None:
    try:
        table_meta = await schema_builder.create_table(db, req.name)
        if req.emoji:
            await dynamic_sql.update_table_config(db, table_meta["id"], {"emoji": req.emoji})

        await dynamic_sql.create_table_view(db, table_meta["id"], {
            "name": "All Items",
            "emoji": "📋",
            "type": "grid",
            "is_default": True
        })

        schema = await dynamic_sql.get_table_schema(db, table_meta["id"])
        return schema
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create table: {e!s}") from e


@router.get(
    "/{table_id}",
    summary="Get table schema & columns",
    description="""
Fetch full schema details for a specific table, including all dynamic columns, inverse reference columns, and saved views.
"""
)
async def get_table_schema(table_id: int, db: DbSession) -> TableSchemaDict:
    schema = await dynamic_sql.get_table_schema(db, table_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Table not found")
    return schema


@router.patch(
    "/{table_id}",
    summary="Update table metadata configuration",
    description="""
Update a table's name, emoji, title alias, assigned namespace, or Kanban grouping column.
"""
)
async def update_table_config(
    table_id: int,
    req: UpdateTableConfigRequest,
    db: DbSession
) -> TableSchemaDict | None:
    try:
        updated_schema = await dynamic_sql.update_table_config(db, table_id, cast(UpdateTableConfigDict, req.model_dump(exclude_unset=True)))
        return updated_schema
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve)) from ve


@router.delete(
    "/{table_id}",
    summary="Delete dynamic table",
    description="""
Permanently drop a dynamic table, its backing table, dynamic column schemas, views, and associated inverse relationships.
"""
)
async def delete_table(table_id: int, db: DbSession) -> dict[str, str]:
    success = await schema_builder.delete_table(db, table_id)
    if not success:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": f"Table {table_id} deleted successfully"}


@router.post(
    "/{table_id}/columns",
    status_code=201,
    summary="Add dynamic column property",
    description="""
Dynamically add a new column property to a table.
- **`string`**: Plain text property.
- **`enum`**: Single selection option dropdown.
- **`tags`**: Multi-select tags property.
- **`reference`**: Cross-table relation linking to items in `target_table_id`. **Automatically creates a reciprocal `referenced` inverse relation column on the target table**.
- **`rollup`**: Aggregated calculation computed from linked records in a `reference` column.
"""
)
async def add_column(table_id: int, req: AddColumnRequest, db: DbSession) -> dict[str, ColumnSchemaDict | TableSchemaDict | None]:
    if req.type not in ['string', 'enum', 'tags', 'reference', 'rollup']:
        raise HTTPException(status_code=400, detail="Invalid property type. Must be 'string', 'enum', 'tags', 'reference', or 'rollup'")

    try:
        col_res = await schema_builder.add_column(
            db,
            table_id=table_id,
            column_name=req.name,
            column_type=req.type,
            options=req.options,
            target_table_id=req.target_table_id,
            relation_column_name=req.relation_column_name,
            target_property_name=req.target_property_name
        )

        schema = await dynamic_sql.get_table_schema(db, table_id)
        return {"added_column": col_res, "table_schema": schema}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add column: {e!s}") from e


@router.patch(
    "/{table_id}/columns/{column_id}",
    summary="Update column configuration",
    description="""
Update column metadata (display name, select options, or target table reference).
"""
)
async def update_column(
    table_id: int,
    column_id: int,
    req: UpdateColumnRequest,
    db: DbSession
) -> dict[str, ColumnSchemaDict | TableSchemaDict | None]:
    try:
        updated = await schema_builder.update_column(
            db,
            table_id=table_id,
            column_id=column_id,
            column_name=req.name,
            options=req.options,
            target_table_id=req.target_table_id
        )
        schema = await dynamic_sql.get_table_schema(db, table_id)
        return {"updated_column": updated, "table_schema": schema}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update column: {e!s}") from e


@router.delete(
    "/{table_id}/columns/{column_id}",
    summary="Delete column property",
    description="""
Remove a dynamic column property from a table and clean up its values and inverse relationships.
"""
)
async def delete_column(
    table_id: int,
    column_id: int,
    db: DbSession
) -> dict[str, str | TableSchemaDict | None]:
    success = await schema_builder.delete_column(db, table_id, column_id)
    if not success:
        raise HTTPException(status_code=404, detail="Column not found")
    schema = await dynamic_sql.get_table_schema(db, table_id)
    return {"message": "Column deleted successfully", "table_schema": schema}
