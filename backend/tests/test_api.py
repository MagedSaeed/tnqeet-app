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
    # rasm is remove_dots(input); ASCII input is unchanged.
    assert r.json() == {"text": "rasm+lstm", "method": "lstm", "rasm": "rasm"}


def test_restore_llm_without_key_is_400(monkeypatch):
    monkeypatch.setattr(dotters, "is_available", lambda m: True)
    r = client.post("/api/restore-dots", json={"text": "rasm", "method": "llm"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "bad_request"


def test_restore_failure_returns_502_with_detail(monkeypatch):
    monkeypatch.setattr(dotters, "is_available", lambda m: True)

    def boom(*a, **k):
        raise RuntimeError("dspy failed. Original error: <html>oops</html>")

    monkeypatch.setattr(dotters, "restore", boom)
    r = client.post("/api/restore-dots", json={"text": "rasm", "method": "lstm"})
    assert r.status_code == 502
    err = r.json()["error"]
    assert err["code"] == "restore_failed"
    # HTML pages are replaced with a short note rather than dumped to the client.
    assert "HTML" in err["detail"]


def test_error_detail_keeps_only_original_error_tail():
    from app.api import _error_detail

    detail = _error_detail(RuntimeError("wrapper noise Original error: real cause here"))
    assert detail == "real cause here"
