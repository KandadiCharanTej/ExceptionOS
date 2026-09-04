"""Core data model: a single normalized transaction from one source."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass
class Transaction:
    """A normalized transaction loaded from one side of a reconciliation.

    ``key`` is the cross-system identifier (e.g. a charge id or reference)
    when present. ``row`` keeps the original CSV record for reporting.
    """

    source: str
    key: Optional[str]
    amount: Decimal
    currency: str
    date: Optional[date]
    row: dict
    line: int = 0

    def __repr__(self) -> str:  # pragma: no cover - cosmetic
        return f"<Txn {self.source} key={self.key} {self.amount} {self.currency} {self.date}>"
