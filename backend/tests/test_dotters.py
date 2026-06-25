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
