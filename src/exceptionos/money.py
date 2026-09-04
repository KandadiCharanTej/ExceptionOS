"""Money parsing helpers. All monetary values are Decimal — never float."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation

_SYMBOLS = ("$", "€", "£", "₹", "¥", "USD", "EUR", "GBP", "INR", "JPY")


def parse_money(value) -> Decimal:
    """Parse a CSV cell into a Decimal.

    Handles thousands separators, currency symbols, leading +/-, and
    accounting-style negatives like ``(12.34)``.
    """
    if isinstance(value, Decimal):
        return value
    if value is None:
        raise ValueError("missing amount")

    s = str(value).strip()
    if not s:
        raise ValueError("empty amount")

    negative = False
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1]

    s = s.replace(",", "").replace(" ", "")
    for sym in _SYMBOLS:
        s = s.replace(sym, "")

    if s.startswith("-"):
        negative = True
        s = s[1:]
    elif s.startswith("+"):
        s = s[1:]

    try:
        d = Decimal(s)
    except InvalidOperation as exc:
        raise ValueError(f"invalid amount: {value!r}") from exc

    return -d if negative else d


def quantize(d: Decimal) -> Decimal:
    """Round to 2 decimal places for display/reporting."""
    return d.quantize(Decimal("0.01"))
