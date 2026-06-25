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


def _load(method_id: str):
    """Construct a dotter for `method_id` (heavy: may load weights)."""
    if method_id == "lstm":
        from tnqeet.dotting_models.sequence_labeling.models import LSTMDottingModel # type: ignore
        return LSTMDottingModel.from_pretrained(size=config.BAKED_MODELS["lstm"])
    if method_id == "transformer":
        from tnqeet.dotting_models.transformer.models import TransformerDottingModel # type: ignore
        return TransformerDottingModel.from_pretrained(
            size=config.BAKED_MODELS["transformer"]
        )
    if method_id == "canine":
        from tnqeet.dotting_models.canine.models import CanineDottingModel # type: ignore
        return CanineDottingModel.from_pretrained(size=config.BAKED_MODELS["canine"])
    if method_id == "ngram":
        from tnqeet.dotting_models.ngrams.models import NgramDotter # type: ignore
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


def _make_llm_dotter(api_key: str, model: str):
    """Construct an OpenRouter LLM dotter. Not cached — key is per-request."""
    from tnqeet.dotting_models.llms.models import OpenRouterArabicDotter # type: ignore
    return OpenRouterArabicDotter(api_key=api_key, model=model)


def restore(method_id: str, text: str, model: str | None = None,
            api_key: str | None = None) -> str:
    """Restore dots to `text` using `method_id`.

    Always undot first, so the model receives dotless rasm.
    """
    rasm = remove_dots(text)
    if method_id == "llm":
        if not api_key:
            raise ValueError("API key required for the LLM method")
        chosen = model or config.DEFAULT_LLM_MODEL
        # dspy.configure is process-global inside the dotter; serialize LLM calls.
        with _lock:
            dotter = _make_llm_dotter(api_key, chosen)
            return dotter.restore_dots(rasm)
    return _get_or_load(method_id).restore_dots(rasm)


def ensure_weights() -> None:
    """Pre-download weight files for available methods into the HF cache.

    Runs at startup. hf_hub_download shows a tqdm progress bar for files it
    actually downloads; already-cached files are a no-op.
    """
    from tnqeet.weights import resolve_weight  # type: ignore

    for method in ("ngram", "lstm", "transformer", "canine"):
        if not is_available(method):
            print(f"[weights] {method}: skipped (dependency unavailable)", flush=True)
            continue
        size = config.BAKED_MODELS[method]
        try:
            print(f"[weights] {method} ({size}): checking…", flush=True)
            resolve_weight(method, size=int(size) if method == "ngram" else size)
            print(f"[weights] {method} ({size}): ready", flush=True)
        except Exception as exc:  # noqa: BLE001
            print(f"[weights] {method} ({size}): failed — {exc}", flush=True)
    print("[weights] prefetch done", flush=True)
