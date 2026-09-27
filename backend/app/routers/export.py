import io
from typing import Annotated, cast

import polars as pl
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.db import dynamic_sql
from app.db.common import DbConn
from app.models.schemas import PropertyValue, ScalarValue

router = APIRouter(prefix="/api/v1/export", tags=["Polars CSV Export"])
DbSession = Annotated[DbConn, Depends(get_db)]


class ExportRequest(BaseModel):
    table_id: int = Field(..., description="Target table ID to export", json_schema_extra={"example": 1})
    selected_columns: list[str] = Field(..., description="List of column names to include in the exported CSV", json_schema_extra={"example": ["id", "title", "Status", "created_at"]})
    selected_row_ids: list[int] | None = Field(default=None, description="Optional array of specific row IDs to filter. If omitted, exports all table rows.", json_schema_extra={"example": [1, 2, 3]})


@router.post(
    "/csv",
    summary="Export table data to CSV via Polars",
    description="""
Export data from a dynamic table directly into a downloadable CSV file.
- Uses **Polars** streaming dataframe engine for high performance and low memory overhead.
- Supports selecting specific columns (`selected_columns`).
- Supports filtering specific row IDs (`selected_row_ids`).
- Returns a downloadable attachment response (`Content-Disposition: attachment; filename=...csv`).
"""
)
async def export_table_csv(
    req: ExportRequest,
    db: DbSession
) -> StreamingResponse:
    schema = await dynamic_sql.get_table_schema(db, req.table_id)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Table id {req.table_id} does not exist")

    rows_data = await dynamic_sql.get_table_rows(db, req.table_id, limit=10000, offset=0)
    all_rows = rows_data["rows"]

    if req.selected_row_ids is not None:
        selected_set = set(req.selected_row_ids)
        filtered_rows = [r for r in all_rows if r["id"] in selected_set]
    else:
        filtered_rows = all_rows

    records: list[dict[str, ScalarValue]] = []
    for r in filtered_rows:
        rec: dict[str, ScalarValue] = {}
        props = r.get("properties", {})
        for col_name in req.selected_columns:
            if col_name == "id":
                rec[col_name] = r.get("id")
            elif col_name == "title":
                rec[col_name] = r.get("title", "")
            elif col_name == "content":
                rec[col_name] = r.get("content", "")
            elif col_name == "created_at":
                c_at = r.get("created_at")
                rec[col_name] = str(c_at) if c_at is not None else ""
            elif col_name == "updated_at":
                u_at = r.get("updated_at")
                rec[col_name] = str(u_at) if u_at is not None else ""
            elif col_name in props:
                val: PropertyValue = props[col_name]
                if isinstance(val, list):
                    val_list = cast(list[PropertyValue], val)
                    items_str: list[str] = [str(v) for v in val_list]
                    rec[col_name] = ", ".join(items_str)
                elif isinstance(val, dict):
                    val_dict = cast(dict[str, ScalarValue], val)
                    v_title = val_dict.get("title")
                    v_id = val_dict.get("id")
                    rec[col_name] = str(v_title) if v_title is not None else (f"#{v_id}" if v_id is not None else "")
                else:
                    rec[col_name] = val if val is not None else ""
            else:
                rec[col_name] = ""
        records.append(rec)

    try:
        if len(records) > 0:
            df = pl.DataFrame(records)
        else:
            df = pl.DataFrame({c: [] for c in req.selected_columns})

        buffer = io.BytesIO()
        df.write_csv(buffer)
        buffer.seek(0)

        tbl_name = str(schema.get("name", "table"))
        filename = f"{tbl_name.lower().replace(' ', '_')}_export.csv"
        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e!s}") from e

