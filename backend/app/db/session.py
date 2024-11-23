from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from typing import Generator

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={"connect_timeout": 60}
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency function that yields db sessions
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """
    Initialize database with required tables
    """
    from app.models.base import Base
    Base.metadata.create_all(bind=engine)

def check_db_connection() -> bool:
    """
    Test database connection
    """
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        return False
    finally:
        db.close()
