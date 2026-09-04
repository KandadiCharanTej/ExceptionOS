"""Load CSV files into normalized Transaction lists, with column auto-detection."""
from __future__ import annotations

import csv
from datetime import date, datetime
from typing import List, Optional

from .models import Transaction
from .money import parse_money
from .presets import get_preset

# Column-name aliases used to auto-detect a mapping when none is supplied.
ALIASES = {
    "key": ["id", "txn_id", "transaction_id", "reference", "ref", "external_id", "charge_id"],
    "amount": ["amount", "gross", "value", "total", "amount_gross", "debit", "credit"],
    "currency": ["currency", "ccy", "curr", "currency_code"],
    "date": ["date", "created", "created_at", "timestamp", "datetime", "posted_at"],
}

_DATE_FORMATS = [
    "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y",
    "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%m/%d/%y",
]


def parse_date(value) -> Optional[date]:
    if not value:
        return None
    s = str(value).strip()
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    # Last resort: an ISO-looking prefix (e.g. "2026-06-01T12:00:00Z").
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def autodetect_mapping(headers) -> dict:
    """Map roles (key/amount/currency/date) to actual column names."""
    lower = {h.lower(): h for h in headers}
    mapping = {}
    for role, names in ALIASES.items():
        for n in names:
            if n in lower:
                mapping[role] = lower[n]
                break
    return mapping


def resolve_mapping(headers, preset=None) -> dict:
    """Auto-detect a mapping, then override with a processor preset's columns
    that actually exist in the file. Preset columns that are absent are ignored,
    so variant/partial exports still resolve via auto-detection."""
    mapping = autodetect_mapping(headers)
    if preset:
        present = set(headers)
        for role, col in get_preset(preset).items():
            if col in present:
                mapping[role] = col
    return mapping


def load_csv(path, mapping=None, preset=None, source="source", default_currency="USD") -> List[Transaction]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        m = mapping or resolve_mapping(headers, preset)
        if "amount" not in m:
            raise ValueError(
                f"{path}: could not find an amount column (looked for {ALIASES['amount']}). "
                "Pass an explicit mapping."
            )

        txns: List[Transaction] = []
        for i, row in enumerate(reader, start=2):  # line 1 is the header
            amount = parse_money(row.get(m["amount"]))
            raw_key = row.get(m["key"]) if m.get("key") else None
            key = raw_key.strip() if raw_key and raw_key.strip() else None
            raw_ccy = row.get(m["currency"]) if m.get("currency") else None
            currency = raw_ccy.strip().upper() if raw_ccy and raw_ccy.strip() else default_currency
            d = parse_date(row.get(m["date"])) if m.get("date") else None
            txns.append(Transaction(source, key, amount, currency, d, row, i))
    return txns
