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
