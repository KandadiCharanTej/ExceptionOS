# ExceptionOS

**Next-Generation 3-Way Payment Reconciliation & Intelligence Engine**
**Razorpay AI Buildathon — Track 04: AI Finance Controller**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)

ExceptionOS is a deterministic financial reconciliation engine enhanced by bounded AI agents to close the finance-ops loop autonomously without hallucinating financial truths.

## Features

- **Multi-Source Reconciliation**: 3-way matching between Ledger, Gateway, and Bank.
- **Deterministic Source of Truth**: Financial decisions are calculated by code, not LLMs.
- **Bounded AI Agents**: Agents can only select from a safe list of actions (`REQUEST_ANALYST_REVIEW`, `VERIFY_DUPLICATE`, etc.) based on severity and financial impact.
- **Evaluation Loop**: Run synthetic batches of 50+ records and measure Match Rate, Precision, Recall, Throughput, and Auto-Resolution Rate.
- **Honest Exceptions**: AI never hides or artificially resolves cases when deterministic evidence is lacking.
- **Failure Recovery**: Deterministic reconciliation never fails, even if the AI provider goes offline.

## Running the Buildathon Demo

To demonstrate the full finance-ops loop for Track 04:

1. Start the backend: `cd src && uvicorn exceptionos.api.main:app --reload`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173/demo`
4. Choose a predefined scenario (e.g., Exception Spike, Settlement Delay).
5. Click **Run Finance Ops Loop** to orchestrate synthetic data generation, reconciliation, performance evaluation, priority scoring, and AI analysis.
6. Observe the machine-generated **Buildathon Proof Report** and the **Honest Unresolved Exceptions**.

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
