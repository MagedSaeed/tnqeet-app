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

# CPU-only torch via the PyTorch CPU index (unsafe-best-match per tnqeet docs).
COPY backend/pyproject.toml ./
RUN uv venv --python 3.10 \
    && uv pip install fastapi "uvicorn[standard]" pydantic python-dotenv \
         "tnqeet==0.1.2" \
         --extra-index-url https://download.pytorch.org/whl/cpu \
         --index-strategy unsafe-best-match

# KenLM (n-gram backend), compiled from source; MAX_ORDER=8 covers all orders.
RUN MAX_ORDER=8 uv pip install "git+https://github.com/kpu/kenlm.git"

# App source.
COPY backend/ ./

# Weights download at runtime into HF_HOME — mount a volume there (see README).
ENV HF_HOME=/app/models
RUN mkdir -p /app/models

# Bring in the built frontend and point the app at it.
COPY --from=frontend /fe/dist /app/frontend_dist
ENV FRONTEND_DIST=/app/frontend_dist

ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
