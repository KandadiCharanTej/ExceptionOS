from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from exceptionos.database.models import Base
from pathlib import Path
import os

# Create data directory if it doesn't exist
base_dir = Path(__file__).resolve().parents[3]
data_dir = base_dir / "data"
os.makedirs(data_dir, exist_ok=True)

db_path = data_dir / "exceptionos.sqlite"
DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
