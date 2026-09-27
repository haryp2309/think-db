import os
from pathlib import Path

import pytest
from tortoise import Tortoise

import app.core.database as db_module
from app.core.config import settings


@pytest.fixture(autouse=True)
async def setup_test_db(tmp_path: Path):
    db_file = tmp_path / "test.db"
    db_url = f"sqlite://{db_file}"

    settings.DATABASE_URL = db_url
    os.environ["DATABASE_URL"] = db_url

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(settings, "DATABASE_URL", db_url)

    await Tortoise.close_connections()
    await Tortoise.init(
        db_url=db_url,
        modules={"models": ["app.models.metadata"]},
    )
    await Tortoise.generate_schemas()

    from app.models.metadata import SystemMetaNamespace

    await SystemMetaNamespace.create(name="Workspace", emoji="📁", is_collapsed=0)

    from app.db import seed

    async with db_module.get_db_ctx() as ctx_conn:
        await seed.seed_data(ctx_conn)

    yield

    await Tortoise.close_connections()
