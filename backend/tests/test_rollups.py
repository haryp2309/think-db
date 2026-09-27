import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_rollup_columns_reference_and_referenced():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create Table A (Companies) & Table B (Employees)
        res_a = await client.post("/api/v1/tables", json={"name": "Companies"})
        assert res_a.status_code == 201
        tbl_a_id = res_a.json()["id"]

        res_b = await client.post("/api/v1/tables", json={"name": "Employees"})
        assert res_b.status_code == 201
        tbl_b_id = res_b.json()["id"]

        # Add "Industry" column to Companies
        await client.post(
            f"/api/v1/tables/{tbl_a_id}/columns",
            json={"name": "Industry", "type": "string"}
        )

        # Add "Company" reference column to Employees
        res_ref = await client.post(
            f"/api/v1/tables/{tbl_b_id}/columns",
            json={"name": "Company", "type": "reference", "target_table_id": tbl_a_id}
        )
        assert res_ref.status_code == 201

        # Add Rollup column on Employees -> Company's Industry
        res_roll = await client.post(
            f"/api/v1/tables/{tbl_b_id}/columns",
            json={
                "name": "Company Industry",
                "type": "rollup",
                "relation_column_name": "Company",
                "target_property_name": "Industry"
            }
        )
        assert res_roll.status_code == 201

        # Insert Company row
        res_c = await client.post(
            f"/api/v1/tables/{tbl_a_id}/rows",
            json={"title": "Acme Corp", "properties": {"Industry": "Tech"}}
        )
        assert res_c.status_code == 201
        comp_id = res_c.json()["id"]

        # Insert Employee row
        res_e = await client.post(
            f"/api/v1/tables/{tbl_b_id}/rows",
            json={"title": "Alice", "properties": {"Company": {"id": comp_id}}}
        )
        emp_id = res_e.json()["id"]
        assert emp_id is not None


        # Check Schema auto-resolved target_table_id for rollup
        res_b_schema = await client.get(f"/api/v1/tables/{tbl_b_id}")
        assert res_b_schema.status_code == 200
        cols_b = res_b_schema.json()["columns"]
        roll_col = next((c for c in cols_b if c["name"] == "Company Industry"), None)
        assert roll_col is not None
        assert roll_col["target_table_id"] == tbl_a_id
