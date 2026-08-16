FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV HTTP_PROXY="http://host.docker.internal:6767"
ENV HTTPS_PROXY="http://host.docker.internal:6767"
ENV NO_PROXY="localhost,127.0.0.1"

# Use Aliyun PyPI mirror to bypass network restrictions and guarantee uptime
ENV UV_INDEX_URL="https://mirrors.aliyun.com/pypi/simple/"

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen || uv sync

COPY . .

EXPOSE 8000

CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
