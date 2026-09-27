import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_views_crud_and_reorder():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create Table
        res_tbl = await client.post("/api/v1/tables", json={"name": "Tasks"})
        assert res_tbl.status_code == 201
        tbl_id = res_tbl.json()["id"]

        # List default view
        res_views = await client.get(f"/api/v1/tables/{tbl_id}/views")
        assert res_views.status_code == 200
        views = res_views.json()["views"]
        assert len(views) >= 1
        v1_id = views[0]["id"]

        # Create Second View (Kanban)
        res_v2 = await client.post(
            f"/api/v1/tables/{tbl_id}/views",
            json={"name": "Board", "type": "kanban", "emoji": "📌"}
        )
        assert res_v2.status_code == 201
        v2_id = res_v2.json()["id"]
        assert res_v2.json()["type"] == "kanban"

        # Update View Config
        res_upd = await client.patch(
            f"/api/v1/views/{v2_id}",
            json={"name": "Kanban Board", "visible_columns": ["title", "content"]}
        )
        assert res_upd.status_code == 200
        assert res_upd.json()["name"] == "Kanban Board"

        # Reorder Views
        res_reorder = await client.post(
            f"/api/v1/tables/{tbl_id}/views/reorder",
            json={"view_ids": [v2_id, v1_id]}
        )
        assert res_reorder.status_code == 200
        reordered = res_reorder.json()["views"]
        assert reordered[0]["id"] == v2_id
        assert reordered[0]["is_default"] is True

        # Delete View
        res_del = await client.delete(f"/api/v1/views/{v1_id}")
        assert res_del.status_code == 200
