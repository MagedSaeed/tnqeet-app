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
