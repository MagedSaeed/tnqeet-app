# ---------- Stage 1: build frontend ----------
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: python runtime ----------
FROM python:3.10-slim AS runtime

# Build deps for KenLM (compiled from source) + git.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential cmake libboost-all-dev libeigen3-dev zlib1g-dev git \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir uv

# Run as a non-root user (uid 1000). Required by Hugging Face Spaces, harmless
# on Railway / plain Docker.
RUN useradd -m -u 1000 user
ENV HOME=/home/user

WORKDIR /app/backend

# CPU-only torch via the PyTorch CPU index (unsafe-best-match per tnqeet docs).
# Use the image's python so the venv interpreter is accessible to the user.
COPY backend/pyproject.toml ./
RUN uv venv --python /usr/local/bin/python3.10 \
    && uv pip install fastapi "uvicorn[standard]" pydantic python-dotenv \
         "tnqeet==0.1.2" \
         --extra-index-url https://download.pytorch.org/whl/cpu \
         --index-strategy unsafe-best-match

# KenLM (n-gram backend), compiled from source; MAX_ORDER=8 covers all orders.
RUN MAX_ORDER=8 uv pip install "git+https://github.com/kpu/kenlm.git"

COPY backend/ ./
COPY --from=frontend /fe/dist /app/frontend_dist

# Weights download at runtime into HF_HOME (writable by the runtime user). Mount
# a volume there to persist them; otherwise it's ephemeral and re-downloads.
ENV HF_HOME=/home/user/.cache/huggingface
ENV FRONTEND_DIST=/app/frontend_dist
ENV PORT=8000

# Hand the app + caches to the non-root user.
RUN mkdir -p "$HF_HOME" && chown -R user:user /app /home/user
USER user

EXPOSE 8000
# $PORT is honored by Railway (injects it) and defaults to 8000 for Spaces.
CMD ["sh", "-c", ".venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
