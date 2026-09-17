import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dragoncode.db")

# SQLite necesita este argumento extra para funcionar con FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}


def _pool_recycle_seconds() -> int:
    try:
        return max(60, int(os.getenv("DATABASE_POOL_RECYCLE_SECONDS", "300")))
    except ValueError:
        return 300

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=_pool_recycle_seconds(),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
