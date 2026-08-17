import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv()

# Database URL configuration (Defaults to SQLite for local development, switchable to MySQL/cPanel)
default_sqlite = "sqlite:///tmp/iqac_ims.db" if os.getenv("VERCEL") else "sqlite:///./iqac_ims.db"
DATABASE_URL = os.getenv("DATABASE_URL", default_sqlite)

# For SQLite, we need connect_args={"check_same_thread": False}
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # For MySQL or other production databases (Optimized for shared cPanel hosting limits)
    engine = create_engine(
        DATABASE_URL,
        pool_size=2,
        max_overflow=5,
        pool_recycle=300,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
