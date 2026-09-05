# ExceptionOS — Razorpay AI Buildathon Submission Guide
## Track 04: AI Finance Controller

This document provides the official submission mapping and verification walkthrough for the **Razorpay AI Buildathon — Track 04: AI Finance Controller**.

---

## 1. Track 04 Requirements Compliance Matrix

| Track 04 Requirement | ExceptionOS Implementation | Verified Code Reference |
| :--- | :--- | :--- |
| **Multi-Source Financial Ingestion** | Ingests Internal Ledger, Payment Gateway, and Bank Settlement records with automatic schema detection and preset mapping. | [`src/exceptionos/loaders.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/loaders.py)<br>[`src/exceptionos/presets.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/presets.py) |
| **Deterministic 3-Way Reconciliation** | Pure mathematical reconciliation engine. Phase 1 (Ledger ↔ Gateway), Phase 2 (Gateway ↔ Bank). Uses `Decimal` arithmetic for exactness and configurable tolerance/date windows. | [`src/exceptionos/matching.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/matching.py)<br>[`src/exceptionos/pipeline/unified.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/pipeline/unified.py) |
| **Exception Detection & Taxonomy** | Categorizes financial discrepancies into 7 distinct types: `amount_mismatch`, `unmatched_left`, `unmatched_right`, `duplicate`, `timing_issue`, `date_mismatch`, and `unknown`. | [`src/exceptionos/models.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/models.py)<br>[`src/exceptionos/matching.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/matching.py) |
| **Root Cause & Priority Intelligence** | Rule-based hypothesis generation (e.g. Gateway Fee, Settlement Delay, Missing Bank Deposit) paired with priority scoring (0–100) based on financial exposure and SLA risk. | [`src/exceptionos/intelligence/root_cause.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/intelligence/root_cause.py)<br>[`src/exceptionos/intelligence/priority.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/intelligence/priority.py) |
| **Bounded AI Copilot & Agent** | AI is strictly an operational assistant. Constrained to whitelisted actions (`ALLOWED_ACTIONS`). Enforces Pydantic schema validation and automatic fallback to human review on failure. | [`src/exceptionos/ai/copilot.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/ai/copilot.py)<br>[`src/exceptionos/ai/agent.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/ai/agent.py)<br>[`src/exceptionos/ai/guardrails.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/ai/guardrails.py) |
| **Human-in-the-Loop Governance** | Any action with high or critical risk automatically requires human analyst approval. Financial write-offs and ledger adjustments cannot be autonomously executed by AI. | [`src/exceptionos/ai/agent.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/ai/agent.py)<br>[`src/exceptionos/database/models.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/database/models.py) |
| **Batch Processing (50+ Records)** | Synthetic generator produces batches of 50 to 1,000+ realistic multi-source records with injected anomalies and verified ground truth labels. | [`src/exceptionos/data_generator/generator.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/data_generator/generator.py) |
| **Performance Benchmarking** | Calculates Precision, Recall, Accuracy, F1 Score, Processing Latency (ms), and Throughput (records/sec). Outputs formal Buildathon Proof Report. | [`src/exceptionos/pipeline/evaluation.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/pipeline/evaluation.py) |
| **Honest Unresolved Exceptions** | Does not hide or artificially auto-resolve complex cases. Unresolved exceptions remain explicitly surfaced in both API reports and the UI dashboard. | [`src/exceptionos/pipeline/evaluation.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/pipeline/evaluation.py)<br>[`frontend/src/pages/Performance.tsx`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/frontend/src/pages/Performance.tsx) |
| **Immutable Audit Trail** | Every reconciliation run, status change, manual override, AI interaction, and analyst approval is permanently logged with timestamps and actors. | [`src/exceptionos/database/models.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/database/models.py)<br>[`src/exceptionos/api/services.py`](file:///c:/Users/Kandadi%20Charan%20Tej/OneDrive/Desktop/openrecon-main/openrecon-main/src/exceptionos/api/services.py) |

---

## 2. Step-by-Step Judge Verification Walkthrough

You can verify the entire ExceptionOS system in under 2 minutes using either the web application or the backend API.

### Method A: Interactive Web UI Walkthrough (Recommended)

1. **Start the Application**:
   ```bash
   # Terminal 1: Backend
   python -m uvicorn exceptionos.api.main:app --port 8000

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```
2. **Open the App**: Navigate to `http://localhost:5173/`.
3. **Run the Buildathon Demo**:
   - In the sidebar, click on **Buildathon Demo** (`/demo`) or **Performance** (`/performance`).
   - Select the **Scenario**: `EXCEPTION_SPIKE` or `NORMAL_RECONCILIATION`.
   - Set Record Count to **100 records** (exceeds the 50+ requirement).
   - Click **Run Full Ops Loop**.
4. **Observe the Results**:
   - **System Performance**: Review Match Rate, Precision (100%), Recall (100%), F1 Score (100%), and Throughput (> 4,000 rec/sec).
   - **Buildathon Proof Report**: Inspect the machine-generated text proof report.
   - **Honestly Unresolved**: Review the table of unresolved cases, each with its root-cause classification, calculated priority score, and recommended AI action.
5. **Inspect an Exception**:
   - Click on any unresolved case to open the **Investigation Workspace** (`/investigation/:id`).
   - View the 3-way record comparison (Ledger vs. Gateway vs. Bank), root cause reasoning, and audit timeline.
   - Click **Approve** or **Reject** on the AI recommended action to observe human-in-the-loop governance.
6. **Chat with Bounded Copilot**:
   - Click **AI Copilot** in the sidebar.
   - Ask: *"Why is transaction TXN-888-00004 unresolved?"*
   - Observe how the copilot cites only verified facts from the database and highlights the appropriate operational next step.

---

### Method B: Automated CLI & API Verification

1. **Execute the Full Test Suite**:
   ```bash
   python -m pytest -v
   ```
   *Expected Output: 79 passed, 0 failed.*

2. **Trigger Evaluation Run via Curl**:
   ```bash
   curl -X POST "http://localhost:8000/api/evaluation/run?scenario_type=EXCEPTION_SPIKE&num_records=100"
   ```
   *Response includes `dataset_id`, `precision`, `recall`, `f1_score`, and `throughput`.*

3. **Fetch the Buildathon Proof Report**:
   ```bash
   curl -X GET "http://localhost:8000/api/evaluation/{DATASET_ID}/report"
   ```

4. **Verify AI Health & Offline Fallback**:
   ```bash
   curl -X GET "http://localhost:8000/api/health/ai"
   ```
   *Returns status: `MOCK_MODE` or `AVAILABLE`.*
