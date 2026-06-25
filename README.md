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
> CPU-only torch is delivered by the PyTorch CPU index + `index-strategy =
> "unsafe-best-match"` configured in `backend/pyproject.toml` (tnqeet 0.1.2 has no
> `[cpu]` extra). KenLM is not installed locally, so the n-gram method reports
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

## Docker (full app, baked weights)

```bash
docker build -t tnqeet-app .
docker run --rm -p 8000:8000 tnqeet-app
# open http://localhost:8000
```

Local dev via compose (weights download once to ./models, not baked):
```bash
docker compose up --build
```

## Deploy to Railway

Railway builds the `Dockerfile` directly (see `railway.toml`). The largest model
variants are baked into the image, so **no volume is needed** and cold starts do no
network I/O for weights. Healthcheck path: `/api/health`.

## Configuration (env vars)

| Var | Default | Meaning |
|---|---|---|
| `TNQEET_MAX_INPUT_CHARS` | 5000 | Max input length |
| `TNQEET_MAX_RESIDENT_MODELS` | 2 | Models kept in memory (LRU) |
| `TNQEET_LSTM_SIZE` / `TNQEET_TRANSFORMER_SIZE` / `TNQEET_CANINE_SIZE` / `TNQEET_NGRAM_ORDER` | 6L / 12L / c / 8 | Baked model variants |
| `TNQEET_DEFAULT_LLM_MODEL` | anthropic/claude-sonnet-4 | LLM default model |

The LLM method needs an OpenRouter API key, entered in the UI and stored **only in your
browser**; it is sent with the request to call OpenRouter and never persisted server-side.
