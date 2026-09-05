from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from exceptionos.database.models import Base
from pathlib import Path
import os

def get_repo_root() -> Path:
    """Find repository root dynamically across local, container, and nested environments."""
    curr = Path(__file__).resolve().parent
    for _ in range(5):
        if (curr / "pyproject.toml").exists() or (curr / "data" / "demo").exists():
            return curr
        curr = curr.parent
    return Path(__file__).resolve().parents[3]

base_dir = get_repo_root()
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
