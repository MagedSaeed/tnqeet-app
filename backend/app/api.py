"""API routes: health, methods catalog, remove-dots, restore-dots."""
import logging

from fastapi import APIRouter, HTTPException

from . import config, dotters
from .schemas import (
    MethodsResponse,
    RemoveDotsRequest,
    RestoreDotsRequest,
    RestoreResponse,
    TextResponse,
)

log = logging.getLogger("tnqeet.api")

router = APIRouter(prefix="/api")


def _error_detail(exc: Exception) -> str:
    """A concise, UI-safe description of an upstream failure.

    dspy wraps the real cause after an 'Original error:' marker; keep only that
    tail. Provider error pages can be huge HTML — replace those with a short
    note, and cap everything else so the client never receives a wall of text.
    """
    msg = str(exc).strip()
    marker = "Original error:"
    if marker in msg:
        msg = msg.split(marker, 1)[1].strip()
    lowered = msg.lower()
    if "<html" in lowered or "<!doctype" in lowered:
        return "The upstream provider returned an HTML error page instead of JSON."
    return msg[:1000]


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
    except Exception as exc:  # upstream/model failure (e.g. OpenRouter)
        # Log the full cause server-side; return a concise detail to the client.
        log.exception("restore-dots failed (method=%s, model=%s)", req.method, req.model)
        raise HTTPException(
            status_code=502,
            detail={
                "code": "restore_failed",
                "message": "Restoration failed.",
                "detail": _error_detail(exc),
            },
        )
    return {"text": text, "method": req.method}
