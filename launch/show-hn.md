# Show HN submission

## Title (≤ 80 chars)
Show HN: ExceptionOS – deterministic payment reconciliation in one command

## URL
https://github.com/KandadiCharanTej/exceptionos

## Text (optional — leave blank to use the URL, or paste this)
I kept rebuilding the same reconciliation script at different payments jobs, so I turned it
into a small, dependency-free tool. You give it your ledger and a processor's payout report
(two CSVs) and it tells you what matches, where amounts drift (usually fees), what settled
that you never recorded, and what you recorded that never settled.

---

## First comment (post immediately after submitting)

Author here. A few notes on the design, and what I'd love feedback on:

**Why it exists.** Reconciliation is the unglamorous core of payments ops, and most teams
solve it with a throwaway pandas script that nobody else can read six months later. I
wanted something deterministic, auditable, and boring in the best way.

**How matching works.** Two phases: (1) exact match on a shared id/reference — if the ids
match but the amounts don't, it's reported as an amount mismatch with the exact delta
(usually the processing fee); (2) a heuristic pass on the leftovers by currency + amount
(within a tolerance) + the closest date inside a window. Whatever's left is a real
exception, split by side: "in ledger only" vs "in processor only."

**Money is Decimal, never float.** Summing thousands of transactions as floats drifts by
cents, which is exactly the kind of error reconciliation is supposed to catch — so the
tool can't introduce it.

**Practical bits.** Zero dependencies (pure stdlib), auto-detects common column names,
ships presets for Stripe/Adyen/PayPal/Razorpay/Braintree/Square, and exits non-zero when
there are discrepancies so you can run it in CI.

**What I'm looking for:** real-world processor export formats you'd want presets for, and
edge cases in your reconciliation that a simple two-phase match would miss (split payouts,
multi-currency settlement, partial captures). Repo: 
https://github.com/KandadiCharanTej/exceptionos

## Posting tips
- Post Tue–Thu, ~8–10am ET for best visibility.
- Title must start with "Show HN:". No emoji, no hype.
- Reply to every comment quickly and substantively in the first 2 hours.
- Don't ask for upvotes anywhere — it's against HN rules and gets flagged.
