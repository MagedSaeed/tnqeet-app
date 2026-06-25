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
