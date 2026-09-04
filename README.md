<div align="center">

# ExceptionOS

**A deterministic payment reconciliation engine and CLI — match transactions across
processors, gateways, and your internal ledger, and surface every discrepancy.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Python](https://img.shields.io/badge/python-3.9%2B-2563eb)
![No dependencies](https://img.shields.io/badge/dependencies-zero-7c3aed)
![Typed](https://img.shields.io/badge/typed-yes-16a34a)

🌐 **Website:** https://kandadicharantej.github.io/exceptionos/

</div>

---

Reconciliation is the chore every payments team dreads: does the money the processor
says it moved actually match what your ledger recorded? ExceptionOS answers that in one
command — pairing transactions, flagging fee/amount differences, and listing exactly
what's missing on each side.

- **Two-phase matching** — exact match on a shared id/reference, then a heuristic pass
  on the leftovers by amount + currency + a date window.
- **Built for money** — every amount is a `Decimal`, never a float.
- **Finds the four things that matter** — clean matches, amount mismatches (fees / wrong
  amounts), settlements missing from the processor, and charges missing from your ledger.
- **Zero dependencies** — pure Python standard library. Library *and* CLI.
- **CI-friendly** — exits non-zero when discrepancies exist.

## Install

```bash
pip install exceptionos          # once published to PyPI
# or, from a checkout:
pip install -e .
```

## Quick start

```bash
exceptionos reconcile --left examples/ledger.csv --right examples/processor.csv --csv exceptions.csv
```

```
  ExceptionOS — reconciliation summary
  ------------------------------------------
  matched                   3
  amount mismatches         1   (1.00)
  in ledger only            1   (15.00)
  in processor only         1   (310.00)
  ------------------------------------------
  status               EXCEPTIONS FOUND
```

`exceptions.csv`:

| type | key | left_amount | right_amount | delta |
|------|-----|-------------|--------------|-------|
| amount_mismatch | L1003 | 200.00 | 199.00 | 1.00 |
| unmatched_left | L1005 | 15.00 | | |
| unmatched_right | PROC-90 | | 310.00 | |

Columns are auto-detected (`id`/`reference`, `amount`/`gross`, `currency`/`ccy`,
`date`/`created`, …), so most processor and ledger exports work out of the box.

### Options

| Flag | Meaning |
|------|---------|
| `--amount-tolerance 0.01` | treat tiny amount differences as a match |
| `--date-window 3` | max day gap for heuristic matches (default 3) |
| `--no-keys` | ignore ids; match on amount + date only |
| `--json report.json` | full structured report |
| `--csv exceptions.csv` | discrepancies as CSV |

### Processor presets

Real processor exports use their own column names. Presets map them for you, with a
graceful fallback to auto-detection for any column a preset doesn't cover:

```bash
exceptionos reconcile --left ledger.csv --right stripe_payouts.csv --right-preset stripe
exceptionos presets        # list all available presets
```

Built-in presets: `stripe`, `adyen`, `paypal`, `razorpay`, `braintree`, `square`.
(Report formats vary by processor and report type — override with an explicit mapping
when needed.)

## Use as a library

```python
from exceptionos import load_csv, reconcile, summarize

left = load_csv("ledger.csv", source="ledger")
right = load_csv("processor.csv", source="processor")

result = reconcile(left, right, amount_tolerance="0.01", date_window_days=2)

print(summarize(result))
for m in result.mismatches:
    print(m.left.key, m.amount_delta)        # fee / wrong-amount deltas
for t in result.unmatched_right:
    print("unrecorded:", t.key, t.amount)    # money the processor moved but you never logged
```

## How matching works

1. **Phase A — key match.** Transactions sharing an id/reference are paired. If the
   amounts differ by more than the tolerance, it's reported as an `amount_mismatch`
   with the exact delta (typically a processing fee or a wrong amount).
2. **Phase B — heuristic match.** Remaining transactions are paired by currency and
   amount (within tolerance) and the **closest** date inside the window.
3. **Leftovers** become `unmatched_left` (in your ledger, missing from the processor)
   and `unmatched_right` (in the processor, never recorded by you).

## Develop

```bash
python tests/test_matching.py     # no pytest needed
# or: pytest
```

## License

[MIT](LICENSE) © 2026 Kandadi Charan Tej
