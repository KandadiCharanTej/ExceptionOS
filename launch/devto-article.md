---
title: "How to reconcile payments correctly (and why floats lie)"
published: false
description: "A practical guide to payment reconciliation — matching strategies, the fee-drift problem, and why money should never be a float. With an open-source tool to do it in one command."
tags: payments, fintech, python, opensource
canonical_url: https://github.com/KandadiCharanTej/exceptionos
---

If you've ever worked on payments, you know the quiet dread of the monthly question:
**does the money the processor says it moved actually match what our system recorded?**

It sounds trivial. It isn't. Between your application's ledger and a processor's payout
report sit fees, refunds, partial captures, currency conversions, timing differences, and
the occasional plain bug. Reconciliation is the process of lining those two worlds up and
explaining every difference. This post is about doing it *correctly* — and a small
open-source tool, [ExceptionOS](https://github.com/KandadiCharanTej/exceptionos), that
does it in one command.

## First, a warning: money is not a float

Here's a bug I've seen ship to production more than once:

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> (0.1 + 0.2) == 0.3
False
```

Floating-point numbers are binary approximations. The moment you sum thousands of
transactions as floats, your totals drift by cents — and in reconciliation, a one-cent
drift is the difference between "balanced" and "spent two days hunting a ghost."

The fix is simple and non-negotiable: represent money as a fixed-precision decimal.

```python
from decimal import Decimal
Decimal("0.1") + Decimal("0.2")     # Decimal('0.3')  — exact
```

ExceptionOS parses every amount into a `Decimal` and never converts back to float.

## The four outcomes of reconciliation

For any two sets of transactions, every record falls into one of four buckets:

1. **Matched** — present on both sides, same amount. Boring. Good.
2. **Amount mismatch** — the *same* transaction appears on both sides, but the amounts
   differ. This is almost always a **fee** (the processor took its cut) or an error.
3. **In the ledger only** — you recorded a charge the processor never settled. A missing
   payout, a failed capture, or a sync gap.
4. **In the processor only** — the processor moved money you never recorded. Often the
   scariest one: an unbooked refund, a duplicate, or a leak.

A reconciliation tool's whole job is to sort records into those four buckets and show you
the exact deltas. Everything else is detail.

## A matching strategy that actually works

Naive matching ("join on transaction id") breaks the instant one side is missing the id —
which happens constantly across systems that were never designed to share keys. A robust
approach is two-phase:

**Phase A — match on a shared key.** Pair transactions that share an id or reference. If
the ids match but the amounts differ, don't discard it — record it as an *amount mismatch*
with the exact delta. That delta is usually the fee, and surfacing it is the whole point.

**Phase B — heuristic match on the leftovers.** For records without a shared key, match by
currency and amount within a small tolerance, choosing the **closest date** inside a
window. This catches the very common case where your ledger and the processor each use
their own identifiers.

Whatever survives both phases is a genuine exception — bucket 3 or bucket 4 above.

## Doing it in one command

That two-phase strategy is exactly what ExceptionOS implements. Point it at two CSVs:

```bash
exceptionos reconcile --left ledger.csv --right processor.csv --csv exceptions.csv
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

It auto-detects common column names (`reference`, `gross`, `created`, …) and ships presets
for Stripe, Adyen, PayPal, Razorpay, Braintree, and Square:

```bash
exceptionos reconcile --left ledger.csv --right stripe_payouts.csv --right-preset stripe
```

It exits non-zero when discrepancies exist, so you can drop it into CI and fail the build
the moment a settlement stops balancing.

And it's a library too:

```python
from exceptionos import load_csv, reconcile

left = load_csv("ledger.csv")
right = load_csv("processor.csv", preset="stripe")
result = reconcile(left, right, amount_tolerance="0.01", date_window_days=2)

for m in result.mismatches:
    print(m.left.key, m.amount_delta)       # fee / wrong-amount deltas
for t in result.unmatched_right:
    print("unrecorded:", t.key, t.amount)    # money moved but never booked
```

## Takeaways

- Never store or sum money as a float. Use `Decimal`.
- Think in the four buckets: matched, mismatch, ledger-only, processor-only.
- Match on keys first, then fall back to amount + date heuristics.
- Treat amount mismatches as signal (fees!), not noise.

ExceptionOS is free, open source (MIT), dependency-free, and on
[GitHub](https://github.com/KandadiCharanTej/exceptionos). If you work in payments,
I'd love feedback — especially on processor export formats you'd like presets for.
