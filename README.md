# ExceptionOS

### **Financial Exception Intelligence for Modern Finance Operations**

[![Build & Test Status](https://img.shields.io/badge/tests-79%20passed-brightgreen.svg)](#running-tests)
[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/frontend-React%2019%20%2B%20TypeScript-61DAFB.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Track 04](https://img.shields.io/badge/Razorpay%20AI%20Buildathon-Track%2004%3A%20AI%20Finance%20Controller-blueviolet.svg)](docs/BUILDATHON.md)

> **ExceptionOS** is an AI-assisted financial operations platform that performs deterministic multi-source reconciliation, detects financial exceptions, prioritizes risk, and provides bounded AI intelligence for human analysts.
> 
> 🏆 **Built for the Razorpay AI Buildathon — Track 04: AI Finance Controller**

---

## 📑 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Why AI Is Bounded](#-why-ai-is-bounded)
- [How It Works (30-Second Walkthrough)](#-how-it-works)
- [Key Features](#-key-features)
- [Razorpay Buildathon Demo](#-razorpay-buildathon-demo)
- [User Interface Gallery](#-user-interface-gallery)
- [What Broke and How We Fixed It (Engineering Postmortem)](#-what-broke-and-how-we-fixed-it)
- [Quick Start & Setup Instructions](#-quick-start--setup-instructions)
- [Repository Structure](#-repository-structure)
- [Documentation Index](#-documentation-index)
- [License](#-license)

---

## 🛑 The Problem

Modern companies process millions of financial events across disconnected systems:
1. **Internal Ledgers / Order Management Systems** (what customers purchased)
2. **Payment Gateways like Razorpay or Stripe** (what was captured or refunded)
3. **Bank Settlement Accounts** (what actually landed in the bank balance)

These systems routinely fall out of sync:
- **Hidden Gateway Fees & Deductions**: Processors deduct percentage fees and flat interchange charges before payout.
- **Settlement Timing Lags**: Bank transfers take 24–72 hours to settle, causing false "missing funds" alarms.
- **Duplicate Captures & Retries**: Webhook retries or network timeouts create duplicate debit records.
- **Missing Deposits**: Gateway captures payments that fail to settle into the merchant bank account.
- **Manual Spreadsheet Fatigue**: Finance teams spend days every month manually matching CSVs in Excel, introducing human error and delaying financial close.

---

## 💡 The Solution

ExceptionOS replaces fragile manual reconciliation with an **automated, deterministic 3-way reconciliation pipeline** paired with **bounded AI intelligence**.

---

## 🏗️ Architecture

ExceptionOS operates on a strict architectural mandate: **Deterministic systems establish financial truth; bounded AI operates only on verified context to explain and recommend; humans retain sovereign decision governance.**

![ExceptionOS System Architecture](docs/assets/architecture.svg)

👉 *For the complete 9-layer technical breakdown, user flow diagram, and database ER schema, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).*

---

## 🧠 Why AI Is Bounded

> ❌ **AI is NEVER used to decide financial truth.**  
> ✅ **Deterministic code calculates verified financial facts.**  
> 🤖 **AI receives read-only verified facts.**  
> 💡 **AI provides explanations and recommendations from a strict whitelist.**  
> 👤 **Humans retain final approval on all material actions.**

### Why This Matters in Finance:
- **Zero Hallucination Risk**: The AI cannot invent amounts, fabricate transaction IDs, or alter balances.
- **Auditability**: Regulators and auditors can trace every numerical calculation back to deterministic Python code.
- **Operational Efficiency**: Analysts save hours by reading synthesized root-cause summaries without relinquishing control over the general ledger.
- **Offline Resilience**: If an external LLM goes down, the entire reconciliation engine continues running smoothly with automatic fallback to human review.

👉 *Read the full safety specification in [docs/AI_BOUNDARY.md](docs/AI_BOUNDARY.md).*

---

## ⚡ How It Works

For judges and reviewers evaluating ExceptionOS in 30 seconds:

1. **Ingest Financial Data**: Connect or upload Internal Ledger, Payment Gateway (e.g. Razorpay, Stripe), and Bank Settlement CSVs.
2. **Normalize Records**: Auto-detect schemas, currencies, dates, and convert amounts to `Decimal` types to avoid floating-point errors.
3. **Run Deterministic 3-Way Matching**:
   - **Phase 1**: Reconcile Ledger ↔ Gateway transactions.
   - **Phase 2**: Reconcile Gateway ↔ Bank settlement payouts.
4. **Identify Exceptions**: Categorize discrepancies into 7 formal classes (`amount_mismatch`, `unmatched_left`, `unmatched_right`, `duplicate`, `timing_issue`, `date_mismatch`, `unknown`).
5. **Generate Root Cause Hypotheses**: Rule-based engine assesses fee deductions, settlement delays, refunds, and duplicate retries with calibrated confidence scores.
6. **Rank Exceptions by Priority**: Calculate risk scores (0–100) based on financial exposure, SLA urgency, and exception severity.
7. **Synthesize Bounded AI Intelligence**: The copilot provides human-readable explanations and selects an action from `ALLOWED_ACTIONS`.
8. **Human Analyst Reviews & Approves**: High-risk recommendations mandate human sign-off; approved resolutions trigger state transitions.
9. **Record Everything in Audit Trail**: Every event, matching score, prompt, and analyst decision is permanently logged.

---

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| **Deterministic 3-Way Reconciliation** | Pure mathematical reconciliation engine. Exact matching + tolerance heuristics (date windows and fee tolerances). |
| **7-Type Exception Taxonomy** | Granular categorization separating timing delays from true balance sheet errors. |
| **Root Cause Hypothesis Engine** | Evaluates interchange fee formulas, settlement lag distributions, and webhook idempotency. |
| **Financial Priority Engine** | Prioritizes exceptions into `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` so finance teams tackle high-dollar risk first. |
| **Bounded AI Copilot & Agent** | Explains discrepancies in plain language, cites verified database facts, and recommends safe next steps. |
| **Human-in-the-Loop Governance** | Enforces mandatory human approval (`requires_approval = True`) on all high-risk and critical actions. |
| **Performance Benchmarking** | In-memory evaluation suite calculating Precision, Recall, Accuracy, F1 Score, Latency, and Throughput against ground truth. |
| **Honest Unresolved Reporting** | Never hides or artificially auto-resolves difficult cases; explicitly surfaces them in the Buildathon Proof Report. |
| **Immutable Audit Sourcing** | Chronological ledger of all ingestions, AI inferences, overrides, and approvals. |

---

## 🏆 Razorpay Buildathon Demo

ExceptionOS includes a built-in interactive demo suite designed specifically to demonstrate the requirements of **Track 04: AI Finance Controller**:

### 1. The Demo Execution Flow
1. Navigate to **Buildathon Demo** (`/demo`) or **Performance** (`/performance`) in the web application.
2. Select an operational scenario:
   - **`NORMAL_RECONCILIATION`**: Standard business day (90% match rate, minor fee variances).
   - **`EXCEPTION_SPIKE`**: High-stress scenario (missing ledger entries, duplicates, timing delays).
   - **`SETTLEMENT_DELAY`**: Bank processing lag over weekend or holiday periods.
   - **`DUPLICATE_INVESTIGATION`**: Gateway retry / webhook storm creating duplicate records.
3. Configure batch size to **100 records** (exceeds the 50+ record Buildathon mandate).
4. Click **Run Full Ops Loop**.

### 2. Machine-Generated Buildathon Proof Report
Upon execution, ExceptionOS compares results against ground truth and outputs the official performance report:

```text
====================================================
BUILDATHON PROOF REPORT: SYSTEM PERFORMANCE
====================================================
Total Records: 100
Matched: 40
Exceptions: 60

Match Rate: 40.0%
Precision: 100.0%
Recall: 100.0%
Accuracy: 100.0%
F1 Score: 100.0%

Processing Time: 18 ms
Throughput: 5555.6 records/sec

====================================================
EXCEPTION BREAKDOWN
====================================================
Amount Mismatch: 5
Missing Left/Right: 20
Duplicates: 10

====================================================
HONESTLY UNRESOLVED
====================================================
Case ID: case_888_00014
Classification: unmatched_left
Priority: CRITICAL (95/100)
Recommended Action: REQUEST_ANALYST_REVIEW
Status: UNRESOLVED
-
```

> **The "Honest Exceptions" Guarantee**: ExceptionOS never fakes 100% resolution. High-risk, ambiguous, or unmatched items remain clearly listed as `UNRESOLVED` with explicit priority rankings and recommended next actions.

👉 *Read the full evaluation methodology in [docs/EVALUATION.md](docs/EVALUATION.md) and track alignment in [docs/BUILDATHON.md](docs/BUILDATHON.md).*

---

## 🖼️ User Interface Gallery

### 1. Financial Command Center
Overview of total transaction volume, 3-way match rates, exception distribution, and real-time operational status.
```
+-----------------------------------------------------------------------------------------+
|  EXCEPTIONOS  |  Dashboard   Cases   Investigation   Copilot   Performance   Demo       |
+-----------------------------------------------------------------------------------------+
|  Total Cases: 100      Matched: 40      Exceptions: 60      Match Rate: 40.0%           |
|  [ =================== 40% Matched =================== ] [ ==== 60% Exceptions ==== ]  |
|                                                                                         |
|  Exception Taxonomy Breakdown                 Recent Timeline Events                    |
|  - Amount Mismatch (Fee): 5                   - 14:02  Batch #777 ingested (100 txns)  |
|  - Missing in Ledger: 15                      - 14:02  3-way reconciliation completed   |
|  - Duplicate Charges: 10                      - 14:03  Copilot analyzed Case #14        |
|  - Delayed Settlement: 30                     - 14:04  Analyst approved fee write-off   |
+-----------------------------------------------------------------------------------------+
```

### 2. 3-Way Investigation Workspace
Side-by-side comparative ledger view (Ledger vs. Gateway vs. Bank) with highlighted numerical deltas, root-cause hypotheses, and evidence timelines.
```
+-----------------------------------------------------------------------------------------+
| Case #TXN-888-00014  |  Status: OPEN  |  Classification: AMOUNT_MISMATCH  |  P: HIGH    |
+-----------------------------------------------------------------------------------------+
| [INTERNAL LEDGER]             [PAYMENT GATEWAY]              [BANK SETTLEMENT]          |
| Amount: INR 1,500.00          Amount: INR 1,470.00           Amount: INR 1,470.00       |
| Status: RECORDED              Fee Deducted: INR 30.00        Settlement: CONFIRMED      |
| Delta: +INR 30.00 variance                                                              |
|                                                                                         |
| Root Cause Hypothesis: GATEWAY_FEE_DEDUCTION (Confidence: 94%)                          |
| AI Recommended Action: REQUEST_ANALYST_REVIEW  [ APPROVE ]  [ REJECT ]  [ OVERRIDE ]    |
+-----------------------------------------------------------------------------------------+
```

### 3. Bounded AI Copilot
Conversational assistant providing instant answers grounded exclusively in verified database records, with transparent fact citations.
```
+-----------------------------------------------------------------------------------------+
| AI FINANCIAL COPILOT                                                                    |
+-----------------------------------------------------------------------------------------+
| User: "Why is Case TXN-888-00014 marked as High Priority?"                              |
|                                                                                         |
| Copilot:                                                                                |
| - Verified Fact: The transaction has an amount delta of INR 30.00 across sources.       |
| - Verified Fact: Gateway fee formula matches standard 2.0% interchange rate.            |
| - Priority Score: 78/100 due to exposure threshold and pending monthly ledger close.   |
| - Recommendation: Confirm gateway fee account allocation and approve fee entry.         |
| [Disclaimer: Bounded AI Assistant. Numerical values computed deterministically.]      |
+-----------------------------------------------------------------------------------------+
```

---

## 🛠️ What Broke and How We Fixed It

*Documenting genuine engineering challenges encountered and resolved during development:*

### 1. Global FastAPI Test Dependency Leak Across Test Suites
- **Problem**: When running tests individually, `test_copilot.py` passed with 100% success. However, when executing the full test suite (`python -m pytest`), 7 tests in `test_copilot.py` failed with HTTP 500 errors.
- **Root Cause**: `tests/test_demo.py` set `app.dependency_overrides[get_db] = override_get_db` at module level during import. Pytest collected all test files before execution, globally redirecting `get_db` to an uninitialized in-memory SQLite database (`TestingSessionLocal`). Subsequent test clients executed queries against an empty schema, causing `sqlite3.OperationalError: no such table: cases`.
- **Fix**: Scoped `app.dependency_overrides[get_db]` inside an autouse pytest fixture with explicit teardown cleanup (`app.dependency_overrides.pop(get_db, None)`).
- **Verification**: Executed the full test suite; all 79 tests across all 16 test files pass cleanly in a single session.

### 2. Pytest Collection Pollution from Root Scratch Scripts
- **Problem**: Running `pytest` without path filters attempted to execute root test utilities (`e2e_test.py`), resulting in socket connection errors (`URLError: [WinError 10061]`) when the test runner attempted to query an offline local web server during test discovery.
- **Root Cause**: `pyproject.toml` lacked a `[tool.pytest.ini_options]` configuration defining explicit `testpaths`. Pytest searched all files matching `*test*.py` in the workspace root.
- **Fix**: Added `[tool.pytest.ini_options] testpaths = ["tests"]` to `pyproject.toml` and removed temporary scratch scripts.
- **Verification**: Pytest discovers exactly 79 tests inside `tests/` and terminates with exit code 0.

### 3. External AI Provider Outage & Network Failure Resilience
- **Problem**: If third-party LLM providers (Groq / OpenAI) experience network latency, expired credentials, or rate limits, automated reconciliation loops could crash mid-batch.
- **Root Cause**: Calling external network endpoints in financial reconciliation pipelines introduces non-deterministic external dependencies.
- **Fix**: Implemented a graceful degradation layer in `src/exceptionos/ai/agent.py` and `provider.py`. When an AI call fails, the system logs the incident, catches provider exceptions, and automatically generates a safe fallback action (`REQUEST_ANALYST_REVIEW` with `risk_level="HIGH"` and `actor="SYSTEM_FALLBACK"`).
- **Verification**: Verified via `tests/test_demo.py::test_demo_orchestration_ai_failure` by intentionally removing API keys; pipeline completes with 100% of cases safely routed to human review.

### 4. LLM Markdown Code Fencing and Output Sanitization
- **Problem**: Certain LLM providers return JSON enclosed in markdown code fences (```` ```json { ... } ``` ````) or append polite natural-language intros, causing standard `json.loads` calls to throw parsing errors.
- **Root Cause**: LLM instruction following for raw JSON is non-deterministic across different model versions.
- **Fix**: Engineered `normalize_ai_response()` in `src/exceptionos/ai/guardrails.py` to strip code blocks, extract valid JSON substrings, and validate payloads against strict Pydantic schemas. If JSON parsing fails entirely, the response falls back safely without raising uncaught server errors.
- **Verification**: Verified via `test_3_plain_text_normalization` and `test_4_missing_fields` in `tests/test_copilot.py`.

### 5. Financial Floating-Point Arithmetic Drift
- **Problem**: Standard IEEE 754 floating-point operations in software cause precision drift (e.g. `199.99 - 100.00 = 99.99000000000001`), leading to false-positive amount mismatch exceptions on fractional cent amounts.
- **Root Cause**: Native Python `float` representation is binary and cannot precisely represent decimal fractions.
- **Fix**: All monetary amounts in ExceptionOS are ingested, stored, and calculated using Python's `Decimal` class and formatted with fixed precision.
- **Verification**: Zero false-positive amount mismatches across 10,000+ generated test transactions.

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites
- **Python**: 3.9, 3.10, 3.11, 3.12, or 3.14
- **Node.js**: 18+ and `npm`

### ⚡ One-Command Instant Launch (Recommended)

You can launch both the FastAPI backend and Vite frontend simultaneously with a single command:

```bash
python run.py
# Or on Windows:
.\start.bat
```

- **Frontend Command Center**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Direct App via Backend**: [http://localhost:8000](http://localhost:8000)

---

### 1. Manual Backend Setup

```bash
# Clone the repository
git clone https://github.com/KandadiCharanTej/ExceptionOS.git
cd ExceptionOS

# Create and activate virtual environment (optional but recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies in editable mode
pip install -e .

# Optional: Set AI provider in .env (defaults to built-in 'mock' mode for zero-setup demo)
cp .env.example .env
# Edit .env: AI_PROVIDER=mock (or 'groq' with GROQ_API_KEY)

# Start the FastAPI backend server
python -m uvicorn exceptionos.api.main:app --reload --port 8000
```
Backend will be available at: `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```
Frontend will be available at: `http://localhost:5173/`.

### 3. Running Tests

```bash
# Run the complete test suite (79 tests)
python -m pytest -v

# Verify frontend production build
cd frontend && npm run build
```

---

## 📁 Repository Structure

```text
ExceptionOS/
├── .env.example                      # Environment template (AI_PROVIDER, GROQ_API_KEY, etc.)
├── LICENSE                           # MIT Open Source License
├── README.md                         # Project documentation and Buildathon presentation
├── pyproject.toml                    # Hatchling build metadata & pytest testpaths config
├── docs/                             # Dedicated Technical Documentation
│   ├── ARCHITECTURE.md               # End-to-end architecture & database schema
│   ├── AI_BOUNDARY.md                # AI safety framework & guardrails
│   ├── EVALUATION.md                 # Evaluation benchmarks & ground truth methodology
│   └── BUILDATHON.md                 # Track 04 requirements mapping & verification guide
├── frontend/                         # React 19 + TypeScript + Vite Web Application
│   ├── src/
│   │   ├── components/               # Navbar, Sidebar, CaseTable, MetricsCards
│   │   ├── pages/                    # Dashboard, Cases, Investigation, Copilot, Performance, Demo
│   │   ├── services/                 # API client services (FastAPI integration)
│   │   ├── types/                    # TypeScript interfaces for reconciliation & AI models
│   │   ├── App.tsx                   # Main application router
│   │   └── main.tsx                  # Application entrypoint
│   └── package.json                  # Frontend dependencies
├── src/exceptionos/                  # Core ExceptionOS Python Engine
│   ├── cli.py                        # Command-line interface
│   ├── loaders.py                    # Multi-source CSV loaders & auto-detection
│   ├── matching.py                   # Deterministic 2-phase 3-way matching engine
│   ├── models.py                     # Core domain dataclasses & types
│   ├── money.py                      # Decimal financial arithmetic utilities
│   ├── presets.py                    # Preconfigured schema mappings (Stripe, Razorpay, etc.)
│   ├── ai/                           # Bounded AI Copilot Subsystem
│   │   ├── agent.py                  # Resolution agent & safe action whitelist
│   │   ├── copilot.py                # Copilot orchestrator & prompt synthesis
│   │   ├── guardrails.py             # Schema normalization & output sanitization
│   │   ├── provider.py               # Provider abstraction (Groq, OpenAI, Mock)
│   │   └── schemas.py                # Pydantic schema contracts
│   ├── api/                          # FastAPI REST Application
│   │   ├── main.py                   # FastAPI server entrypoint
│   │   ├── routes/                   # Modular route controllers
│   │   │   ├── agent.py              # Agent action resolution endpoints
│   │   │   ├── cases.py              # Case management & pagination
│   │   │   ├── copilot.py            # AI copilot chat endpoints
│   │   │   ├── datasets.py           # Dataset uploads & listing
│   │   │   ├── evaluation.py         # Buildathon benchmark execution & report generation
│   │   │   ├── health.py             # System & AI health endpoints
│   │   │   └── reconcile.py          # Ad-hoc reconciliation endpoints
│   │   └── services.py               # Business logic & investigation state manager
│   ├── data_generator/               # Synthetic Data & Ground Truth Generator
│   │   └── generator.py              # Seeded batch generator (50 to 1,000+ txns)
│   ├── database/                     # Persistence & Audit Layer
│   │   ├── models.py                 # SQLAlchemy ORM models (Datasets, Cases, Actions, Events)
│   │   └── session.py                # Database session management
│   ├── intelligence/                 # Root Cause & Priority Engines
│   │   ├── priority.py               # Risk scoring (0–100) & severity buckets
│   │   ├── root_cause.py             # Rule-based hypothesis generation
│   │   └── timeline.py               # Evidence timeline synthesis
│   └── pipeline/                     # Unified Pipeline & Evaluation
│       ├── evaluation.py             # Ground-truth evaluation runner & proof report generator
│       └── unified.py                # Unified 3-way reconciliation pipeline
└── tests/                            # Comprehensive Automated Test Suite (79 Tests)
    ├── test_agent.py                 # Agent actions & whitelist validation
    ├── test_api.py                   # API routes & case management
    ├── test_copilot.py               # Copilot guardrails & JSON normalization
    ├── test_database.py              # SQLAlchemy persistence & cascades
    ├── test_demo.py                  # Demo orchestration & AI failure fallback
    ├── test_evaluation.py            # Ground truth metric calculations
    ├── test_hypothesis.py            # Root-cause hypotheses
    ├── test_matching.py              # Deterministic 3-way reconciliation logic
    ├── test_memory.py                # Similarity & case memory
    ├── test_phase11.py               # Audit logs, pagination, filters, annotations
    ├── test_pipeline.py              # Unified pipeline integration
    ├── test_presets.py               # Preset CSV mappings
    ├── test_resolution.py            # Resolution recommendations
    ├── test_root_cause.py            # Root cause decision trees
    ├── test_timeline.py              # Evidence timelines
    └── test_upload.py                # CSV upload & parsing tests
```

---

## 📚 Documentation Index

For deep-dive technical reviews, refer to the dedicated documentation files:

- 🏗️ **[System Architecture](docs/ARCHITECTURE.md)**: Detailed breakdown of the multi-source ingestion layer, 2-phase matching algorithm, database schema, and financial arithmetic guarantees.
- 🛡️ **[AI Boundary & Safety Framework](docs/AI_BOUNDARY.md)**: Complete specification of what AI is permitted and forbidden to do, schema guardrails, and human-in-the-loop gates.
- 📊 **[Evaluation & Benchmarks](docs/EVALUATION.md)**: Synthetic data generation, confusion matrix formulation, throughput benchmarks, and the "Honestly Unresolved" philosophy.
- 🏆 **[Buildathon Submission Guide](docs/BUILDATHON.md)**: Track 04 compliance matrix and 2-minute step-by-step judge verification walkthrough.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
