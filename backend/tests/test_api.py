import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_tables_and_columns_and_bidirectional_sync():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Seeded tables check
        res = await client.get("/api/v1/tables")
        assert res.status_code == 200
        tables = res.json()["tables"]
        assert len(tables) >= 3

        # Create Table A (Authors) and Table B (Books)
        res_a = await client.post("/api/v1/tables", json={"name": "Authors"})
        assert res_a.status_code == 201
        tbl_a_id = res_a.json()["id"]

        res_b = await client.post("/api/v1/tables", json={"name": "Books"})
        assert res_b.status_code == 201
        tbl_b_id = res_b.json()["id"]

        # Add reference column from Books -> Authors
        res_col = await client.post(
            f"/api/v1/tables/{tbl_b_id}/columns",
            json={
                "name": "Author",
                "type": "reference",
                "target_table_id": tbl_a_id
            }
        )
        assert res_col.status_code == 201
        assert res_col.json()["added_column"]["name"] == "Author"

        # Check inverse column auto-created on Authors (Table A)
        res_a_schema = await client.get(f"/api/v1/tables/{tbl_a_id}")
        assert res_a_schema.status_code == 200
        cols_a = res_a_schema.json()["columns"]
        inv_col = next((c for c in cols_a if c["target_table_id"] == tbl_b_id), None)
        assert inv_col is not None
        assert "Books" in inv_col["name"]

        # Insert Author row in Table A
        res_author = await client.post(
            f"/api/v1/tables/{tbl_a_id}/rows",
            json={"title": "J.R.R. Tolkien", "content": "Fantasy author"}
        )
        assert res_author.status_code == 201
        author_id = res_author.json()["id"]

        # Insert Book row in Table B linking to Author
        res_book = await client.post(
            f"/api/v1/tables/{tbl_b_id}/rows",
            json={
                "title": "The Hobbit",
                "content": "Fantasy novel",
                "properties": {"Author": {"id": author_id}}
            }
        )
        assert res_book.status_code == 201
        book_id = res_book.json()["id"]

        # Verify Author row in Table A was automatically updated by SQLite trigger!
        res_author_check = await client.get(f"/api/v1/tables/{tbl_a_id}/rows/{author_id}")
        assert res_author_check.status_code == 200
        inv_ref_val = res_author_check.json()["properties"].get(inv_col["name"])
        assert inv_ref_val is not None
        if isinstance(inv_ref_val, list):
            assert inv_ref_val[0]["id"] == book_id
        else:
            assert inv_ref_val["id"] == book_id

        # Polars CSV Export Test
        res_export = await client.post(
            "/api/v1/export/csv",
            json={
                "table_id": tbl_b_id,
                "selected_columns": ["id", "title", "Author"]
            }
        )
        assert res_export.status_code == 200
        assert "text/csv" in res_export.headers["content-type"]
        csv_text = res_export.text
        assert "The Hobbit" in csv_text
        assert "J.R.R. Tolkien" in csv_text
