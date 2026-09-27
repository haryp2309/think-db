from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.db import dynamic_sql
from app.db.common import DbConn
from app.models.schemas import NamespaceSchemaDict, UpdateNamespaceDict

router = APIRouter(prefix="/api/v1/namespaces", tags=["Namespaces"])
DbSession = Annotated[DbConn, Depends(get_db)]


class CreateNamespaceRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Namespace display name (e.g. 'Product & Engineering')", json_schema_extra={"example": "Product & Engineering"})
    emoji: str | None = Field(default="📁", description="Emoji icon for the namespace category", json_schema_extra={"example": "🚀"})


class UpdateNamespaceRequest(BaseModel):
    name: str | None = Field(default=None, description="New display name for the namespace", json_schema_extra={"example": "Core Architecture"})
    emoji: str | None = Field(default=None, description="New emoji icon", json_schema_extra={"example": "⚡"})
    is_collapsed: bool | None = Field(default=None, description="Sidebar collapse state flag")


@router.get(
    "",
    summary="List all workspace namespaces",
    description="""
Fetch all top-level namespaces along with their assigned tables and view subpages.
Used by the sidebar component to render the workspace hierarchy.
"""
)
async def list_namespaces(db: DbSession) -> dict[str, list[NamespaceSchemaDict]]:
    namespaces = await dynamic_sql.get_all_namespaces(db)
    return {"namespaces": namespaces}


@router.post(
    "",
    status_code=201,
    summary="Create a new namespace",
    description="""
Create a new top-level workspace namespace category.
Tables and views can subsequently be assigned or moved into this namespace.
"""
)
async def create_namespace(req: CreateNamespaceRequest, db: DbSession) -> NamespaceSchemaDict:
    try:
        ns = await dynamic_sql.create_namespace(db, req.name, req.emoji or "📁")
        return ns
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create namespace: {e!s}") from e


@router.patch(
    "/{ns_id}",
    summary="Update namespace configuration",
    description="""
Update a namespace's display name, emoji icon, or sidebar collapse state.
"""
)
async def update_namespace(
    ns_id: int,
    req: UpdateNamespaceRequest,
    db: DbSession
) -> NamespaceSchemaDict:
    try:
        updated = await dynamic_sql.update_namespace(db, ns_id, cast(UpdateNamespaceDict, req.model_dump(exclude_unset=True)))
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve)) from ve
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update namespace: {e!s}") from e


@router.delete(
    "/{ns_id}",
    summary="Delete a namespace",
    description="""
Delete a namespace category. Tables previously in this namespace will be safely unassigned (`namespace_id = NULL`) rather than deleted.
"""
)
async def delete_namespace(ns_id: int, db: DbSession) -> dict[str, str]:
    success = await dynamic_sql.delete_namespace(db, ns_id)
    if not success:
        raise HTTPException(status_code=404, detail="Namespace not found")
    return {"message": f"Namespace {ns_id} deleted successfully"}

