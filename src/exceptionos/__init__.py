"""ExceptionOS — a deterministic payment reconciliation engine and CLI."""
from __future__ import annotations

__version__ = "0.2.0"

from .loaders import autodetect_mapping, load_csv, resolve_mapping  # noqa: E402
from .matching import Match, Result, reconcile  # noqa: E402
from .models import Transaction  # noqa: E402
from .money import parse_money  # noqa: E402
from .presets import get_preset, list_presets  # noqa: E402
from .report import (  # noqa: E402
    console_summary,
    exceptions,
    summarize,
    write_exceptions_csv,
    write_json,
)

__all__ = [
    "__version__",
    "Transaction",
    "reconcile",
    "Result",
    "Match",
    "load_csv",
    "autodetect_mapping",
    "resolve_mapping",
    "get_preset",
    "list_presets",
    "parse_money",
    "summarize",
    "exceptions",
    "console_summary",
    "write_json",
    "write_exceptions_csv",
]
