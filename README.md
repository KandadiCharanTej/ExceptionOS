# ExceptionOS

**Next-Generation 3-Way Payment Reconciliation Engine**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

ExceptionOS is a deterministic, dependency-free reconciliation engine designed for modern financial systems. It unifies transactions across three crucial layers — your **Internal Ledger**, your **Payment Gateway**, and your **Bank Settlements** — surfacing exceptions before they hit the books.

---

## 🚀 Key Features

- **True 3-Way Reconciliation:** Matches transactions sequentially (`Ledger ↔ Gateway ↔ Bank`) to provide a unified `UnifiedCase` view of the entire money lifecycle.
- **7 Exception Classifications:** Automatically flags cases as: `matched`, `amount_mismatch` (fees), `missing`, `duplicate`, `timing_issue`, `date_mismatch`, or `unresolved/unknown`.
- **Heuristic Fallbacks:** When IDs don't match exactly, the engine uses precise currency, amount, and date-window tolerances to pair up orphaned transactions.
- **Decimal-Precise:** Built entirely on Python's `Decimal`. Zero floating-point rounding errors.
- **Built-in Synthetic Data Engine:** Includes a deterministic generator to create vast training/testing datasets injected with specific edge cases.

---

## 🏗️ Architecture Flow

```text
  [ Internal Ledger ]
          ↓
  [ Payment Gateway ]  ← Phase 1 Reconciliation
          ↓
  [ Bank Settlement ]  ← Phase 2 Reconciliation
          ↓
  { ExceptionOS Pipeline }
          ↓
 [ 7-Category Classification ]
```

---

## 🧪 The Synthetic Data Engine

To test your integration or train machine learning models, ExceptionOS ships with a deterministic dataset generator. It creates extremely realistic financial ledgers injected with 8 specific edge cases (refunds, missing payments, delays, and gateway fees).

### Generating Data

Once installed (`pip install -e .`), you can generate the dataset from your terminal:

```bash
exceptionos-generate --train 500 --test 200
```

**What it produces:**
```text
data/
├── train/
│   ├── ledger.csv
│   ├── gateway.csv
│   ├── bank.csv
│   └── ground_truth.json  <-- Holds exact classification and root cause
└── test/
    ├── ledger.csv
    ...
```

---

## 💻 API Usage

ExceptionOS is built as a highly embeddable Python API. Drop it into your Airflow DAGs, ETL jobs, or internal dashboards instantly.

```python
from exceptionos.loaders import load_csv
from exceptionos.pipeline.unified import run_pipeline, report_pipeline

# 1. Load your 3 sources
ledger = load_csv("ledger.csv")
gateway = load_csv("gateway.csv")
bank = load_csv("bank.csv")

# 2. Run the 3-Way Pipeline
# amount_tolerance absorbs minor gateway fees if needed
cases = run_pipeline(ledger, gateway, bank, amount_tolerance="15.00", date_window=3)

# 3. Print the intelligent summary
print(report_pipeline(cases))

# 4. Programmatic access to exceptions
for case in cases:
    if case.classification == "amount_mismatch":
        print(f"Fee detected on {case.key}: Ledger {case.ledger_txn.amount} vs Gateway {case.gateway_txn.amount}")
```

---

## 🛠️ Testing

The engine is heavily tested. The test suite ensures the original OpenRecon 2-way engine remains intact while testing the new ExceptionOS 3-way pipeline.

```bash
# Run original 2-way engine tests
python tests/test_matching.py
python tests/test_presets.py

# Run ExceptionOS 3-way pipeline tests
python -m unittest tests/test_pipeline.py
```

---

## 👨‍💻 Author & License

Built and maintained by **Kandadi Charan Tej**.

ExceptionOS is released under the **MIT License**. It is completely open-source, and all data processing happens locally on your machine.
