# tnqeet Demo App — Design

**Date:** 2026-06-25
**Status:** Draft for review

## 1. Purpose

A small, polished web app that demonstrates how the [`tnqeet`](https://github.com/MagedSaeed/tnqeet)
Python library works: removing dots from Arabic text (producing undotted *Rasm*)
and restoring them again. Restoration is exposed through **all** of tnqeet's
methods so a visitor can get a feel for how each one behaves.

The app has a **FastAPI backend** (so it can also serve as a reusable API later)
and a **React frontend** that is clean, intuitive, and nice to look at.

## 2. Goals / Non-Goals

**Goals**
- Show `remove_dots` (rule-based) and `restore_dots` (model-based) clearly and distinctly.
- Offer every restoration method tnqeet provides, with a way to compare them.
- Look good: light/dark themes, English/Arabic UI, sensible typography and spacing.
- Be trivially deployable to Railway via Docker, with no runtime model downloads.

**Non-Goals**
- No user accounts, database, or persistence beyond the browser's localStorage.
- No exposing every model size/variant — one recommended model per method (see §5).
- No training or evaluation features; this is an inference demo.

## 3. How tnqeet Works (reference)

- `tnqeet.remove_dots(text)` — top-level, **rule-based** character mapping that strips dots
  (deterministic, no model).
- Restoration methods, all sharing the interface `Class.from_pretrained(size=...)` →
  `instance.restore_dots(text)`:

  | Method | Class | Module | Extra requirement |
  |---|---|---|---|
  | n-gram | `NgramDotter` | `tnqeet.dotting_models.ngrams.models` | KenLM (compiled from source) |
  | LSTM | `LSTMDottingModel` | `tnqeet.dotting_models.sequence_labeling.models` | torch + lightning (installed) |
  | Transformer | `TransformerDottingModel` | `tnqeet.dotting_models.transformer.models` | torch + lightning (installed) |
  | CANINE | `CanineDottingModel` | `tnqeet.dotting_models.canine.models` | torch + transformers (installed) |
  | LLM | `OpenRouterArabicDotter` | `tnqeet.dotting_models.llms.models` | dspy (installed) + OpenRouter API key |

- Neural and n-gram weights are resolved on demand from the Hugging Face Hub repo
  `MagedSaeed/tnqeet-models` via `tnqeet.weights.resolve_weight(method, size, weights_dir=...)`.
- tnqeet's documented default size per method: **LSTM `4L`, Transformer `6L`, CANINE `s`, n-gram order `6`**.

## 4. Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Browser (React + Vite + TS + Tailwind)                       │
│  - theme (light/dark), language (en/ar, RTL), localStorage   │
│  - holds OpenRouter API key + chosen model (browser only)    │
│  - fetches OpenRouter model list directly (public endpoint)  │
└───────────────┬────────────────────────────────────────────┘
                │  /api/*  (JSON)
┌───────────────▼────────────────────────────────────────────┐
│ FastAPI backend                                              │
│  - /api/methods, /api/remove-dots, /api/restore-dots         │
│  - dotter registry: lazy-load + in-memory cache per method   │
│  - reads weights from a fixed cache path (baked or mounted)  │
│  - calls tnqeet; for LLM, uses the per-request key (never    │
│    logged or persisted)                                      │
└───────────────┬────────────────────────────────────────────┘
                │  reads
┌───────────────▼────────────────────────────────────────────┐
│ Model weights cache (HF cache dir)                           │
│  - prod: baked into the Docker image at build time           │
│  - dev:  bind-mounted ./models in this project directory     │
└────────────────────────────────────────────────────────────┘
```

- **Dev:** Vite dev server serves the frontend and proxies `/api` to FastAPI.
- **Prod:** the frontend is built to static assets and **served by FastAPI**, so the whole
  app runs as one process / one container.
- **Python env:** managed with **uv**.

### Backend module layout (proposed)
```
backend/
  app/
    main.py            # FastAPI app, static-file serving, CORS for dev
    api.py             # route handlers
    schemas.py         # pydantic request/response models
    dotters.py         # registry: availability detection, lazy load, cache, restore
    config.py          # cache path, baked-method config, settings
  pyproject.toml       # uv-managed
  tests/
    test_api.py
    test_dotters.py
```

### Frontend module layout (proposed)
```
frontend/
  index.html
  src/
    main.tsx
    App.tsx
    components/   # Header, ThemeToggle, LangToggle, TextBox, RemoveDotsButton,
                  # Examples, MethodTabs, ResultPanel, CompareAll, LlmPanel,
                  # ApiKeyField, ModelCombobox
    i18n/         # en.ts, ar.ts, I18nContext
    lib/          # api client, openrouter client, localStorage helpers
    styles/       # tailwind entry
  package.json
  vite.config.ts
  tailwind.config.js
```

## 5. Methods & Model Management

- **All five methods** are wired up (option C): n-gram, LSTM, Transformer, CANINE, LLM.
- **One model baked per method — the largest / most-accurate variant**: LSTM `6L`,
  Transformer `12L`, CANINE `c`, n-gram order `8`, plus the tokenizer
  (`MagedSaeed/tnqeet-tokenizer`). This favors output quality over image size (an accepted
  trade-off). The baked set is a **Docker build arg** so it can be swapped (e.g. to lighter
  variants) without code changes.
  *(Note: CANINE's `c`/`s` are model variants, not a size ordering; `c` is the default pick.)*
- Because only one model ships per method, the **UI has no size selector**. Instead it shows
  a short note (with "package" linked to the PyPI page,
  `https://pypi.org/project/tnqeet/`): *"This demo uses the recommended model for each
  method. tnqeet supports additional sizes/variants — they're omitted here for performance
  and convenience. See the [package] to use them."*
- **Lazy loading + caching:** each dotter is constructed on first request for that method and
  kept in memory for subsequent requests. Because weights are baked, the first request does
  **not** download anything in production.
- **Availability detection** (`GET /api/methods`): a method is `available` if its dependency
  is importable and its baked weights are present. The LLM method is always listed but flagged
  `requiresKey: true`; it runs only when the client supplies a key. Unavailable methods appear
  in the UI but disabled, with a tooltip explaining why.

## 6. API Surface

All endpoints are under `/api`, JSON in/out.

### `GET /api/methods`
Returns the method catalog for the UI to render tabs.
```jsonc
{
  "methods": [
    { "id": "ngram",       "label": "n-gram",      "available": true,  "requiresKey": false },
    { "id": "lstm",        "label": "LSTM",        "available": true,  "requiresKey": false },
    { "id": "transformer", "label": "Transformer", "available": true,  "requiresKey": false },
    { "id": "canine",      "label": "CANINE",      "available": true,  "requiresKey": false },
    { "id": "llm",         "label": "LLM",         "available": true,  "requiresKey": true  }
  ]
}
```

### `POST /api/remove-dots`
Rule-based; no model.
```jsonc
// request
{ "text": "بنت نجاح" }
// response
{ "text": "بٮٮ ٮحاح" }
```

### `POST /api/restore-dots`
```jsonc
// request
{
  "text": "بٮٮ ٮحاح",
  "method": "lstm",                 // one of the method ids
  "model": "anthropic/claude-...",  // LLM only
  "apiKey": "sk-or-..."             // LLM only; used transiently, never stored/logged
}
// response
{ "text": "بنت نجاح", "method": "lstm" }
```
- Errors return a structured body `{ "error": { "code": "...", "message": "..." } }`
  with appropriate HTTP status (e.g. `400` bad input, `409` method unavailable,
  `502` OpenRouter failure). The LLM key is never echoed back or written to logs.

### OpenRouter model list
Fetched **client-side** from OpenRouter's public `/models` endpoint (no key needed to list).
Not proxied through our backend.

## 7. LLM Key & Model Handling (frontend)

- Selecting the **LLM** tab reveals an API-key field.
- The key is stored **only in the browser** (`localStorage`) and attached to each
  `restore-dots` request so the backend can call OpenRouter on the user's behalf. It is
  **sent nowhere else** and never persisted or logged server-side. This is stated in the UI.
- Once saved, the key collapses to a masked summary (`sk-or-…a91f`) with an **"in browser
  only"** badge and **Edit / Delete** controls.
- **Model picker:** a searchable, type-to-filter combobox over the OpenRouter model list,
  with match highlighting; the chosen model is also persisted in `localStorage`.

## 8. Frontend UX (locked via mockups)

Single-page layout, top → bottom:
1. **Header** — title `tnqeet` + subtitle on one side; `EN | ع` language toggle and a
   light/dark theme toggle on the other.
2. **Description** paragraph explaining Rasm ambiguity and what the app does.
3. **"Your text"** row with the **"Remove dots" (rule-based)** button at the trailing edge,
   **above** the textbox (no AI icon — it is deterministic).
4. **Textbox** (large, RTL content).
5. **Example chips** directly beneath the box — 5 dotted sentences of increasing length.
   Clicking one loads it; the user can then remove its dots and restore them.
6. **"Restore dots" zone** — visible **method tabs** (no dropdown) and a primary **Restore**
   button (carries the `✦` to mark the model/AI step). For LLM, the key/model panel appears here.
7. **Result panel** — restored text with a copy button and the method label.
8. **"Compare all methods"** — a **collapsed** disclosure that expands into a grid running
   every available method on the current input (LLM included only if a key+model are set).

**Theme:** light/dark, persisted in `localStorage`.
**Language:** defaults to the **browser/device locale** (`navigator.language`) — Arabic UI
(fully RTL-mirrored) if Arabic, otherwise English; once toggled, the choice is persisted.
i18n via a small custom `en`/`ar` dictionary + context (no heavy library).

### Seed examples (dotted, increasing length — adjustable)
1. `كتب الطالب الدرس`
2. `الصبر مفتاح الفرج`
3. `قطف المزارع الثمار في فصل الصيف`
4. (≈20 words) `يجلس الطلاب في قاعة الدرس وهم ينصتون باهتمام إلى شرح المعلم الذي يوضح لهم قواعد اللغة العربية بأسلوب سهل وممتع`
5. (≈37 words) `تُعد اللغة العربية من أقدم اللغات التي ما زالت حية إلى اليوم، فهي لغة القرآن الكريم ووعاء الحضارة الإسلامية، وقد حافظت على بنيتها وقواعدها رغم مرور القرون الطويلة، وأسهمت في نقل العلوم والمعارف إلى مختلف أنحاء العالم`
6. (≈46 words) `عندما تغرب الشمس خلف الجبال البعيدة، تتحول السماء إلى لوحة فنية بديعة تمتزج فيها ألوان الذهب والأرجوان، ويعود الفلاحون من حقولهم بعد يوم طويل من العمل الشاق، حاملين معهم ثمار جهدهم، بينما تتعالى أصوات العصافير وهي تبحث عن أعشاشها قبل أن يحل الظلام على القرية الهادئة`
7. (≈41 words) `يحرص المعلم الناجح على تنويع أساليب التدريس داخل الفصل، فيمزج بين الشرح النظري والتطبيق العملي، ويشجع طلابه على طرح الأسئلة والمشاركة في النقاش، لأنه يؤمن بأن التعليم الحقيقي لا يكون بالتلقين وحده، بل ببناء عقول قادرة على التفكير والإبداع وحل المشكلات`
8. (Wikipedia style, ≈34 words) `دمشق هي عاصمة الجمهورية العربية السورية وكبرى مدنها، وتعد من أقدم المدن المأهولة باستمرار في العالم، إذ يعود تاريخ استيطانها إلى آلاف السنين، وقد كانت عاصمة الدولة الأموية ومركزا تجاريا وثقافيا مهما عبر العصور`
9. (poetry — Ahmad Shawqi) `قم للمعلم وفه التبجيلا، كاد المعلم أن يكون رسولا`
10. (poetry — Al-Mutanabbi) `الخيل والليل والبيداء تعرفني، والسيف والرمح والقرطاس والقلم`

All text is plain letters (no harakat), matching tnqeet's letter-dot removal. Poetry verses
are public domain. Attribution (poet name) shown as an optional small caption is a nice-to-have,
not required.

**Examples rendering:** short examples (1–3, 9–10) render as inline chips; the long ones
(4–8) render as a stacked list, **truncated with an ellipsis**, and load their full text into
the textbox on click.

## 9. Packaging & Deployment

### Docker
- **Single production image** (multi-stage):
  1. **Frontend build stage** — Node builds the Vite app to static assets.
  2. **Python runtime stage** — uv installs backend deps; **compiles KenLM**
     (`MAX_ORDER=8 pip install "git+https://github.com/kpu/kenlm.git"`); a `RUN` step
     **downloads the baked weights** (driven by a `BAKED_MODELS` build arg) into the image's
     HF cache dir; copies the built frontend; runs FastAPI (uvicorn).
- The weight-download is its **own layer**, so rebuilds reuse the cache unless the baked set
  changes (Docker layer caching — this is the "cached, no volume" behavior requested).

### docker-compose (local dev)
- Bind-mounts **`./models`** in this project directory as the HF cache so weights download
  **once** to a visible folder and persist across container restarts (no rebuild needed).
- `models/` is added to `.gitignore`.

### Railway
- Deploy the baked image directly — **no volume needed**. Cold starts do no network I/O for
  weights; the filesystem being ephemeral is irrelevant because weights live in the image.

## 10. Testing

- **Backend (pytest):**
  - `remove-dots` against known input/output pairs (deterministic, fast).
  - `restore-dots` contract + error handling using a **lightweight/stub dotter** so tests do
    not download large weights.
  - `/api/methods` availability logic (dependency present/absent, key required).
  - LLM path: assert the key is used transiently and never appears in logs/responses.
- **Frontend:** minimal — i18n string presence, localStorage helpers, combobox filtering.

## 11. Open Questions / Future

- Confirm the seed example sentences (or supply preferred ones).
- Future: optional caching of OpenRouter model list; rate limiting; an OpenAPI-driven client.
