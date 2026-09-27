from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress

from tortoise import BaseDBAsyncClient, Tortoise

from app.core.config import settings


async def get_db() -> AsyncGenerator[BaseDBAsyncClient, None]:
    conn = Tortoise.get_connection("default")
    yield conn


async def get_session() -> AsyncGenerator[BaseDBAsyncClient, None]:
    async for conn in get_db():
        yield conn


@asynccontextmanager
async def get_db_ctx() -> AsyncGenerator[BaseDBAsyncClient, None]:
    conn = Tortoise.get_connection("default")
    yield conn


async def init_db() -> None:
    is_inited = False
    with suppress(Exception):
        Tortoise.get_connection("default")
        is_inited = True

    if not is_inited:
        db_url = settings.tortoise_database_url
        await Tortoise.init(
            db_url=db_url,
            modules={"models": ["app.models.metadata"]},
        )
        await Tortoise.generate_schemas()

    from app.models.metadata import SystemMetaNamespace

    ns_count = await SystemMetaNamespace.all().count()
    if ns_count == 0:
        await SystemMetaNamespace.create(name="Workspace", emoji="📁", is_collapsed=0)


async def close_db() -> None:
    await Tortoise.close_connections()
