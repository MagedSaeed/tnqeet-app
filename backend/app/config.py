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
    "canine": os.getenv("TNQEET_CANINE_SIZE", "s"),
}

# Max characters accepted by remove-dots / restore-dots (bounds request cost).
MAX_INPUT_CHARS = int(os.getenv("TNQEET_MAX_INPUT_CHARS", "8192"))

# Pre-download weight files for available methods at startup (with progress).
PREFETCH_WEIGHTS = os.getenv("TNQEET_PREFETCH_WEIGHTS", "1").lower() not in ("0", "false", "no")

# Max number of neural/n-gram models kept resident in memory at once (LRU).
# Keep small on memory-constrained hosts (e.g. Railway) to avoid OOM.
MAX_RESIDENT_MODELS = int(os.getenv("TNQEET_MAX_RESIDENT_MODELS", "2"))

# Default OpenRouter model if the client does not supply one.
DEFAULT_LLM_MODEL = os.getenv("TNQEET_DEFAULT_LLM_MODEL", "anthropic/claude-sonnet-4.5")

# Directory the built frontend is served from in production (set in Docker).
FRONTEND_DIST = os.getenv("FRONTEND_DIST", "")
