FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV HTTP_PROXY="http://host.docker.internal:6767"
ENV HTTPS_PROXY="http://host.docker.internal:6767"
ENV NO_PROXY="localhost,127.0.0.1"

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_INDEX_URL="https://mirrors.aliyun.com/pypi/simple/"

# Configure reliable Debian mirror and install ffmpeg
RUN (sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true) && \
    (apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/* || true)

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen || uv sync

COPY . .

EXPOSE 8000

CMD ["uv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
