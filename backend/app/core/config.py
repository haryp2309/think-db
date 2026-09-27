from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite://think_db.sqlite"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def tortoise_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return "postgres://" + url[len("postgresql://"):]
        if url.startswith("sqlite+aiosqlite://"):
            return "sqlite" + url[len("sqlite+aiosqlite"):]
        return url

    @property
    def async_database_url(self) -> str:
        return self.tortoise_database_url

settings = Settings()

# Backward compatibility exports
CORS_ORIGINS = settings.CORS_ORIGINS
