# ---------- Stage 1: build frontend ----------
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: python runtime ----------
FROM python:3.10-slim AS runtime

# Build deps for KenLM (compiled from source) + general build tooling.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake libboost-all-dev libeigen3-dev zlib1g-dev git \
    && rm -rf /var/lib/apt/lists/*

# uv for dependency management.
RUN pip install --no-cache-dir uv

WORKDIR /app/backend

# Install backend deps with CPU-only torch: the PyTorch CPU index +
# --index-strategy unsafe-best-match (that index also hosts pinned copies of
# other packages). (tnqeet 0.1.2 has no `[cpu]` extra, so we install plain
# tnqeet and let the index config deliver the CPU torch build.)
COPY backend/pyproject.toml ./
RUN uv venv --python 3.10 \
    && uv pip install fastapi "uvicorn[standard]" pydantic python-dotenv \
         "tnqeet==0.1.2" \
         --extra-index-url https://download.pytorch.org/whl/cpu \
         --index-strategy unsafe-best-match

# KenLM: compiled from source; MAX_ORDER must cover the baked n-gram order (8).
RUN MAX_ORDER=8 uv pip install "git+https://github.com/kpu/kenlm.git"

# App source.
COPY backend/ ./

# Download the largest model variants into the image's HF cache (no runtime
# download). Override the variants via env build args if desired (see app/config.py).
ENV HF_HOME=/app/models
ARG DOWNLOAD_WEIGHTS=true
RUN if [ "$DOWNLOAD_WEIGHTS" = "true" ]; then uv run python scripts/download_weights.py; fi

# Bring in the built frontend and point the app at it.
COPY --from=frontend /fe/dist /app/frontend_dist
ENV FRONTEND_DIST=/app/frontend_dist

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
