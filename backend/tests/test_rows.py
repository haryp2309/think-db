import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_rows_crud_and_batch_operations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create Table
        res_tbl = await client.post("/api/v1/tables", json={"name": "Feature Requests"})
        assert res_tbl.status_code == 201
        tbl_id = res_tbl.json()["id"]

        # Add Column (Tags)
        await client.post(
            f"/api/v1/tables/{tbl_id}/columns",
            json={"name": "Category", "type": "tags"}
        )

        # Create Row 1
        res_r1 = await client.post(
            f"/api/v1/tables/{tbl_id}/rows",
            json={"title": "Dark Mode Support", "content": "Add dark mode toggle", "properties": {"Category": ["UI", "Feature"]}}
        )
        assert res_r1.status_code == 201
        r1_id = res_r1.json()["id"]

        # Create Row 2
        res_r2 = await client.post(
            f"/api/v1/tables/{tbl_id}/rows",
            json={"title": "Export CSV", "content": "Export table data to CSV", "properties": {"Category": ["Export"]}}
        )
        assert res_r2.status_code == 201
        r2_id = res_r2.json()["id"]

        # Search Rows
        res_search = await client.get(f"/api/v1/tables/{tbl_id}/rows?search=Dark")
        assert res_search.status_code == 200
        found_rows = res_search.json()["rows"]
        assert len(found_rows) == 1
        assert found_rows[0]["id"] == r1_id

        # Batch Update Rows
        res_batch = await client.patch(
            f"/api/v1/tables/{tbl_id}/rows/batch",
            json={"row_ids": [r1_id, r2_id], "emoji": "⭐️"}
        )
        assert res_batch.status_code == 200
        assert len(res_batch.json()) == 2
        assert res_batch.json()[0]["emoji"] == "⭐️"

        # Delete Row
        res_del = await client.delete(f"/api/v1/tables/{tbl_id}/rows/{r1_id}")
        assert res_del.status_code == 200
