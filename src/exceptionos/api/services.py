from typing import List, Dict, Optional
from datetime import date
from decimal import Decimal
import math

from exceptionos.pipeline.unified import UnifiedCase
from exceptionos.models import Transaction
from exceptionos.resolution.resolution import ResolutionAction
from exceptionos.database import SessionLocal, Dataset, CaseRecord, CaseEvent, ResolutionRecord, VerificationRecord

class InvestigationService:
    
    def _deserialize_txn(self, data: dict) -> Optional[Transaction]:
        if not data:
            return None
        return Transaction(
            source=data.get("source"),
            key=data.get("key"),
            amount=Decimal(str(data.get("amount", 0))),
            currency=data.get("currency"),
            date=date.fromisoformat(data["date"]) if data.get("date") else None,
            row=data.get("row", {}),
            line=data.get("line", 0)
        )
        
    def _serialize_txn(self, txn: Optional[Transaction]) -> Optional[dict]:
        if not txn:
            return None
        return {
            "source": txn.source,
            "key": txn.key,
            "amount": float(txn.amount),
            "currency": txn.currency,
            "date": txn.date.isoformat() if txn.date else None,
            "row": txn.row,
            "line": txn.line
        }
        
    def _to_unified_case(self, record: CaseRecord) -> UnifiedCase:
        case = UnifiedCase(
            key=record.key,
            ledger_txn=self._deserialize_txn(record.ledger_txn),
            gateway_txn=self._deserialize_txn(record.gateway_txn),
            bank_txn=self._deserialize_txn(record.bank_txn),
            is_duplicate=record.is_duplicate
        )
        # Attach analyst annotations to the case object for downstream use
        case.analyst_classification = record.analyst_classification
        case.notes = record.notes
        case.tags = record.tags
        return case
        
    def create_dataset(self, name: str, source_type: str, cases: List[UnifiedCase]) -> str:
        with SessionLocal() as db:
            total = len(cases)
            matched = sum(1 for c in cases if c.classification == "matched")
            exceptions = total - matched
            
            dataset = Dataset(
                name=name,
                source_type=source_type,
                total_cases=total,
                matched_cases=matched,
                exception_count=exceptions
            )
            db.add(dataset)
            db.flush() # get dataset.id
            
            records = []
            events = []
            for c in cases:
                rec = CaseRecord(
                    dataset_id=dataset.id,
                    key=c.key,
                    classification=c.classification,
                    is_duplicate=c.is_duplicate,
                    ledger_txn=self._serialize_txn(c.ledger_txn),
                    gateway_txn=self._serialize_txn(c.gateway_txn),
                    bank_txn=self._serialize_txn(c.bank_txn)
                )
                db.add(rec)
                db.flush()
                
                event = CaseEvent(
                    case_id=rec.id,
                    event_type="CASE_CREATED",
                    description=f"Case automatically created and classified as {c.classification}"
                )
                events.append(event)
                
            db.add_all(events)

            db.commit()
            return dataset.id
            
    def get_latest_dataset(self) -> Optional[Dataset]:
        with SessionLocal() as db:
            return db.query(Dataset).order_by(Dataset.created_at.desc()).first()
            
    def get_dataset(self, dataset_id: str) -> Optional[Dataset]:
        with SessionLocal() as db:
            return db.query(Dataset).filter(Dataset.id == dataset_id).first()
            
    def get_datasets(self) -> List[Dataset]:
        with SessionLocal() as db:
            return db.query(Dataset).order_by(Dataset.created_at.desc()).all()

    def get_cases_for_dataset(self, dataset_id: str) -> List[UnifiedCase]:
        with SessionLocal() as db:
            records = db.query(CaseRecord).filter(CaseRecord.dataset_id == dataset_id).all()
            return [self._to_unified_case(r) for r in records]
            
    def get_case(self, case_id: str, dataset_id: Optional[str] = None) -> Optional[UnifiedCase]:
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                # Fallback to the latest dataset containing this key
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                return None
            return self._to_unified_case(record)
            
    def record_action(self, action: ResolutionAction, dataset_id: Optional[str] = None):
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == action.case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                raise ValueError(f"Case {action.case_id} not found")
                
            res = ResolutionRecord(
                case_id=record.id,
                action_taken=action.action_taken,
                root_cause=action.root_cause,
                approved_by=action.approved_by,
                status=action.status
            )
            db.add(res)
            
            event = CaseEvent(
                case_id=record.id,
                event_type="RESOLUTION_APPLIED",
                description=f"Action '{action.action_taken}' applied by {action.approved_by}"
            )
            db.add(event)
            db.commit()
            
    def get_action(self, case_id: str, dataset_id: Optional[str] = None) -> Optional[ResolutionAction]:
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                return None
                
            res = db.query(ResolutionRecord).filter(ResolutionRecord.case_id == record.id).order_by(ResolutionRecord.created_at.desc()).first()
            if not res:
                return None
                
            return ResolutionAction(
                case_id=case_id,
                root_cause=res.root_cause,
                action_taken=res.action_taken,
                approved_by=res.approved_by,
                timestamp=res.created_at,
                status=res.status
            )
            
    def get_case_events(self, case_id: str, dataset_id: Optional[str] = None) -> List[dict]:
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                return []
                
            events = db.query(CaseEvent).filter(CaseEvent.case_id == record.id).order_by(CaseEvent.created_at.asc()).all()
            return [{"event_type": e.event_type, "description": e.description, "timestamp": e.created_at.isoformat()} for e in events]

    def update_case_annotations(self, case_id: str, analyst_classification: Optional[str] = None, notes: Optional[str] = None, tags: Optional[List[str]] = None, dataset_id: Optional[str] = None) -> Optional[dict]:
        """Update analyst annotation fields for a case. Returns annotation dict if updated, None if not found."""
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                return None

            changes = []
            if analyst_classification is not None:
                record.analyst_classification = analyst_classification
                changes.append(f"analyst_classification={analyst_classification}")
            if notes is not None:
                record.notes = notes
                changes.append(f"notes updated")
            if tags is not None:
                record.tags = tags
                changes.append(f"tags={','.join(tags)}")

            # Create audit event
            event = CaseEvent(
                case_id=record.id,
                event_type="ANALYST_ANNOTATION_UPDATED",
                description=f"Analyst annotations updated: {'; '.join(changes)}"
            )
            db.add(event)
            db.commit()
            db.refresh(record)

            return {
                "case_id": record.key,
                "analyst_classification": record.analyst_classification,
                "notes": record.notes,
                "tags": record.tags,
            }

    def delete_case(self, case_id: str, dataset_id: Optional[str] = None) -> bool:
        """Hard delete a case and cascade delete related events, resolutions, verifications. Returns True if deleted."""
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                return False
            db.delete(record)
            db.commit()
            return True

    def bulk_delete_cases(self, case_ids: List[str], dataset_id: Optional[str] = None) -> int:
        """Delete multiple cases by key, returning the count of deleted records."""
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key.in_(case_ids))
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            records = q.all()
            count = len(records)
            for r in records:
                db.delete(r)
            db.commit()
            return count

    def export_cases(self, dataset_id: Optional[str] = None, classification: Optional[str] = None, search: Optional[str] = None, fmt: str = "csv") -> str:
        """Export cases as CSV or JSON string, respecting filters."""
        with SessionLocal() as db:
            query = db.query(CaseRecord)
            if dataset_id:
                query = query.filter(CaseRecord.dataset_id == dataset_id)
            if classification:
                if classification in ("exceptions", "actionable_exceptions"):
                    query = query.filter(CaseRecord.classification != "matched")
                else:
                    query = query.filter(CaseRecord.classification == classification)
            records = query.all()

            if search:
                lowered = search.lower()
                records = [r for r in records if lowered in r.key.lower()]

            if fmt == "json":
                import json
                data = []
                for r in records:
                    data.append({
                        "case_id": r.key,
                        "classification": r.classification,
                        "analyst_classification": r.analyst_classification,
                        "notes": r.notes,
                        "tags": r.tags,
                        "is_duplicate": r.is_duplicate,
                        "dataset_id": r.dataset_id,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                    })
                return json.dumps(data, default=str)

            # CSV format
            import csv, io
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["case_id", "classification", "analyst_classification", "notes", "tags", "is_duplicate", "dataset_id", "created_at"])
            for r in records:
                writer.writerow([
                    r.key,
                    r.classification,
                    r.analyst_classification or "",
                    r.notes or "",
                    ",".join(r.tags) if r.tags else "",
                    r.is_duplicate,
                    r.dataset_id,
                    r.created_at.isoformat() if r.created_at else "",
                ])
            return output.getvalue()

    def record_verification(self, case_id: str, status: str, explanation: str, dataset_id: Optional[str] = None):
        with SessionLocal() as db:
            q = db.query(CaseRecord).filter(CaseRecord.key == case_id)
            if dataset_id:
                q = q.filter(CaseRecord.dataset_id == dataset_id)
            else:
                q = q.order_by(CaseRecord.created_at.desc())
            record = q.first()
            if not record:
                return
                
            v = VerificationRecord(
                case_id=record.id,
                status=status,
                explanation=explanation
            )
            db.add(v)
            
            event = CaseEvent(
                case_id=record.id,
                event_type="VERIFICATION_COMPLETED",
                description=f"Verification status: {status}"
            )
            db.add(event)
            db.commit()
            
    def delete_dataset(self, dataset_id: str) -> bool:
        """Hard delete a dataset and cascade delete related records.
        Returns True if deleted, False if not found.
        """
        with SessionLocal() as db:
            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
            if not dataset:
                return False
            db.delete(dataset)
            db.commit()
            return True
            
# Singleton instance for the prototype
investigation_service = InvestigationService()
