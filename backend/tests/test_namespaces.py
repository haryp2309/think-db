import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_namespaces_crud():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # List namespaces
        res = await client.get("/api/v1/namespaces")
        assert res.status_code == 200
        data = res.json()["namespaces"]
        assert len(data) >= 1
        assert data[0]["name"] == "Workspace"

        # Create namespace
        res_create = await client.post("/api/v1/namespaces", json={"name": "Engineering", "emoji": "🚀"})
        assert res_create.status_code == 201
        ns_id = res_create.json()["id"]
        assert res_create.json()["name"] == "Engineering"
        assert res_create.json()["emoji"] == "🚀"

        # Update namespace
        res_update = await client.patch(f"/api/v1/namespaces/{ns_id}", json={"name": "Core Engineering", "is_collapsed": True})
        assert res_update.status_code == 200
        assert res_update.json()["name"] == "Core Engineering"
        assert res_update.json()["is_collapsed"] is True

        # Delete namespace
        res_del = await client.delete(f"/api/v1/namespaces/{ns_id}")
        assert res_del.status_code == 200

        # Verify deleted
        res_list_after = await client.get("/api/v1/namespaces")
        ids = [ns["id"] for ns in res_list_after.json()["namespaces"]]
        assert ns_id not in ids
