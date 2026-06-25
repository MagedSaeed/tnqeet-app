# tnqeet Demo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished web app that demonstrates the `tnqeet` library — removing dots from Arabic text (rule-based) and restoring them via all five tnqeet methods (n-gram, LSTM, Transformer, CANINE, LLM) — with a FastAPI backend and a React frontend, deployable to Railway via Docker.

**Architecture:** FastAPI backend wraps tnqeet behind a small dotter registry (lazy-load + LRU-cached models). React/Vite/TS/Tailwind frontend talks to `/api`. In production FastAPI also serves the built frontend, so it runs as one container. Model weights (largest variants) are baked into the Docker image at build time so Railway needs no volume and no runtime downloads.

**Tech Stack:** Python 3.10 + uv, FastAPI + uvicorn, tnqeet (+ torch CPU, pytorch-lightning, transformers, dspy, KenLM), React 18 + Vite + TypeScript + Tailwind CSS, Docker + docker-compose.

**Reference spec:** `docs/superpowers/specs/2026-06-25-tnqeet-demo-app-design.md`

---

## File Structure

```
tnqeet-app/
  backend/
    pyproject.toml            # uv-managed deps, Python 3.10
    .python-version           # 3.10
    app/
      __init__.py
      config.py               # settings: baked models, limits, cache size
      dotters.py              # registry: remove_dots, availability, lazy load+LRU, restore
      schemas.py              # pydantic request/response models
      api.py                  # APIRouter: /health /methods /remove-dots /restore-dots
      main.py                 # FastAPI app, error shaping, CORS, static SPA serving
    scripts/
      bake_weights.py         # warm HF cache with baked models (build-time)
    tests/
      __init__.py
      test_dotters.py
      test_api.py
  frontend/
    package.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    tailwind.config.js
    postcss.config.js
    index.html
    vitest.config.ts
    src/
      main.tsx
      App.tsx
      index.css
      i18n/
        en.ts
        ar.ts
        index.ts              # dict type, detectLanguage, useI18n + provider
      lib/
        api.ts                # backend client
        openrouter.ts         # model list fetch + filterModels
        storage.ts            # localStorage helpers (theme, lang, key, model)
      hooks/
        useTheme.ts
      components/
        Header.tsx
        ThemeToggle.tsx
        LangToggle.tsx
        TextBox.tsx
        Examples.tsx
        MethodTabs.tsx
        ResultPanel.tsx
        CompareAll.tsx
        LlmPanel.tsx
      data/
        examples.ts           # the 10 seed examples
      __tests__/
        logic.test.ts         # detectLanguage, filterModels, storage
  Dockerfile
  docker-compose.yml
  .dockerignore
  railway.toml
  README.md
  .gitignore                  # already created
```

**Part 1 (Tasks 1–10): Backend** — independently runnable & testable (pytest + curl).
**Part 2 (Tasks 11–24): Frontend + Docker/deploy** — completes the app.

---

## PART 1 — BACKEND

### Task 1: Backend project scaffolding (uv, Python 3.10)

**Files:**
- Create: `backend/.python-version`
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/tests/__init__.py` (empty)

- [ ] **Step 1: Pin Python version**

Create `backend/.python-version`:
```
3.10
```

- [ ] **Step 2: Create `backend/pyproject.toml`**

```toml
[project]
name = "tnqeet-app-backend"
version = "0.1.0"
description = "FastAPI backend demonstrating the tnqeet library"
requires-python = ">=3.10,<3.11"
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
    "pydantic>=2.6",
    "tnqeet==0.1.2",
    "python-dotenv>=1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "httpx>=0.27",
]

# CPU-only torch, following the spirit of tnqeet's official CPU install. The
# PyTorch CPU index + `index-strategy = "unsafe-best-match"` (required because
# that index also hosts pinned copies of other packages) makes torch resolve to
# the CPU build for ALL uv operations (including `uv run`, which re-resolves) and
# never pull CUDA. tnqeet pulls the neural stack (torch, lightning, transformers,
# dspy, etc.) itself; with this config torch lands as e.g. 2.12.1+cpu alongside a
# compatible numpy 2.x (no NumPy ABI warning).
# NOTE: tnqeet 0.1.2 does NOT publish a `[cpu]` extra on PyPI (uv warns + ignores
# it), so we depend on plain `tnqeet==0.1.2` and rely on the index config below.
[tool.uv]
index-strategy = "unsafe-best-match"

[[tool.uv.index]]
name = "pytorch-cpu"
url = "https://download.pytorch.org/whl/cpu"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["app"]
```

- [ ] **Step 3: Create empty package markers**

Create `backend/app/__init__.py` (empty file) and `backend/tests/__init__.py` (empty file).

- [ ] **Step 4: Create the venv and install (CPU torch)**

Run (from `backend/`):
```bash
cd backend
uv venv --python 3.10
uv pip install -e ".[dev]"
```
The `[tool.uv.sources]` config pins torch to the CPU index, so this installs the
`+cpu` build (no CUDA) and `numpy<2`. Verify with:
```bash
uv run python -c "import torch, numpy; print(torch.__version__, numpy.__version__)"
```
Expected: prints something like `2.2.2+cpu 1.26.x` with **no NumPy `_ARRAY_API` warning** and **no CUDA download** triggered by `uv run`. (KenLM is installed later in Docker; locally it stays absent and the n-gram method simply reports unavailable.)

- [ ] **Step 5: Commit**

```bash
git add backend/.python-version backend/pyproject.toml backend/app/__init__.py backend/tests/__init__.py
git commit -m "chore(backend): scaffold uv project (Python 3.10, CPU torch)"
```

---

### Task 2: Config module

**Files:**
- Create: `backend/app/config.py`

- [ ] **Step 1: Write `backend/app/config.py`**

```python
"""Runtime configuration for the tnqeet demo backend.

All values are overridable via environment variables so the Docker build args
and Railway settings can tune behavior without code changes.
"""
import os

# Baked model selection — the LARGEST / most-accurate variant per method.
# Override per-method via env to swap in lighter variants.
BAKED_MODELS = {
    "ngram": os.getenv("TNQEET_NGRAM_ORDER", "8"),
    "lstm": os.getenv("TNQEET_LSTM_SIZE", "6L"),
    "transformer": os.getenv("TNQEET_TRANSFORMER_SIZE", "12L"),
    "canine": os.getenv("TNQEET_CANINE_SIZE", "c"),
}

# Max characters accepted by remove-dots / restore-dots (bounds request cost).
MAX_INPUT_CHARS = int(os.getenv("TNQEET_MAX_INPUT_CHARS", "5000"))

# Max number of neural/n-gram models kept resident in memory at once (LRU).
# Keep small on memory-constrained hosts (e.g. Railway) to avoid OOM.
MAX_RESIDENT_MODELS = int(os.getenv("TNQEET_MAX_RESIDENT_MODELS", "2"))

# Default OpenRouter model if the client does not supply one.
DEFAULT_LLM_MODEL = os.getenv("TNQEET_DEFAULT_LLM_MODEL", "anthropic/claude-sonnet-4")

# Directory the built frontend is served from in production (set in Docker).
FRONTEND_DIST = os.getenv("FRONTEND_DIST", "")
```

- [ ] **Step 2: Verify it imports**

Run (from `backend/`):
```bash
uv run python -c "from app import config; print(config.BAKED_MODELS, config.MAX_INPUT_CHARS)"
```
Expected: prints `{'ngram': '8', 'lstm': '6L', 'transformer': '12L', 'canine': 'c'} 5000`

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py
git commit -m "feat(backend): add config module"
```

---

