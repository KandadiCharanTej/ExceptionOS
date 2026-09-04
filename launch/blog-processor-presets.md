---
title: "Reconciling Stripe, Adyen and PayPal exports with one CLI"
published: false
description: "Every processor names its CSV columns differently. Here's how ExceptionOS's presets normalize them so reconciliation just works."
tags: payments, fintech, stripe, python
canonical_url: https://github.com/KandadiCharanTej/exceptionos
---

If you reconcile payments across more than one processor, you've met this annoyance: every
provider names its CSV columns differently, and none of them match your ledger.

- **Stripe** gives you `charge_id`, `gross`, `created`.
- **PayPal** gives you `Transaction ID`, `Gross`, `Date`.
- **Adyen** gives you `Merchant Reference`, `Gross Credit (GC)`, `Booking Date`.

Same concepts, six different vocabularies. Before you can reconcile anything, you have to
teach your tool what "amount" and "date" are called this time.

## Presets

The latest [ExceptionOS](https://github.com/KandadiCharanTej/exceptionos) release adds
**processor presets** — a built-in column mapping for each major provider:

```bash
exceptionos reconcile --left ledger.csv --right stripe_payouts.csv --right-preset stripe
```

```bash
$ exceptionos presets
Available processor presets:

  adyen      key=Merchant Reference, amount=Gross Credit (GC), ...
  braintree  key=Transaction ID, amount=Settlement Amount, ...
  paypal     key=Transaction ID, amount=Gross, ...
  razorpay   key=payment_id, amount=amount, ...
  square     key=Transaction ID, amount=Gross Sales, ...
  stripe     key=charge_id, amount=gross, ...
```

## Graceful fallback, not a straitjacket

Processor reports vary by *report type*, not just by processor — a Stripe balance report
and a Stripe payments export don't share every column. So presets don't replace ExceptionOS's
auto-detection; they layer on top of it.

The resolution rule is simple: **auto-detect everything first, then override with the
preset's columns that actually exist in the file.** If a preset names a column your export
doesn't have, ExceptionOS keeps the auto-detected one. You get the convenience of a preset
without it breaking on a variant export.

```python
from exceptionos.loaders import resolve_mapping

headers = ["id", "amount", "currency", "date"]      # generic export
resolve_mapping(headers, preset="paypal")
# -> {'key': 'id', 'amount': 'amount', 'currency': 'currency', 'date': 'date'}
# PayPal's "Gross"/"Transaction ID" weren't present, so auto-detection filled in.
```

## Adding your own

A preset is just a dict of role → column name. Contributions are welcome — if you have a
processor export format that isn't covered, open a PR with the column mapping (and ideally
a sanitized sample), and it becomes a one-flag experience for everyone.

ExceptionOS is MIT-licensed and dependency-free:
https://github.com/KandadiCharanTej/exceptionos
