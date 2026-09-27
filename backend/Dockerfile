FROM python:3.12-slim

# Copy uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy dependency configuration
COPY pyproject.toml .

# Install dependencies using uv into system Python
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy backend application source code
COPY . .

# Ensure data directory exists for persistent database storage
RUN mkdir -p /app/data

# Environment configuration
ENV PORT=8000
ENV DB_PATH=/app/data/think_db.sqlite
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
