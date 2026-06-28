---
title: tnqeet
emoji: ✒️
colorFrom: red
colorTo: gray
sdk: docker
app_port: 8000
pinned: false
---

# tnqeet demo app

A small web app demonstrating the [`tnqeet`](https://pypi.org/project/tnqeet/) library:
remove dots from Arabic text (rule-based) and restore them via all five tnqeet methods
(n-gram, LSTM, Transformer, CANINE, LLM). FastAPI backend + React frontend.

## Local development

Backend (Python 3.10, uv):
```bash
cd backend
uv venv --python 3.10
uv pip install -e ".[dev]"   # CPU torch via the PyTorch CPU index in pyproject [tool.uv]
uv run uvicorn app.main:app --port 8000
```
> The backend depends on `tnqeet[cpu]` (0.1.3+);
> KenLM is not installed locally, so n-grams is
> unavailable until you
> run inside Docker (or `MAX_ORDER=8 uv pip install "git+https://github.com/kpu/kenlm.git"`).

Frontend:
```bash
cd frontend
npm install
npm run dev   # proxies /api to :8000
```

Tests:
```bash
cd backend && uv run pytest
cd frontend && npm test
```

## Docker

The image does **not** bundle the model weights — they download at runtime into
`HF_HOME=/home/user/.cache/huggingface`. Mount a volume there so the image stays
small and weights persist (downloaded once, on first use, per method). The image
runs as a non-root user (uid 1000), so it works on Railway, Hugging Face Spaces,
and plain Docker.

```bash
docker build -t tnqeet-app .
# mount a host folder for the weights so they're not re-downloaded each run:
docker run --rm -p 8000:8000 -v "$(pwd)/docker_volume/models:/home/user/.cache/huggingface" tnqeet-app
# open http://localhost:8000
```

Or via compose (bind-mounts `./docker_volume/models`):
```bash
docker compose up --build
```

> First request per method downloads its weight to the volume (slow once, fast after).

## Deploy to Hugging Face Spaces

Create a **Docker** Space and push this repo (the README header above is the Space
config; it serves on `app_port: 8000`). The free **CPU Basic** tier (16 GB RAM)
runs all methods comfortably.

- Weights download to `HF_HOME` on first use. Space storage is **ephemeral**, so
  they re-download after a rebuild/restart (fast — same network as the Hub).
- For persistence, add Spaces **persistent storage** and set `HF_HOME=/data`.

```bash
# one-time: add the Space as a remote and push
git remote add space https://huggingface.co/spaces/<user>/<space>
git push space master:main
```

## Deploy to Railway

Railway builds the `Dockerfile` directly (see `railway.toml`). Attach a **volume
mounted at `/home/user/.cache/huggingface`** (Dashboard → service → Volumes, or
`railway volume add --mount-path /home/user/.cache/huggingface`); weights download
once to the volume and persist across deploys. Healthcheck path: `/api/health`.
On a small plan, set `TNQEET_MAX_RESIDENT_MODELS=1` to lower peak RAM.

## Configuration (env vars)

| Var | Default | Meaning |
|---|---|---|
| `TNQEET_MAX_INPUT_CHARS` | 8192 | Max input length |
| `TNQEET_MAX_RESIDENT_MODELS` | 2 | Models kept resident in RAM (LRU); set 1 for low memory |
| `TNQEET_LSTM_SIZE` / `TNQEET_TRANSFORMER_SIZE` / `TNQEET_CANINE_SIZE` / `TNQEET_NGRAM_ORDER` | 6L / 12L / c / 8 | Model variant per method (downloaded on first use) |
| `HF_HOME` | /app/models | Where weights download/cache (mount a volume here) |
| `TNQEET_DEFAULT_LLM_MODEL` | anthropic/claude-sonnet-4 | LLM default model |

The LLM method needs an OpenRouter API key, entered in the UI and stored **only in your
browser**; it is sent with the request to call OpenRouter and never persisted server-side.
