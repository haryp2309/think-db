from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.db import dynamic_sql
from app.db.common import DbConn
from app.models.schemas import (
    CreateRowDict,
    PropertyValue,
    RowDict,
    RowsResponseDict,
    UpdateRowDict,
)

router = APIRouter(prefix="/api/v1/tables", tags=["Row Operations"])
DbSession = Annotated[DbConn, Depends(get_db)]


class CreateRowRequest(BaseModel):
    title: str = Field(default="", description="Primary title / item name", json_schema_extra={"example": "Design Landing Page Modal"})
    content: str = Field(default="", description="Rich Markdown body text / document notes", json_schema_extra={"example": "## Specifications\nImplement a Notion-style modal."})
    emoji: str | None = Field(default="", description="Icon emoji for the row record", json_schema_extra={"example": "🎨"})
    properties: dict[str, PropertyValue] = Field(default={}, description="Dynamic custom property values key-value map", json_schema_extra={"example": {"Status": "In Progress", "Priority": ["High"]}})


class UpdateRowRequest(BaseModel):
    title: str | None = Field(default=None, description="Updated primary title")
    content: str | None = Field(default=None, description="Updated Markdown content")
    emoji: str | None = Field(default=None, description="Updated icon emoji")
    properties: dict[str, PropertyValue] | None = Field(default=None, description="Updated dynamic properties map")


class BatchUpdateRowsRequest(BaseModel):
    row_ids: list[int] = Field(..., description="List of row IDs to update in batch", json_schema_extra={"example": [1, 2, 5]})
    title: str | None = Field(default=None, description="Title value to apply across rows")
    content: str | None = Field(default=None, description="Content value to apply across rows")
    emoji: str | None = Field(default=None, description="Emoji value to apply across rows")
    properties: dict[str, PropertyValue] | None = Field(default=None, description="Property updates to apply across rows", json_schema_extra={"example": {"Status": "Done"}})


@router.get(
    "/{table_id}/rows",
    summary="Query table rows",
    description="""
Fetch rows for a specific table with support for pagination (`limit`, `offset`), keyword search across title/content, and resolved dynamic properties.
Calculated **rollups** and **inverse relationships** are automatically resolved and returned in the row `properties` payload.
"""
)
async def list_rows(
    table_id: int,
    db: DbSession,
    limit: int = Query(default=500, ge=1, le=10000, description="Max rows to fetch"),
    offset: int = Query(default=0, ge=0, description="Number of rows to skip"),
    search: str | None = Query(default=None, description="Optional text search query across item title or content"),
) -> RowsResponseDict:
    try:
        data = await dynamic_sql.get_table_rows(db, table_id, limit=limit, offset=offset, search=search)
        return RowsResponseDict(
            table_id=data["table_id"],
            table_name=data["table_name"],
            total=data["total"],
            limit=data["limit"],
            offset=data["offset"],
            rows=data["rows"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve)) from ve


@router.post(
    "/{table_id}/rows",
    status_code=201,
    summary="Create a new row",
    description="""
Insert a new row into the specified dynamic table.
Accepts standard system fields (`title`, `content`, `emoji`) and custom property key-value mappings.
"""
)
async def create_row(
    table_id: int,
    req: CreateRowRequest,
    db: DbSession
) -> RowDict:
    try:
        row = await dynamic_sql.create_row(db, table_id, cast(CreateRowDict, req.model_dump()))
        return row
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create row: {e!s}") from e


@router.patch(
    "/{table_id}/rows/batch",
    summary="Batch update multiple rows",
    description="""
Apply updates to multiple rows in a single operation. Useful for multi-select actions in grid or bulk status updates in Kanban view.
"""
)
async def batch_update_rows(
    table_id: int,
    req: BatchUpdateRowsRequest,
    db: DbSession
) -> list[RowDict]:
    try:
        data = req.model_dump(exclude_unset=True)
        raw_ids = data.pop("row_ids", [])
        row_ids: list[int] = cast(list[int], raw_ids) if isinstance(raw_ids, list) else []
        updated_rows = await dynamic_sql.batch_update_rows(db, table_id, row_ids, cast(UpdateRowDict, data))
        return updated_rows
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to batch update rows: {e!s}") from e


@router.get(
    "/{table_id}/rows/{row_id}",
    summary="Get single row by ID",
    description="""
Retrieve complete record details for a single row by its physical ID.
"""
)
async def get_row(
    table_id: int,
    row_id: int,
    db: DbSession
) -> RowDict:
    res = await dynamic_sql.get_table_rows(db, table_id, limit=1000, offset=0)
    for r in res["rows"]:
        if r["id"] == row_id:
            return r
    raise HTTPException(status_code=404, detail="Row not found")


@router.patch(
    "/{table_id}/rows/{row_id}",
    summary="Update single row",
    description="""
Update single row fields (`title`, `content`, `emoji`, or dynamic property values).
"""
)
async def update_row(
    table_id: int,
    row_id: int,
    req: UpdateRowRequest,
    db: DbSession
) -> RowDict:
    try:
        data = req.model_dump(exclude_unset=True)
        row = await dynamic_sql.update_row(db, table_id, row_id, cast(UpdateRowDict, data))
        return row
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update row: {e!s}") from e


@router.delete(
    "/{table_id}/rows/{row_id}",
    summary="Delete single row",
    description="""
Delete a single row record from a dynamic table.
"""
)
async def delete_row(
    table_id: int,
    row_id: int,
    db: DbSession
) -> dict[str, str]:
    deleted = await dynamic_sql.delete_row(db, table_id, row_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Row not found")
    return {"message": "Row deleted successfully"}
