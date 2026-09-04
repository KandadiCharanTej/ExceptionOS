"""Command-line interface: `exceptionos reconcile --left a.csv --right b.csv`."""
from __future__ import annotations

import argparse
import sys

from . import __version__
from .loaders import load_csv
from .matching import reconcile
from .presets import list_presets
from .report import console_summary, summarize, write_exceptions_csv, write_json


def _reconcile_cmd(args) -> int:
    left = load_csv(args.left, preset=args.left_preset, source="left")
    right = load_csv(args.right, preset=args.right_preset, source="right")
    result = reconcile(
        left,
        right,
        amount_tolerance=args.amount_tolerance,
        date_window_days=args.date_window,
        match_keys=not args.no_keys,
    )

    if not args.quiet:
        print(console_summary(result, left_name="ledger", right_name="processor"))

    if args.json:
        write_json(result, args.json)
        if not args.quiet:
            print(f"  wrote {args.json}")
    if args.csv:
        write_exceptions_csv(result, args.csv)
        if not args.quiet:
            print(f"  wrote {args.csv}")

    # Exit non-zero when discrepancies exist — handy in CI / scheduled jobs.
    return 0 if summarize(result)["reconciled"] else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="exceptionos",
        description="Deterministic payment reconciliation across processors, gateways and your ledger.",
    )
    p.add_argument("--version", action="version", version=f"exceptionos {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("reconcile", help="reconcile two CSV files")
    r.add_argument("--left", required=True, help="your ledger / internal records CSV")
    r.add_argument("--right", required=True, help="processor / gateway report CSV")
    r.add_argument("--left-preset", help=f"column preset for --left ({', '.join(list_presets())})")
    r.add_argument("--right-preset", help=f"column preset for --right ({', '.join(list_presets())})")
    r.add_argument("--amount-tolerance", default="0.00",
                   help="absolute amount difference to still treat as a match (default 0.00)")
    r.add_argument("--date-window", type=int, default=3,
                   help="max day difference for heuristic matches (default 3)")
    r.add_argument("--no-keys", action="store_true", help="skip id/reference matching (amount+date only)")
    r.add_argument("--json", help="write a full JSON report to this path")
    r.add_argument("--csv", help="write the exceptions to this CSV path")
    r.add_argument("--quiet", action="store_true", help="suppress the console summary")
    r.set_defaults(func=_reconcile_cmd)

    lp = sub.add_parser("presets", help="list available processor column presets")
    lp.set_defaults(func=_presets_cmd)
    return p


def _presets_cmd(args) -> int:
    from .presets import PRESETS
    print("Available processor presets:\n")
    for name in list_presets():
        cols = ", ".join(f"{role}={col}" for role, col in PRESETS[name].items())
        print(f"  {name:<10} {cols}")
    print("\nUse with:  exceptionos reconcile --right-preset <name> ...")
    return 0


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except (FileNotFoundError, ValueError) as exc:
        print(f"exceptionos: error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
