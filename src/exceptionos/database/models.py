import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False) # e.g. "TRAINING" or "UPLOAD"
    status = Column(String, default="COMPLETED")
    total_cases = Column(Integer, default=0)
    matched_cases = Column(Integer, default=0)
    exception_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    cases = relationship("CaseRecord", back_populates="dataset", cascade="all, delete-orphan")

class CaseRecord(Base):
    __tablename__ = "cases"
    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    key = Column(String, nullable=False)
    classification = Column(String, nullable=False)
    is_duplicate = Column(Boolean, default=False)
    analyst_classification = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    
    # Store the transaction info as JSON dicts
    ledger_txn = Column(JSON, nullable=True)
    gateway_txn = Column(JSON, nullable=True)
    bank_txn = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dataset = relationship("Dataset", back_populates="cases")
    events = relationship("CaseEvent", back_populates="case_record", cascade="all, delete-orphan", order_by="CaseEvent.created_at")
    resolutions = relationship("ResolutionRecord", back_populates="case_record", cascade="all, delete-orphan")
    verifications = relationship("VerificationRecord", back_populates="case_record", cascade="all, delete-orphan")

class CaseEvent(Base):
    __tablename__ = "case_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    event_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case_record = relationship("CaseRecord", back_populates="events")

class ResolutionRecord(Base):
    __tablename__ = "resolutions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    action_taken = Column(String, nullable=False)
    root_cause = Column(String, nullable=False)
    approved_by = Column(String, nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case_record = relationship("CaseRecord", back_populates="resolutions")

class VerificationRecord(Base):
    __tablename__ = "verifications"
    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    status = Column(String, nullable=False)
    explanation = Column(String, nullable=False)
    verified_at = Column(DateTime, default=datetime.utcnow)
    
    case_record = relationship("CaseRecord", back_populates="verifications")

class AIInteraction(Base):
    __tablename__ = "ai_interactions"
    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, nullable=True)
    case_id = Column(String, nullable=True)
    user_message = Column(String, nullable=False)
    context_summary = Column(String, nullable=False)
    ai_response = Column(JSON, nullable=False)
    provider = Column(String, nullable=False)
    model_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"
    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, nullable=False)
    total_records = Column(Integer, default=0)
    matched_records = Column(Integer, default=0)
    exception_records = Column(Integer, default=0)
    processing_time_ms = Column(Float, default=0.0)
    throughput = Column(Float, default=0.0)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    auto_resolved = Column(Integer, default=0)
    unresolved = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class AgentAction(Base):
    __tablename__ = "agent_actions"
    id = Column(String, primary_key=True, default=generate_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False)
    recommended_action = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    risk_level = Column(String, nullable=False)
    requires_approval = Column(Boolean, default=True)
    status = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)

    case_record = relationship("CaseRecord", backref="agent_actions")
