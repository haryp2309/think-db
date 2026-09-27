from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.db import dynamic_sql
from app.db.common import DbConn
from app.models.schemas import (
    CreateViewDict,
    FilterRuleDict,
    SortRuleDict,
    UpdateViewConfigDict,
    ViewSchemaDict,
)

router = APIRouter(tags=["Saved Views Management"])
DbSession = Annotated[DbConn, Depends(get_db)]


class CreateViewRequest(BaseModel):
    name: str = Field(..., min_length=1, description="View display name", json_schema_extra={"example": "Active Sprint Kanban"})
    emoji: str = Field(default="📋", description="View emoji icon", json_schema_extra={"example": "🗂️"})
    type: str = Field(default="grid", description="View representation type: 'grid' or 'kanban'", json_schema_extra={"example": "kanban"})
    filter_config: list[FilterRuleDict] = Field(default=[], description="Filter configurations array")
    sort_config: list[SortRuleDict] = Field(default=[], description="Sort criteria rules array")
    group_by_column_id: int | None = Field(default=None, description="Grouping column ID (required for Kanban views)")
    visible_columns: list[str] = Field(default=[], description="List of column names visible in this view")
    card_properties: list[str] | None = Field(default=None, description="Column names to render on Kanban cards")
    is_default: bool = Field(default=False, description="Whether this view is the default initial view for the table")


class UpdateViewRequest(BaseModel):
    name: str | None = Field(default=None, description="Updated view name")
    emoji: str | None = Field(default=None, description="Updated view emoji icon")
    type: str | None = Field(default=None, description="Updated view type ('grid' or 'kanban')")
    filter_config: list[FilterRuleDict] | None = Field(default=None, description="Updated filter rules")
    sort_config: list[SortRuleDict] | None = Field(default=None, description="Updated sort rules")
    group_by_column_id: int | None = Field(default=None, description="Updated group by column ID")
    visible_columns: list[str] | None = Field(default=None, description="Updated visible column names")
    card_properties: list[str] | None = Field(default=None, description="Updated card property column names")
    is_default: bool | None = Field(default=None, description="Set as default view flag")


class ReorderViewsRequest(BaseModel):
    view_ids: list[int] = Field(..., description="Ordered array of view IDs for the table", json_schema_extra={"example": [3, 1, 2]})


@router.get(
    "/api/v1/tables/{table_id}/views",
    summary="List saved views for table",
    description="""
Fetch all configured views (`grid` or `kanban`) for a table, sorted by position order.
"""
)
async def list_views(table_id: int, db: DbSession) -> dict[str, list[ViewSchemaDict]]:
    views = await dynamic_sql.get_table_views(db, table_id)
    return {"views": views}


@router.post(
    "/api/v1/tables/{table_id}/views",
    status_code=201,
    summary="Create saved view subpage",
    description="""
Create a new saved view subpage for a table (Grid table or Kanban board view).
"""
)
async def create_view(table_id: int, req: CreateViewRequest, db: DbSession) -> ViewSchemaDict:
    try:
        new_view = await dynamic_sql.create_table_view(db, table_id, cast(CreateViewDict, req.model_dump()))
        return new_view
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create view: {e!s}") from e


@router.patch(
    "/api/v1/views/{view_id}",
    summary="Update view configuration",
    description="""
Update view settings such as name, emoji, view type (`grid`/`kanban`), filter/sort rules, visible columns, or group by column.
"""
)
async def update_view(view_id: int, req: UpdateViewRequest, db: DbSession) -> ViewSchemaDict:
    try:
        updated_view = await dynamic_sql.update_view_config(db, view_id, cast(UpdateViewConfigDict, req.model_dump(exclude_unset=True)))
        return updated_view
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update view: {e!s}") from e


@router.post(
    "/api/v1/tables/{table_id}/views/reorder",
    summary="Reorder view tabs",
    description="""
Reorder the list of saved view tab subpages for a table by specifying an ordered array of view IDs.
"""
)
async def reorder_views(table_id: int, req: ReorderViewsRequest, db: DbSession) -> dict[str, list[ViewSchemaDict]]:
    try:
        views = await dynamic_sql.reorder_table_views(db, table_id, req.view_ids)
        return {"views": views}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to reorder views: {e!s}") from e


@router.delete(
    "/api/v1/views/{view_id}",
    summary="Delete saved view",
    description="""
Delete a saved view configuration from a table.
"""
)
async def delete_view(view_id: int, db: DbSession) -> dict[str, str]:
    deleted = await dynamic_sql.delete_table_view(db, view_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="View not found")
    return {"message": "View deleted successfully"}
