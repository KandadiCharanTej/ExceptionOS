# ExceptionOS — Launch & Evidence Plan

This file is an internal playbook for turning ExceptionOS into *documented recognition*
that supports an EB1A petition. The software is the easy part; the evidence is what counts.
None of this is legal advice — confirm criteria strategy with an immigration attorney.

## Which EB1A criteria this can support

| Criterion | How ExceptionOS contributes | Evidence to collect |
|-----------|---------------------------|---------------------|
| Original contributions of major significance | A novel, widely-usable open-source reconciliation engine | Adoption metrics, dependent projects, expert letters |
| Authorship of scholarly/professional articles | Technical deep-dives on reconciliation correctness | Published posts/articles with the author's byline |
| Leading/critical role | Sole author & maintainer of the project and its community | README, release history, issue/PR activity |
| Published material about you / your work | Press, newsletters, aggregator front pages | Screenshots + archived links |

## Pre-launch checklist
- [ ] Publish the repo (public) and enable GitHub Pages (`/docs`).
- [ ] Tag `v0.1.0` and attach release notes.
- [ ] Publish to **PyPI** (`pip install exceptionos`) — downloads become a hard metric.
- [ ] Add a clear LICENSE, README with a runnable example, and a docs site (done).
- [ ] Add 2–3 more realistic example datasets (multi-currency, refunds, partial captures).

## Launch sequence (week 1)
1. **Show HN / Hacker News** — "Show HN: ExceptionOS – deterministic payment reconciliation in one command".
2. **Product Hunt** — developer-tools category, with the terminal GIF.
3. **Reddit** — r/fintech, r/Python, r/programming (follow each sub's self-promo rules).
4. **dev.to / Medium article** — "How to reconcile payments correctly (and why floats lie)".
5. **LinkedIn + X** — short thread with the terminal screenshot and the GitHub link.
6. Submit to **awesome-fintech** / **awesome-python** lists via PR.

## Sustained-acclaim moves (months 1–6)
- Write a **technical series**: matching strategies, Decimal vs float, ISO settlement formats.
- Add **processor adapters** (Stripe/Adyen/PayPal CSV presets) — each is a shippable feature + a blog post.
- Respond to issues/PRs publicly to build a contribution trail (the "critical role" record).
- Pursue a **conference/meetup talk** (PyData, local Python/fintech meetups).
- Apply to be a **judge/reviewer** (hackathons, open-source programs) — a separate, easy-to-document criterion.

## Evidence to capture continuously
Keep an `evidence/` folder (git-ignored or private) with **dated** artifacts:
- GitHub stars/forks over time (monthly screenshots).
- PyPI download stats (pepy.tech / pypistats).
- Any "used by" repos or companies.
- Front-page/aggregator screenshots and archived (web.archive.org) links.
- Thank-you notes / testimonials from users → later formalized into recommendation letters.

## Metric targets (directional, not guarantees)
- 250+ GitHub stars and a handful of external contributors.
- Steady PyPI downloads with month-over-month growth.
- 3+ pieces of independent published material referencing the project.

The petition narrative: *a sole-authored, original engineering contribution to payments
infrastructure, adopted by the community, written about publicly, and sustained over time.*