### Task 3: Dotter registry — remove_dots + availability

**Files:**
- Create: `backend/app/dotters.py`
- Test: `backend/tests/test_dotters.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_dotters.py`:
```python
from app import dotters


def test_remove_dots_is_length_preserving_and_idempotent():
    dotted = "بنت نجاح"
    rasm = dotters.remove_dots(dotted)
    # rule-based char mapping preserves length
    assert len(rasm) == len(dotted)
    # removing dots from already-dotless text changes nothing
    assert dotters.remove_dots(rasm) == rasm
    # a dotted input actually loses some dots
    assert rasm != dotted


def test_catalog_lists_all_five_methods_with_flags():
    catalog = dotters.catalog()
    ids = [m["id"] for m in catalog]
    assert ids == ["ngram", "lstm", "transformer", "canine", "llm"]
    llm = next(m for m in catalog if m["id"] == "llm")
    assert llm["requiresKey"] is True
    assert all("available" in m for m in catalog)
```

- [ ] **Step 2: Run to verify it fails**

Run (from `backend/`): `uv run pytest tests/test_dotters.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.dotters'`

- [ ] **Step 3: Write minimal `backend/app/dotters.py`**

```python
"""Registry that wraps tnqeet's remove/restore behind a small, cached API."""
import importlib.util
import threading
from collections import OrderedDict

import tnqeet

from . import config

# Static catalog — order is the UI tab order.
METHODS = [
    {"id": "ngram", "label": "n-gram", "requiresKey": False},
    {"id": "lstm", "label": "LSTM", "requiresKey": False},
    {"id": "transformer", "label": "Transformer", "requiresKey": False},
    {"id": "canine", "label": "CANINE", "requiresKey": False},
    {"id": "llm", "label": "LLM", "requiresKey": True},
]
METHOD_IDS = {m["id"] for m in METHODS}

_lock = threading.Lock()
_cache: "OrderedDict[str, object]" = OrderedDict()


def remove_dots(text: str) -> str:
    """Rule-based dot removal (no model)."""
    return tnqeet.remove_dots(text)


def _importable(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def is_available(method_id: str) -> bool:
    """A method is available when its runtime dependency is importable.

    (Baked weights are assumed present in the image; the dependency import is the
    real gate — e.g. KenLM may be absent in a local dev env.)
    """
    if method_id == "llm":
        return _importable("dspy")
    if method_id == "ngram":
        return _importable("kenlm")
    if method_id == "lstm":
        return _importable("torch") and _importable("pytorch_lightning")
    if method_id == "transformer":
        return _importable("torch") and _importable("pytorch_lightning")
    if method_id == "canine":
        return _importable("torch") and _importable("transformers")
    return False


def catalog():
    """Return the method catalog with per-method availability flags."""
    return [{**m, "available": is_available(m["id"])} for m in METHODS]
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/test_dotters.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/dotters.py backend/tests/test_dotters.py
git commit -m "feat(backend): dotter registry remove_dots + availability"
```

---

### Task 4: Dotter registry — lazy load + LRU cache

**Files:**
- Modify: `backend/app/dotters.py`
- Test: `backend/tests/test_dotters.py`

- [ ] **Step 1: Write the failing test (append to `tests/test_dotters.py`)**

```python
def test_lru_cache_evicts_oldest_when_over_limit(monkeypatch):
    from app import config

    monkeypatch.setattr(config, "MAX_RESIDENT_MODELS", 2)
    dotters._cache.clear()

    loaded = []

    def fake_load(method_id):
        loaded.append(method_id)
        return f"model::{method_id}"

    monkeypatch.setattr(dotters, "_load", fake_load)

    a = dotters._get_or_load("lstm")
    b = dotters._get_or_load("transformer")
    assert a == "model::lstm" and b == "model::transformer"
    # cached: no reload
    dotters._get_or_load("lstm")
    assert loaded == ["lstm", "transformer"]
    # third distinct model evicts the least-recently-used ("transformer",
    # since "lstm" was just touched)
    dotters._get_or_load("canine")
    assert "transformer" not in dotters._cache
    assert set(dotters._cache.keys()) == {"lstm", "canine"}
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_dotters.py::test_lru_cache_evicts_oldest_when_over_limit -v`
Expected: FAIL — `AttributeError: module 'app.dotters' has no attribute '_get_or_load'`

- [ ] **Step 3: Add loaders + cache to `backend/app/dotters.py`**

Append:
```python
def _load(method_id: str):
    """Construct a dotter for `method_id` (heavy: may load weights)."""
    if method_id == "lstm":
        from tnqeet.dotting_models.sequence_labeling.models import LSTMDottingModel
        return LSTMDottingModel.from_pretrained(size=config.BAKED_MODELS["lstm"])
    if method_id == "transformer":
        from tnqeet.dotting_models.transformer.models import TransformerDottingModel
        return TransformerDottingModel.from_pretrained(
            size=config.BAKED_MODELS["transformer"]
        )
    if method_id == "canine":
        from tnqeet.dotting_models.canine.models import CanineDottingModel
        return CanineDottingModel.from_pretrained(size=config.BAKED_MODELS["canine"])
    if method_id == "ngram":
        from tnqeet.dotting_models.ngrams.models import NgramDotter
        return NgramDotter.from_pretrained(order=int(config.BAKED_MODELS["ngram"]))
    raise ValueError(f"unknown method: {method_id!r}")


def _get_or_load(method_id: str):
    """Return a cached dotter, loading + LRU-evicting under lock."""
    with _lock:
        if method_id in _cache:
            _cache.move_to_end(method_id)
            return _cache[method_id]
        instance = _load(method_id)
        _cache[method_id] = instance
        _cache.move_to_end(method_id)
        while len(_cache) > config.MAX_RESIDENT_MODELS:
            _cache.popitem(last=False)
        return _cache[method_id]
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/test_dotters.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/dotters.py backend/tests/test_dotters.py
git commit -m "feat(backend): lazy model loading with LRU cache"
```

---

### Task 5: Dotter registry — restore dispatch (incl. LLM)

**Files:**
- Modify: `backend/app/dotters.py`
- Test: `backend/tests/test_dotters.py`

- [ ] **Step 1: Write the failing test (append to `tests/test_dotters.py`)**

```python
def test_restore_dispatches_to_cached_dotter(monkeypatch):
    class FakeDotter:
        def restore_dots(self, text):
            return text + "_dotted"

    monkeypatch.setattr(dotters, "_get_or_load", lambda m: FakeDotter())
    assert dotters.restore("lstm", "rasm") == "rasm_dotted"


def test_restore_llm_requires_key():
    import pytest

    with pytest.raises(ValueError, match="API key"):
        dotters.restore("llm", "rasm", model="x/y", api_key=None)


def test_restore_llm_uses_key_and_model(monkeypatch):
    captured = {}

    class FakeLLM:
        def __init__(self, api_key=None, model=None):
            captured["api_key"] = api_key
            captured["model"] = model

        def restore_dots(self, text):
            return "ok"

    import app.dotters as d
    monkeypatch.setattr(d, "_make_llm_dotter", lambda api_key, model: FakeLLM(api_key=api_key, model=model))
    assert d.restore("llm", "rasm", model="a/b", api_key="sk-or-123") == "ok"
    assert captured == {"api_key": "sk-or-123", "model": "a/b"}
```

- [ ] **Step 2: Run to verify it fails**

Run: `uv run pytest tests/test_dotters.py -k restore -v`
Expected: FAIL — `AttributeError: module 'app.dotters' has no attribute 'restore'`

- [ ] **Step 3: Add restore + LLM helper to `backend/app/dotters.py`**

