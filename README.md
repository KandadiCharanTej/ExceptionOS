# ExceptionOS

**Next-Generation 3-Way Payment Reconciliation & Intelligence Engine**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)

ExceptionOS is a deterministic, dependency-free reconciliation engine paired with a production-grade Intelligence Workspace. It unifies transactions across three crucial layers — your **Internal Ledger**, your **Payment Gateway**, and your **Bank Settlements** — surfacing exceptions before they hit the books, and providing human analysts with AI-like deterministic root cause analysis.

---

## 🚀 Key Features

- **True 3-Way Reconciliation:** Matches transactions sequentially (`Ledger ↔ Gateway ↔ Bank`) to provide a unified `UnifiedCase` view of the entire money lifecycle.
- **Deterministic Intelligence Engine:** Evaluates timelines and evidence to automatically generate Root Cause Analyses (e.g. `gateway_fee_deduction`, `delayed_settlement`) with confidence scores.
- **7 Exception Classifications:** Automatically flags cases as: `matched`, `amount_mismatch` (fees), `missing`, `duplicate`, `timing_issue`, `date_mismatch`, or `unresolved/unknown`.
- **Heuristic Fallbacks:** When IDs don't match exactly, the engine uses precise currency, amount, and date-window tolerances to pair up orphaned transactions.
- **Exception Memory:** Remembers past resolutions and surfaces them as similar cases to speed up manual triage.
- **Premium Investigation Workspace:** A fully-featured React frontend equipped with 3-way comparisons, audit trails, analyst annotation overrides, and bulk actions.
- **Built-in Synthetic Data Engine:** Includes a deterministic generator to create vast training/testing datasets injected with specific edge cases.

---

## 🏗️ Architecture Stack

ExceptionOS is built as a complete SaaS-ready product:

1. **Core Engine (Python):** Pure Python, decimal-precise, zero floating-point errors.
2. **Backend API (FastAPI):** High-performance RESTful API managing cases, memory, and dataset persistence in SQLite/SQLAlchemy.
3. **Frontend App (React + Vite + Tailwind):** A dark-mode, responsive, interactive workspace leveraging React Query for robust state management.

```text
  [ Internal Ledger ]
          ↓
  [ Payment Gateway ]  ← Phase 1 Reconciliation
          ↓
  [ Bank Settlement ]  ← Phase 2 Reconciliation
          ↓
  { ExceptionOS Pipeline }
          ↓
 [ FastAPI Backend Engine ] ↔ [ Exception Memory (SQLite) ]
          ↓
[ React Intelligence Workspace ]
```

---

## 💻 Running ExceptionOS Locally

### 1. Start the Backend API

```bash
pip install -e .
uvicorn exceptionos.api.main:app --reload
```
The API and Swagger docs will be available at `http://localhost:8000/docs`.

### 2. Start the Frontend Workspace

```bash
cd frontend
npm install
npm run dev
```
The application will be running at `http://localhost:5173`.

---

## 🧪 The Synthetic Data Engine

To test your integration or train machine learning models, ExceptionOS ships with a deterministic dataset generator. It creates extremely realistic financial ledgers injected with specific edge cases (refunds, missing payments, delays, and gateway fees).

```bash
exceptionos-generate --train 500 --test 200
```

---

## 👨‍💻 Author & License

Built and maintained by **Kandadi Charan Tej**.

ExceptionOS is released under the **MIT License**. It is completely open-source, and all data processing happens locally on your machine.
