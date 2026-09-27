import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_tables_crud_and_column_operations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create Table
        res_tbl = await client.post("/api/v1/tables", json={"name": "Projects", "emoji": "📁", "title_alias": "Project Name"})
        assert res_tbl.status_code == 201
        tbl_id = res_tbl.json()["id"]

        # Add Column (Enum)
        res_col1 = await client.post(
            f"/api/v1/tables/{tbl_id}/columns",
            json={
                "name": "Status",
                "type": "enum",
                "options": [{"value": "Todo", "isDefault": True}, {"value": "In Progress", "isDefault": False}]
            }
        )
        assert res_col1.status_code == 201
        col1_id = res_col1.json()["added_column"]["id"]

        # Duplicate Column Name Validation Check
        res_dup = await client.post(
            f"/api/v1/tables/{tbl_id}/columns",
            json={
                "name": "Status",
                "type": "enum",
                "options": []
            }
        )
        assert res_dup.status_code == 400

        # Update Column
        res_col_upd = await client.patch(
            f"/api/v1/tables/{tbl_id}/columns/{col1_id}",
            json={"name": "Project Status"}
        )
        assert res_col_upd.status_code == 200

        # Update Table Config
        res_tbl_upd = await client.patch(
            f"/api/v1/tables/{tbl_id}",
            json={"kanban_group_column_id": col1_id}
        )
        assert res_tbl_upd.status_code == 200
        assert res_tbl_upd.json()["kanban_group_column_id"] == col1_id

        # Delete Column
        res_col_del = await client.delete(f"/api/v1/tables/{tbl_id}/columns/{col1_id}")
        assert res_col_del.status_code == 200

        # Delete Table
        res_del_tbl = await client.delete(f"/api/v1/tables/{tbl_id}")
        assert res_del_tbl.status_code == 200