Append:
```python
def _make_llm_dotter(api_key: str, model: str):
    """Construct an OpenRouter LLM dotter. Not cached — key is per-request."""
    from tnqeet.dotting_models.llms.models import OpenRouterArabicDotter
    return OpenRouterArabicDotter(api_key=api_key, model=model)


def restore(method_id: str, text: str, model: str | None = None,
            api_key: str | None = None) -> str:
    """Restore dots to `text` using `method_id`."""
    if method_id == "llm":
        if not api_key:
            raise ValueError("API key required for the LLM method")
        chosen = model or config.DEFAULT_LLM_MODEL
        # dspy.configure is process-global inside the dotter; serialize LLM calls.
        with _lock:
            dotter = _make_llm_dotter(api_key, chosen)
            return dotter.restore_dots(text)
    return _get_or_load(method_id).restore_dots(text)
```

- [ ] **Step 4: Run to verify it passes**

Run: `uv run pytest tests/test_dotters.py -v`
Expected: PASS (6 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/app/dotters.py backend/tests/test_dotters.py
git commit -m "feat(backend): restore dispatch including per-request LLM"
```

---

### Task 6: Pydantic schemas

**Files:**
- Create: `backend/app/schemas.py`

- [ ] **Step 1: Write `backend/app/schemas.py`**

```python
"""Request/response models for the API."""
from typing import List, Optional

from pydantic import BaseModel


class RemoveDotsRequest(BaseModel):
    text: str


class TextResponse(BaseModel):
    text: str


class RestoreDotsRequest(BaseModel):
    text: str
    method: str
    model: Optional[str] = None
    apiKey: Optional[str] = None


class RestoreResponse(BaseModel):
    text: str
    method: str


class MethodInfo(BaseModel):
    id: str
    label: str
    available: bool
    requiresKey: bool


class MethodsResponse(BaseModel):
    methods: List[MethodInfo]
```

- [ ] **Step 2: Verify it imports**

Run (from `backend/`):
```bash
uv run python -c "from app import schemas; print(schemas.RestoreDotsRequest.model_fields.keys())"
```
Expected: prints `dict_keys(['text', 'method', 'model', 'apiKey'])`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas.py
git commit -m "feat(backend): pydantic request/response schemas"
```

---

### Task 7: API router

**Files:**
- Create: `backend/app/api.py`

- [ ] **Step 1: Write `backend/app/api.py`**

```python
"""API routes: health, methods catalog, remove-dots, restore-dots."""
from fastapi import APIRouter, HTTPException

from . import config, dotters
from .schemas import (
    MethodsResponse,
    RemoveDotsRequest,
    RestoreDotsRequest,
    RestoreResponse,
    TextResponse,
)

router = APIRouter(prefix="/api")


def _check_len(text: str) -> None:
    if len(text) > config.MAX_INPUT_CHARS:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "input_too_long",
                "message": f"Input exceeds {config.MAX_INPUT_CHARS} characters.",
            },
        )


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/methods", response_model=MethodsResponse)
def methods():
    return {"methods": dotters.catalog()}


@router.post("/remove-dots", response_model=TextResponse)
def remove_dots(req: RemoveDotsRequest):
    _check_len(req.text)
    return {"text": dotters.remove_dots(req.text)}


@router.post("/restore-dots", response_model=RestoreResponse)
def restore_dots(req: RestoreDotsRequest):
    _check_len(req.text)
    if req.method not in dotters.METHOD_IDS:
        raise HTTPException(
            status_code=400,
            detail={"code": "unknown_method", "message": f"Unknown method: {req.method}"},
        )
    if not dotters.is_available(req.method):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "method_unavailable",
                "message": f"Method '{req.method}' is not available on this server.",
            },
        )
    try:
        # registry signature is restore(method_id, text, ...)
        text = dotters.restore(req.method, req.text, model=req.model, api_key=req.apiKey)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail={"code": "bad_request", "message": str(exc)}
        )
    except Exception:  # upstream/model failure (e.g. OpenRouter)
        raise HTTPException(
            status_code=502,
            detail={"code": "restore_failed", "message": "Restoration failed."},
        )
    return {"text": text, "method": req.method}
```

- [ ] **Step 2: Verify it imports**

Run (from `backend/`):
```bash
uv run python -c "from app.api import router; print([r.path for r in router.routes])"
```
Expected: lists `/api/health`, `/api/methods`, `/api/remove-dots`, `/api/restore-dots`

- [ ] **Step 3: Commit**

```bash
git add backend/app/api.py
git commit -m "feat(backend): API router (health, methods, remove, restore)"
```

---

### Task 8: FastAPI app — error shaping, CORS, static SPA serving

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Write `backend/app/main.py`**

```python
"""FastAPI application: mounts the API, shapes errors, and (in prod) serves the
built frontend as a single-page app."""
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .api import router

app = FastAPI(title="tnqeet demo")

# Dev convenience: the Vite dev server runs on a different origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Wrap HTTPException detail under an `error` envelope."""
    detail = exc.detail
    if isinstance(detail, dict):
        body = {"error": detail}
    else:
        body = {"error": {"code": "error", "message": str(detail)}}
    return JSONResponse(status_code=exc.status_code, content=body)


# Production: serve the built frontend (set FRONTEND_DIST in Docker).
if config.FRONTEND_DIST and os.path.isdir(config.FRONTEND_DIST):
    assets_dir = os.path.join(config.FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(config.FRONTEND_DIST, "index.html"))
```

- [ ] **Step 2: Smoke-run the server**

Run (from `backend/`):
```bash
uv run uvicorn app.main:app --port 8000 &
sleep 3
curl -s localhost:8000/api/health
curl -s localhost:8000/api/methods
curl -s -X POST localhost:8000/api/remove-dots -H 'content-type: application/json' -d '{"text":"بنت نجاح"}'
kill %1
```
Expected: `{"status":"ok"}`; a methods list JSON; and a `{"text":"..."}` with dots removed.

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat(backend): FastAPI app with error envelope and SPA serving"
```

---

### Task 9: API tests (TestClient, stubbed models)

**Files:**
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write the tests**

Create `backend/tests/test_api.py`:
```python
import pytest
from fastapi.testclient import TestClient

from app import config, dotters
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_methods_shape():
    r = client.get("/api/methods")
    assert r.status_code == 200
    methods = r.json()["methods"]
    assert [m["id"] for m in methods] == ["ngram", "lstm", "transformer", "canine", "llm"]


def test_remove_dots_endpoint():
    r = client.post("/api/remove-dots", json={"text": "بنت نجاح"})
    assert r.status_code == 200
    assert len(r.json()["text"]) == len("بنت نجاح")


def test_input_too_long_returns_400(monkeypatch):
    monkeypatch.setattr(config, "MAX_INPUT_CHARS", 5)
    r = client.post("/api/remove-dots", json={"text": "x" * 6})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "input_too_long"


def test_restore_unknown_method_400():
    r = client.post("/api/restore-dots", json={"text": "a", "method": "nope"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "unknown_method"


def test_restore_dispatches(monkeypatch):
    monkeypatch.setattr(dotters, "is_available", lambda m: True)
    monkeypatch.setattr(dotters, "restore", lambda method, text, **kw: text + "+" + method)
    r = client.post("/api/restore-dots", json={"text": "rasm", "method": "lstm"})
    assert r.status_code == 200
    assert r.json() == {"text": "rasm+lstm", "method": "lstm"}


def test_restore_llm_without_key_is_400(monkeypatch):
    monkeypatch.setattr(dotters, "is_available", lambda m: True)
    r = client.post("/api/restore-dots", json={"text": "rasm", "method": "llm"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "bad_request"
```

- [ ] **Step 2: Run to verify**

Run (from `backend/`): `uv run pytest -v`
Expected: PASS (all backend tests, ~13 passed)

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_api.py
git commit -m "test(backend): API endpoint tests with stubbed models"
```

---

### Task 10: Weight-download script

**Files:**
- Create: `backend/scripts/download_weights.py`

- [ ] **Step 1: Write `backend/scripts/download_weights.py`**

```python
"""Download the selected model weights into the Hugging Face cache so the runtime
image needs no network. Run at Docker build time with HF_HOME pointed at the
image cache dir; the downloaded weights then live in that cached image layer.

Usage (from backend/): python scripts/download_weights.py
"""
import sys

from app import config, dotters


def main() -> int:
    for method in ("lstm", "transformer", "canine", "ngram"):
        size = config.BAKED_MODELS[method]
        print(f"[download] fetching {method} ({size}) ...", flush=True)
        try:
            dotters._load(method)
            print(f"[download] {method} OK", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"[download] {method} FAILED: {exc}", file=sys.stderr, flush=True)
            return 1
    print("[download] all models cached", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Verify the script is importable/syntactically valid**

Run (from `backend/`):
```bash
uv run python -c "import ast; ast.parse(open('scripts/download_weights.py').read()); print('ok')"
```
Expected: prints `ok`. (Do not run the full download locally — it fetches large weights and needs KenLM; the Docker build runs it.)

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/download_weights.py
git commit -m "feat(backend): weight-download script for Docker build"
```

---

## PART 2 — FRONTEND + DOCKER

### Task 11: Frontend scaffolding (Vite + React + TS + Tailwind)

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/index.html`, `frontend/src/index.css`, `frontend/src/main.tsx`, `frontend/vitest.config.ts`

- [ ] **Step 1: `frontend/package.json`**

```json
{
  "name": "tnqeet-app-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^6.0.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^8.1.0",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: `frontend/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy /api to the FastAPI server on :8000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
```

- [ ] **Step 5: `frontend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

- [ ] **Step 6: `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 7: `frontend/postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 8: `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>tnqeet — Arabic Rasm dot restoration</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
```

- [ ] **Step 10: `frontend/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 11: Install and verify**

Run (from `frontend/`):
```bash
cd frontend
npm install
```
Expected: installs without error. (Build verified after `App.tsx` exists in a later task.)

- [ ] **Step 12: Commit**

```bash
git add frontend/package.json frontend/tsconfig*.json frontend/vite.config.ts frontend/vitest.config.ts frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src/index.css frontend/src/main.tsx
git commit -m "chore(frontend): scaffold Vite + React + TS + Tailwind"
```

---

### Task 12: localStorage + language-detection logic (TDD)

**Files:**
- Create: `frontend/src/lib/storage.ts`
- Create: `frontend/src/i18n/index.ts` (detectLanguage part now; provider in Task 14)
- Test: `frontend/src/__tests__/logic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/logic.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { detectLanguage } from "../i18n/detect";
import { loadJSON, saveJSON } from "../lib/storage";

describe("detectLanguage", () => {
  it("returns 'ar' for Arabic locales", () => {
    expect(detectLanguage("ar")).toBe("ar");
    expect(detectLanguage("ar-SA")).toBe("ar");
  });
  it("returns 'en' for non-Arabic locales", () => {
    expect(detectLanguage("en-US")).toBe("en");
    expect(detectLanguage("fr")).toBe("en");
    expect(detectLanguage(undefined)).toBe("en");
  });
});

describe("storage", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });
  });
  it("round-trips JSON", () => {
    saveJSON("k", { a: 1 });
    expect(loadJSON("k", { a: 0 })).toEqual({ a: 1 });
  });
  it("returns fallback when missing or malformed", () => {
    expect(loadJSON("missing", "fb")).toBe("fb");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (from `frontend/`): `npm test`
Expected: FAIL — cannot resolve `../i18n/detect` and `../lib/storage`.

- [ ] **Step 3: Implement `frontend/src/lib/storage.ts`**

```ts
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

// Storage keys used across the app.
export const KEYS = {
  theme: "tnqeet.theme",
  lang: "tnqeet.lang",
  apiKey: "tnqeet.openrouter.key",
  model: "tnqeet.openrouter.model",
} as const;
```

- [ ] **Step 4: Implement `frontend/src/i18n/detect.ts`**

```ts
export type Lang = "en" | "ar";

export function detectLanguage(locale: string | undefined): Lang {
  if (locale && locale.toLowerCase().startsWith("ar")) return "ar";
  return "en";
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS (all logic tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/storage.ts frontend/src/i18n/detect.ts frontend/src/__tests__/logic.test.ts
git commit -m "feat(frontend): storage helpers + language detection (TDD)"
```

---

### Task 13: i18n dictionaries

**Files:**
- Create: `frontend/src/i18n/en.ts`
- Create: `frontend/src/i18n/ar.ts`

- [ ] **Step 1: Write `frontend/src/i18n/en.ts`**

Note: `Dict` is declared as an explicit `interface` (with `string` fields), NOT
`as const` + `typeof en` — otherwise the keys become narrow literal types and the
Arabic dictionary (`ar: Dict`) fails to typecheck.

```ts
export interface Dict {
  title: string; subtitle: string; description: string; yourText: string;
  removeDots: string; ruleBased: string; restore: string; examples: string;
  result: string; copy: string; copied: string; compareAll: string;
  runAll: string; unavailable: string; llmKeyLabel: string;
  llmKeyPlaceholder: string; llmKeyNote: string; inBrowserOnly: string;
  save: string; show: string; hide: string; edit: string; delete: string;
  getKey: string; modelLabel: string; modelPlaceholder: string; selected: string;
  enterKeyFirst: string; modelNote: string; packageWord: string; errorGeneric: string;
}

export const en: Dict = {
  title: "tnqeet",
  subtitle: "Arabic Rasm dot restoration",
  description:
    "Undotted Arabic script (Rasm) is ambiguous — many letters share the same skeleton. tnqeet restores the missing dots. Type your own text or pick an example below, remove its dots, then restore them with any method.",
  yourText: "Your text",
  removeDots: "Remove dots",
  ruleBased: "rule-based",
  restore: "Restore",
  examples: "Examples",
  result: "Result",
  copy: "Copy",
  copied: "Copied",
  compareAll: "Compare all methods",
  runAll: "Run all",
  unavailable: "unavailable",
  llmKeyLabel: "OpenRouter API key",
  llmKeyPlaceholder: "sk-or-v1-…",
  llmKeyNote:
    "Stored only in your browser. It is sent nowhere else — only attached to your request so the server can call OpenRouter on your behalf, and never logged or saved server-side.",
  inBrowserOnly: "in browser only",
  save: "Save",
  show: "Show",
  hide: "Hide",
  edit: "Edit",
  delete: "Delete",
  getKey: "Get a key",
  modelLabel: "Model — search OpenRouter",
  modelPlaceholder: "Type to filter models…",
  selected: "Selected",
  enterKeyFirst: "Enter a key first",
  modelNote: "tnqeet supports additional sizes/variants — they're omitted here for performance and convenience. See the",
  packageWord: "package",
  errorGeneric: "Something went wrong. Please try again.",
};
```

- [ ] **Step 2: Write `frontend/src/i18n/ar.ts`**

```ts
import type { Dict } from "./en";

export const ar: Dict = {
  title: "تَنقيط",
  subtitle: "استعادة النقاط للرسم العربي",
  description:
    "الرسم العربي غير المنقوط ملتبس؛ إذ تشترك حروف كثيرة في الهيكل نفسه. يعيد tnqeet النقاط المحذوفة. اكتب نصك أو اختر مثالًا في الأسفل، ثم احذف نقاطه واستعدها بأي طريقة.",
  yourText: "النص",
  removeDots: "حذف النقاط",
  ruleBased: "قائم على قواعد",
  restore: "استعادة",
  examples: "أمثلة",
  result: "النتيجة",
  copy: "نسخ",
  copied: "تم النسخ",
  compareAll: "مقارنة كل الطرق",
  runAll: "تشغيل الكل",
  unavailable: "غير متاح",
  llmKeyLabel: "مفتاح OpenRouter",
  llmKeyPlaceholder: "sk-or-v1-…",
  llmKeyNote:
    "يُحفظ في متصفحك فقط. ولا يُرسل إلى أي مكان آخر — يُرفق فقط بطلبك ليستدعي الخادمُ OpenRouter نيابةً عنك، ولا يُسجَّل أو يُخزَّن على الخادم.",
  inBrowserOnly: "في المتصفح فقط",
  save: "حفظ",
  show: "إظهار",
  hide: "إخفاء",
  edit: "تعديل",
  delete: "حذف",
  getKey: "احصل على مفتاح",
  modelLabel: "النموذج — ابحث في OpenRouter",
  modelPlaceholder: "اكتب لتصفية النماذج…",
  selected: "المُختار",
  enterKeyFirst: "أدخل المفتاح أولًا",
  modelNote: "يدعم tnqeet أحجامًا/أنواعًا إضافية، حُذفت هنا للتبسيط. انظر",
  packageWord: "الحزمة",
  errorGeneric: "حدث خطأ ما. حاول مرة أخرى.",
};
```

- [ ] **Step 3: Typecheck (ensures ar matches the Dict shape)**

Run (from `frontend/`): `npm run typecheck`
Expected: passes (any missing/extra key in `ar` would error here). If `App.tsx` doesn't exist yet, this may report that separately — that's fine; the i18n files themselves must not error.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/en.ts frontend/src/i18n/ar.ts
git commit -m "feat(frontend): English + Arabic dictionaries"
```

---

### Task 14: i18n provider + theme hook

**Files:**
- Create: `frontend/src/i18n/index.ts`
- Create: `frontend/src/hooks/useTheme.ts`

- [ ] **Step 1: Write `frontend/src/i18n/index.ts`**

```tsx
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { detectLanguage, type Lang } from "./detect";
import { en, type Dict } from "./en";
import { ar } from "./ar";
import { KEYS, loadJSON, saveJSON } from "../lib/storage";

const DICTS: Record<Lang, Dict> = { en, ar };

interface I18nValue {
  lang: Lang;
  t: Dict;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLang(): Lang {
  const saved = loadJSON<Lang | null>(KEYS.lang, null);
  if (saved === "en" || saved === "ar") return saved;
  return detectLanguage(typeof navigator !== "undefined" ? navigator.language : undefined);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    saveJSON(KEYS.lang, l);
    setLangState(l);
  };

  return createElement(
    I18nContext.Provider,
    { value: { lang, t: DICTS[lang], dir, setLang } },
    children
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
```

- [ ] **Step 2: Write `frontend/src/hooks/useTheme.ts`**

```ts
import { useEffect, useState } from "react";
import { KEYS, loadJSON, saveJSON } from "../lib/storage";

export type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = loadJSON<Theme | null>(KEYS.theme, null);
  if (saved === "light" || saved === "dark") return saved;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveJSON(KEYS.theme, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}
```

- [ ] **Step 3: Typecheck**

Run (from `frontend/`): `npm run typecheck`
Expected: no errors from these files (App-not-found errors are resolved in Task 21).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/index.ts frontend/src/hooks/useTheme.ts
git commit -m "feat(frontend): i18n provider (RTL) + theme hook"
```

---

### Task 15: Backend API client + OpenRouter client (filterModels TDD)

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/openrouter.ts`
- Modify: `frontend/src/__tests__/logic.test.ts` (add filterModels tests)

- [ ] **Step 1: Add failing tests (append to `logic.test.ts`)**

```ts
import { filterModels, type ORModel } from "../lib/openrouter";

describe("filterModels", () => {
  const models: ORModel[] = [
    { id: "anthropic/claude-opus-4", name: "Claude Opus 4" },
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
  ];
  it("returns all when query empty", () => {
    expect(filterModels(models, "")).toHaveLength(3);
  });
  it("filters by id or name, case-insensitive", () => {
    expect(filterModels(models, "claude").map((m) => m.id)).toEqual([
      "anthropic/claude-opus-4",
      "anthropic/claude-sonnet-4",
    ]);
    expect(filterModels(models, "gpt")[0].id).toBe("openai/gpt-4o");
  });
  it("caps results", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `m/${i}`, name: `M${i}` }));
    expect(filterModels(many, "m").length).toBeLessThanOrEqual(50);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../lib/openrouter`.

- [ ] **Step 3: Write `frontend/src/lib/openrouter.ts`**

```ts
export interface ORModel {
  id: string;
  name: string;
}

const MAX_RESULTS = 50;

export function filterModels(models: ORModel[], query: string): ORModel[] {
  const q = query.trim().toLowerCase();
  const matches = q
    ? models.filter(
        (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      )
    : models;
  return matches.slice(0, MAX_RESULTS);
}

export async function fetchModels(): Promise<ORModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
  const json = (await res.json()) as { data: Array<{ id: string; name?: string }> };
  return json.data.map((m) => ({ id: m.id, name: m.name ?? m.id }));
}
```

- [ ] **Step 4: Write `frontend/src/lib/api.ts`**

```ts
export interface MethodInfo {
  id: string;
  label: string;
  available: boolean;
  requiresKey: boolean;
}

interface ApiError {
  error: { code: string; message: string };
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as ApiError;
      message = err.error?.message ?? message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function getMethods(): Promise<MethodInfo[]> {
  const res = await fetch("/api/methods");
  if (!res.ok) throw new Error("Failed to load methods");
  return ((await res.json()) as { methods: MethodInfo[] }).methods;
}

export function removeDots(text: string): Promise<{ text: string }> {
  return postJSON("/api/remove-dots", { text });
}

export interface RestoreArgs {
  text: string;
  method: string;
  model?: string;
  apiKey?: string;
}

export function restoreDots(args: RestoreArgs): Promise<{ text: string; method: string }> {
  return postJSON("/api/restore-dots", args);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/openrouter.ts frontend/src/__tests__/logic.test.ts
git commit -m "feat(frontend): API + OpenRouter clients (filterModels TDD)"
```

---

### Task 16: Seed examples data

**Files:**
- Create: `frontend/src/data/examples.ts`

- [ ] **Step 1: Write `frontend/src/data/examples.ts`**

```ts
// Dotted Arabic examples (see spec §8). Short ones render as chips; long ones
// (isLong) render as a truncated stacked list. `caption` is optional attribution.
export interface Example {
  text: string;
  isLong: boolean;
  caption?: string;
}

export const EXAMPLES: Example[] = [
  { text: "كتب الطالب الدرس", isLong: false },
  { text: "الصبر مفتاح الفرج", isLong: false },
  { text: "قطف المزارع الثمار في فصل الصيف", isLong: false },
  {
    text: "يجلس الطلاب في قاعة الدرس وهم ينصتون باهتمام إلى شرح المعلم الذي يوضح لهم قواعد اللغة العربية بأسلوب سهل وممتع",
    isLong: true,
  },
  {
    text: "تعد اللغة العربية من أقدم اللغات التي ما زالت حية إلى اليوم، فهي لغة القرآن الكريم ووعاء الحضارة الإسلامية، وقد حافظت على بنيتها وقواعدها رغم مرور القرون الطويلة، وأسهمت في نقل العلوم والمعارف إلى مختلف أنحاء العالم",
    isLong: true,
  },
  {
    text: "عندما تغرب الشمس خلف الجبال البعيدة، تتحول السماء إلى لوحة فنية بديعة تمتزج فيها ألوان الذهب والأرجوان، ويعود الفلاحون من حقولهم بعد يوم طويل من العمل الشاق، حاملين معهم ثمار جهدهم، بينما تتعالى أصوات العصافير وهي تبحث عن أعشاشها قبل أن يحل الظلام على القرية الهادئة",
    isLong: true,
  },
  {
    text: "يحرص المعلم الناجح على تنويع أساليب التدريس داخل الفصل، فيمزج بين الشرح النظري والتطبيق العملي، ويشجع طلابه على طرح الأسئلة والمشاركة في النقاش، لأنه يؤمن بأن التعليم الحقيقي لا يكون بالتلقين وحده، بل ببناء عقول قادرة على التفكير والإبداع وحل المشكلات",
    isLong: true,
  },
  {
    text: "النحل حشرات اجتماعية تعيش في مستعمرات منظمة تتألف من ملكة واحدة وآلاف الشغالات وعدد من الذكور، وتشتهر بإنتاج العسل وشمع العسل والغذاء الملكي، وتلعب دورا بالغ الأهمية في تلقيح النباتات المزهرة، مما يسهم في الحفاظ على التنوع البيولوجي وزيادة إنتاج كثير من المحاصيل الزراعية حول العالم، وتتواصل فيما بينها برقصات خاصة تدل على مواقع مصادر الغذاء، ويعد تراجع أعدادها في السنوات الأخيرة مصدر قلق بيئي متزايد لدى العلماء",
    isLong: true,
  },
  { text: "قم للمعلم وفه التبجيلا، كاد المعلم أن يكون رسولا", isLong: false, caption: "أحمد شوقي" },
  { text: "الخيل والليل والبيداء تعرفني، والسيف والرمح والقرطاس والقلم", isLong: false, caption: "المتنبي" },
];
```

- [ ] **Step 2: Typecheck**

Run (from `frontend/`): `npm run typecheck` (ignore App-not-found until Task 21)
Expected: no error in `examples.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/data/examples.ts
git commit -m "feat(frontend): seed examples (prose, wikipedia, poetry)"
```

---

### Task 17: Header, ThemeToggle, LangToggle components

**Files:**
- Create: `frontend/src/components/ThemeToggle.tsx`, `frontend/src/components/LangToggle.tsx`, `frontend/src/components/Header.tsx`

- [ ] **Step 1: `frontend/src/components/ThemeToggle.tsx`**

```tsx
import type { Theme } from "../hooks/useTheme";

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
```

- [ ] **Step 2: `frontend/src/components/LangToggle.tsx`**

```tsx
import { useI18n } from "../i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const base = "px-2.5 py-1 text-sm cursor-pointer";
  const on = "bg-indigo-500/15 font-semibold";
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
      <span className={`${base} ${lang === "en" ? on : ""}`} onClick={() => setLang("en")}>EN</span>
      <span className={`${base} ${lang === "ar" ? on : ""}`} onClick={() => setLang("ar")}>ع</span>
    </div>
  );
}
```

- [ ] **Step 3: `frontend/src/components/Header.tsx`**

```tsx
import { useI18n } from "../i18n";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

export function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { t } = useI18n();
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="m-0 mt-1 text-sm opacity-60">{t.subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <LangToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Typecheck**

Run (from `frontend/`): `npm run typecheck` (App-not-found still expected until Task 21)
Expected: no errors in these component files.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ThemeToggle.tsx frontend/src/components/LangToggle.tsx frontend/src/components/Header.tsx
git commit -m "feat(frontend): Header with theme + language toggles"
```

---

### Task 18: TextBox + Examples components

**Files:**
- Create: `frontend/src/components/TextBox.tsx`, `frontend/src/components/Examples.tsx`

- [ ] **Step 1: `frontend/src/components/TextBox.tsx`**

```tsx
import { useI18n } from "../i18n";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRemoveDots: () => void;
  busy?: boolean;
}

export function TextBox({ value, onChange, onRemoveDots, busy }: Props) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide opacity-50">{t.yourText}</span>
        <button
          onClick={onRemoveDots}
          disabled={busy || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ✕ {t.removeDots}
          <span className="text-[0.7rem] opacity-55">({t.ruleBased})</span>
        </button>
      </div>
      <textarea
        dir="rtl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] w-full rounded-xl border border-zinc-300 bg-transparent p-3 text-xl leading-loose outline-none focus:border-indigo-500 dark:border-zinc-700"
      />
    </div>
  );
}
```

- [ ] **Step 2: `frontend/src/components/Examples.tsx`**

```tsx
import { useI18n } from "../i18n";
import { EXAMPLES } from "../data/examples";

function truncate(text: string, n = 60): string {
  return text.length > n ? text.slice(0, n) + "…" : text;
}

export function Examples({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useI18n();
  const short = EXAMPLES.filter((e) => !e.isLong);
  const long = EXAMPLES.filter((e) => e.isLong);
  return (
    <div className="my-4">
      <div className="mb-2 text-xs uppercase tracking-wide opacity-50">{t.examples}</div>
      <div className="flex flex-wrap gap-2" dir="rtl">
        {short.map((e) => (
          <button
            key={e.text}
            onClick={() => onPick(e.text)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-base hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title={e.caption}
          >
            {e.text}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1.5" dir="rtl">
        {long.map((e) => (
          <button
            key={e.text}
            onClick={() => onPick(e.text)}
            className="truncate rounded-lg border border-zinc-200 px-3 py-2 text-right text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            title={e.text}
          >
            {truncate(e.text)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run (from `frontend/`): `npm run typecheck` (App-not-found still expected)
Expected: no errors in these files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TextBox.tsx frontend/src/components/Examples.tsx
git commit -m "feat(frontend): TextBox (remove-dots) + Examples"
```

---

### Task 19: MethodTabs + ResultPanel components

**Files:**
- Create: `frontend/src/components/MethodTabs.tsx`, `frontend/src/components/ResultPanel.tsx`

- [ ] **Step 1: `frontend/src/components/MethodTabs.tsx`**

```tsx
import type { MethodInfo } from "../lib/api";
import { useI18n } from "../i18n";

interface Props {
  methods: MethodInfo[];
  active: string;
  onSelect: (id: string) => void;
}

export function MethodTabs({ methods, active, onSelect }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-end">
      {methods.map((m) => {
        const disabled = !m.available;
        const isActive = m.id === active;
        return (
          <button
            key={m.id}
            disabled={disabled}
            onClick={() => onSelect(m.id)}
            title={disabled ? t.unavailable : undefined}
            className={[
              "rounded-t-lg border border-b-0 px-3.5 py-1.5 text-sm",
              isActive
                ? "border-indigo-500 bg-indigo-500/15 font-semibold"
                : "border-zinc-300 dark:border-zinc-700",
              disabled ? "cursor-not-allowed opacity-40" : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {m.label}
            {m.requiresKey && <span className="ml-1 text-[0.62rem] opacity-70">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `frontend/src/components/ResultPanel.tsx`**

```tsx
import { useState } from "react";
import { useI18n } from "../i18n";

interface Props {
  text: string;
  methodLabel: string;
}

export function ResultPanel({ text, methodLabel }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-zinc-300 p-4 dark:border-zinc-700">
      <div dir="rtl" className="text-right text-2xl leading-loose">{text}</div>
      <div className="mt-2 flex justify-between text-[0.7rem] opacity-50">
        <span>{methodLabel}</span>
        <button onClick={copy} className="hover:opacity-100">⧉ {copied ? t.copied : t.copy}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run (from `frontend/`): `npm run typecheck` (App-not-found still expected)
Expected: no errors in these files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/MethodTabs.tsx frontend/src/components/ResultPanel.tsx
git commit -m "feat(frontend): MethodTabs + ResultPanel"
```

---

### Task 20: LlmPanel (key + searchable model) + CompareAll

**Files:**
- Create: `frontend/src/components/LlmPanel.tsx`, `frontend/src/components/CompareAll.tsx`

- [ ] **Step 1: `frontend/src/components/LlmPanel.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { KEYS, saveJSON } from "../lib/storage";
import { fetchModels, filterModels, type ORModel } from "../lib/openrouter";

interface Props {
  apiKey: string;
  model: string;
  onChangeKey: (k: string) => void;
  onChangeModel: (m: string) => void;
}

export function LlmPanel({ apiKey, model, onChangeKey, onChangeModel }: Props) {
  const { t } = useI18n();
  const [editingKey, setEditingKey] = useState(!apiKey);
  const [draftKey, setDraftKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<ORModel[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchModels().then(setModels).catch(() => setModels([]));
  }, []);

  const filtered = useMemo(() => filterModels(models, query), [models, query]);

  const saveKey = () => {
    saveJSON(KEYS.apiKey, draftKey);
    onChangeKey(draftKey);
    setEditingKey(false);
  };
  const deleteKey = () => {
    saveJSON(KEYS.apiKey, "");
    onChangeKey("");
    setDraftKey("");
    setEditingKey(true);
  };
  const masked = apiKey ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : "";

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-zinc-300 p-4 dark:border-zinc-700">
      {/* API key */}
      <div className="mb-3">
        <div className="mb-1 text-xs uppercase tracking-wide opacity-55">{t.llmKeyLabel}</div>
        {editingKey ? (
          <>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={draftKey}
                placeholder={t.llmKeyPlaceholder}
                onChange={(e) => setDraftKey(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
              />
              <button onClick={() => setShowKey((s) => !s)} className="rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700">
                {showKey ? t.hide : t.show}
              </button>
              <button onClick={saveKey} disabled={!draftKey} className="rounded-lg bg-indigo-500 px-3 text-sm text-white disabled:opacity-50">
                {t.save}
              </button>
            </div>
            <p className="mt-1.5 flex gap-1.5 text-xs opacity-60">
              🔒 <span>{t.llmKeyNote}{" "}
                <a className="underline" href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">{t.getKey} →</a>
              </span>
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span>🔑 <code className="font-mono">{masked}</code></span>
            <span className="rounded border border-emerald-500 px-1.5 text-[0.68rem] text-emerald-500">{t.inBrowserOnly}</span>
            <span className="flex-1" />
            <button onClick={() => { setDraftKey(apiKey); setEditingKey(true); }} className="rounded-lg border border-zinc-300 px-2.5 py-1 text-sm dark:border-zinc-700">✎ {t.edit}</button>
            <button onClick={deleteKey} className="rounded-lg border border-red-400 px-2.5 py-1 text-sm text-red-500">🗑 {t.delete}</button>
          </div>
        )}
      </div>

      {/* Model search */}
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide opacity-55">{t.modelLabel}</div>
        <input
          value={query}
          placeholder={t.modelPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-indigo-500 bg-transparent px-3 py-2 text-sm"
        />
        {query && (
          <div className="mt-1.5 max-h-44 overflow-auto rounded-lg border border-zinc-300 dark:border-zinc-700">
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => { saveJSON(KEYS.model, m.id); onChangeModel(m.id); setQuery(""); }}
                className="flex cursor-pointer justify-between gap-3 px-3 py-2 text-sm hover:bg-indigo-500/10"
              >
                <span className="font-mono opacity-85">{m.id}</span>
                {m.name && m.name !== m.id && <span className="opacity-50">{m.name}</span>}
              </div>
            ))}
          </div>
        )}
        {model && (
          <div className="mt-2 text-sm">{t.selected}: <code className="font-mono">{model}</code></div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `frontend/src/components/CompareAll.tsx`**

```tsx
import { useState } from "react";
import { useI18n } from "../i18n";
import type { MethodInfo } from "../lib/api";
import { restoreDots } from "../lib/api";

interface Props {
  text: string;
  methods: MethodInfo[];
  apiKey: string;
  model: string;
}

export function CompareAll({ text, methods, apiKey, model }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    const out: Record<string, string> = {};
    // Sequential: bounds memory (matches backend cache limit).
    for (const m of methods) {
      if (!m.available) { out[m.id] = `— ${t.unavailable} —`; continue; }
      if (m.requiresKey && !apiKey) { out[m.id] = `— ${t.unavailable} —`; continue; }
      try {
        const r = await restoreDots({ text, method: m.id, model, apiKey: m.requiresKey ? apiKey : undefined });
        out[m.id] = r.text;
      } catch (e) {
        out[m.id] = (e as Error).message;
      }
      setResults({ ...out });
    }
    setRunning(false);
  };

  return (
    <div className="mt-4 border-t border-dashed border-zinc-300 pt-3 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen((o) => !o)} className="text-sm opacity-80">
          {open ? "▾" : "▸"} {t.compareAll}
        </button>
        {open && (
          <button onClick={runAll} disabled={running || !text.trim()} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            ✦ {t.runAll}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {methods.map((m) => (
            <div key={m.id} className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
              <div className="mb-1.5 text-[0.7rem] opacity-55">{m.label}</div>
              <div dir="rtl" className="text-right text-lg">{results[m.id] ?? "…"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run (from `frontend/`): `npm run typecheck` (App-not-found still expected)
Expected: no errors in these files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/LlmPanel.tsx frontend/src/components/CompareAll.tsx
git commit -m "feat(frontend): LlmPanel (key + model search) + CompareAll"
```

---

### Task 21: App composition

**Files:**
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Write `frontend/src/App.tsx`**

```tsx
import { useEffect, useState } from "react";
import { I18nProvider, useI18n } from "./i18n";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { TextBox } from "./components/TextBox";
import { Examples } from "./components/Examples";
import { MethodTabs } from "./components/MethodTabs";
import { ResultPanel } from "./components/ResultPanel";
import { CompareAll } from "./components/CompareAll";
import { LlmPanel } from "./components/LlmPanel";
import { getMethods, removeDots, restoreDots, type MethodInfo } from "./lib/api";
import { KEYS, loadJSON } from "./lib/storage";
import { EXAMPLES } from "./data/examples";

function Inner() {
  const { t, dir } = useI18n();
  const { theme, toggle } = useTheme();

  const [methods, setMethods] = useState<MethodInfo[]>([]);
  const [active, setActive] = useState("ngram");
  const [text, setText] = useState(EXAMPLES[0].text);
  const [result, setResult] = useState<{ text: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [apiKey, setApiKey] = useState(loadJSON<string>(KEYS.apiKey, ""));
  const [model, setModel] = useState(loadJSON<string>(KEYS.model, ""));

  useEffect(() => {
    // Fetch the method catalog once on mount. `t.errorGeneric` is intentionally
    // NOT a dependency — including it would re-fetch on every language switch.
    getMethods().then((m) => {
      setMethods(m);
      const firstAvailable = m.find((x) => x.available);
      if (firstAvailable) setActive(firstAvailable.id);
    }).catch(() => setError(t.errorGeneric));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeMethod = methods.find((m) => m.id === active);

  const onRemoveDots = async () => {
    setError(""); setBusy(true);
    try {
      const r = await removeDots(text);
      setText(r.text);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setError(""); setBusy(true);
    try {
      const r = await restoreDots({
        text,
        method: active,
        model: active === "llm" ? model : undefined,
        apiKey: active === "llm" ? apiKey : undefined,
      });
      setResult({ text: r.text, label: activeMethod?.label ?? active });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restoreDisabled = busy || !text.trim() || (active === "llm" && !apiKey);

  return (
    <div dir={dir} className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Header theme={theme} onToggleTheme={toggle} />
        <p className="my-4 text-sm leading-relaxed opacity-70">{t.description}</p>

        <TextBox value={text} onChange={setText} onRemoveDots={onRemoveDots} busy={busy} />
        <Examples onPick={(x) => { setText(x); setResult(null); }} />

        <MethodTabs methods={methods} active={active} onSelect={setActive} />

        {active === "llm" ? (
          <LlmPanel apiKey={apiKey} model={model} onChangeKey={setApiKey} onChangeModel={setModel} />
        ) : (
          <div className="rounded-b-xl rounded-tr-xl border border-zinc-300 p-4 dark:border-zinc-700">
            <button
              onClick={onRestore}
              disabled={restoreDisabled}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              ✦ {t.restore}
            </button>
            <p className="mt-3 text-xs opacity-55">
              {t.modelNote}{" "}
              <a className="underline" href="https://pypi.org/project/tnqeet/" target="_blank" rel="noreferrer">{t.packageWord}</a>.
            </p>
          </div>
        )}

        {active === "llm" && (
          <button
            onClick={onRestore}
            disabled={restoreDisabled}
            className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            ✦ {t.restore}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {result && <div className="mt-3"><ResultPanel text={result.text} methodLabel={result.label} /></div>}

        <CompareAll text={text} methods={methods} apiKey={apiKey} model={model} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Inner />
    </I18nProvider>
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run (from `frontend/`):
```bash
npm run typecheck
npm run build
```
Expected: typecheck passes with no errors; build emits `dist/` with `index.html` and `assets/`.

- [ ] **Step 3: Manual smoke (dev, with backend running)**

Run backend in one shell (`cd backend && uv run uvicorn app.main:app --port 8000`), frontend in another (`cd frontend && npm run dev`). Open the printed URL. Verify: theme toggle, EN/ع toggle (RTL flip), picking an example, "Remove dots" strips dots, selecting an available method + "Restore" returns text, "Compare all" expands and runs.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): compose App (remove/restore/compare/LLM)"
```

---

### Task 22: Dockerfile (multi-stage, CPU torch, KenLM, weight bake)

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Write `.dockerignore`**

```
**/node_modules
**/dist
**/.venv
**/__pycache__
models
.git
.superpowers
docs
```

- [ ] **Step 2: Write `Dockerfile`**

```dockerfile
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
```

- [ ] **Step 3: Build the image (long — compiles KenLM + downloads weights)**

Run (from repo root):
```bash
docker build -t tnqeet-app .
```
Expected: build succeeds. The `[download]` lines print each model caching successfully.

- [ ] **Step 4: Run and smoke-test**

```bash
docker run --rm -p 8000:8000 tnqeet-app &
sleep 8
curl -s localhost:8000/api/health
curl -s localhost:8000/api/methods
docker stop $(docker ps -q --filter ancestor=tnqeet-app)
```
Expected: health ok; methods shows all five `available: true` (n-gram now available since KenLM is built).

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "build: multi-stage Dockerfile (CPU torch, KenLM, baked weights)"
```

---

### Task 23: docker-compose (dev bind-mount) + Railway config

**Files:**
- Create: `docker-compose.yml`
- Create: `railway.toml`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
# Local dev: build WITHOUT downloading weights into the image, and bind-mount
# ./models so weights download once to a visible host folder (persists across
# restarts; no rebuild).
services:
  app:
    build:
      context: .
      args:
        DOWNLOAD_WEIGHTS: "false"
    ports:
      - "8000:8000"
    environment:
      HF_HOME: /app/models
      FRONTEND_DIST: /app/frontend_dist
    volumes:
      - ./models:/app/models
```

- [ ] **Step 2: Write `railway.toml`**

```toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
```

- [ ] **Step 3: Verify compose builds and runs**

Run (from repo root):
```bash
docker compose build
docker compose up -d
sleep 8
curl -s localhost:8000/api/health
docker compose down
```
Expected: health ok. First restore request per method downloads to `./models` (visible on host).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml railway.toml
git commit -m "build: docker-compose dev bind-mount + Railway config"
```

---

### Task 24: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# tnqeet demo app

A small web app demonstrating the [`tnqeet`](https://pypi.org/project/tnqeet/) library:
remove dots from Arabic text (rule-based) and restore them via all five tnqeet methods
(n-gram, LSTM, Transformer, CANINE, LLM). FastAPI backend + React frontend.

## Local development

Backend (Python 3.10, uv):
```bash
cd backend
uv venv --python 3.10
uv pip install -e ".[dev]"   # CPU torch via tnqeet[cpu] + pyproject [tool.uv] index config
uv run uvicorn app.main:app --port 8000
```
> Follows tnqeet's official CPU install (the `[cpu]` extra + PyTorch CPU index).
> KenLM is not installed locally, so the n-gram method reports unavailable until you
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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: project README (dev, Docker, Railway)"
```

---

## Self-Review Notes (spec coverage)

- Backend FastAPI, 3 endpoints + health, error envelope, static SPA serving — Tasks 7,8,9 ✓
- All 5 methods, largest baked variants, lazy-load + LRU, availability — Tasks 2,3,4,5 ✓
- Browser-only LLM key (edit/delete) + searchable OpenRouter model picker — Task 20 ✓
- UI: themes, EN/ع RTL, description, remove-dots above box, examples (short chips + long truncated), method tabs, result+copy, compare-all collapsed — Tasks 13–21 ✓
- Examples (prose/wikipedia/poetry) with package→PyPI link — Tasks 16, 21 ✓
- Input cap, Python 3.10, CPU torch, KenLM build, weight bake, no-volume Railway — Tasks 1,2,9,10,22,23 ✓
- Tests: backend pytest with stubs; frontend vitest for pure logic — Tasks 3,4,5,9,12,15 ✓

---

## Post-Review Refinements (applied during execution)

Fixes from the final code review, applied to the code (and reflected above where inline):

- **App.tsx** — method-catalog `useEffect` runs once on mount (removed `t.errorGeneric` dependency that caused a re-fetch on every language switch).
- **LlmPanel.tsx** — OpenRouter model picker shows the human-readable `name` alongside the id, and **highlights the matched query substring** (spec §7) via a small `highlight()` helper.
- **CompareAll.tsx** — the LLM method is gated on **both** key *and* model (`m.requiresKey && (!apiKey || !model)`); the skipped-cell message uses `t.enterKeyFirst`.
- **i18n** — removed the unused `result` key from `Dict`/`en`/`ar` (dead code).
- **README.md** — corrected the CPU-install note: tnqeet 0.1.2 has no `[cpu]` extra; CPU torch is delivered by the PyTorch CPU index + `index-strategy = "unsafe-best-match"` in `pyproject.toml`.

Verified after refinements: backend `pytest` 13 passed; frontend `tsc --noEmit` clean, `vitest` 7 passed, `vite build` succeeds.
