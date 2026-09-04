"""Column presets for common payment processor exports.

A preset maps ExceptionOS's roles (key/amount/currency/date) to the column names
a given processor uses in its CSV reports. Presets are a convenience — when a
preset column isn't present in a file, ExceptionOS falls back to auto-detection
for that role, so partial/variant exports still work.

Report formats differ by processor *and* report type; treat these as sensible
defaults and override with an explicit mapping when needed.
"""
from __future__ import annotations

from typing import Dict

PRESETS: Dict[str, Dict[str, str]] = {
    "stripe": {
        "key": "charge_id",
        "amount": "gross",
        "currency": "currency",
        "date": "created",
    },
    "adyen": {
        "key": "Merchant Reference",
        "amount": "Gross Credit (GC)",
        "currency": "Gross Currency",
        "date": "Booking Date",
    },
    "paypal": {
        "key": "Transaction ID",
        "amount": "Gross",
        "currency": "Currency",
        "date": "Date",
    },
    "razorpay": {
        "key": "payment_id",
        "amount": "amount",
        "currency": "currency",
        "date": "created_at",
    },
    "braintree": {
        "key": "Transaction ID",
        "amount": "Settlement Amount",
        "currency": "Currency",
        "date": "Disbursement Date",
    },
    "square": {
        "key": "Transaction ID",
        "amount": "Gross Sales",
        "currency": "Currency",
        "date": "Date",
    },
}


def get_preset(name: str) -> Dict[str, str]:
    key = name.lower().strip()
    if key not in PRESETS:
        available = ", ".join(sorted(PRESETS))
        raise ValueError(f"unknown preset {name!r}; available: {available}")
    return dict(PRESETS[key])


def list_presets() -> list:
    return sorted(PRESETS)
