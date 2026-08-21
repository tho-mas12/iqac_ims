import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from .env file
load_dotenv()

# Database URL configuration (Defaults to SQLite for local development, switchable to MySQL/cPanel)
default_db = "mysql+pymysql://freewmbl_ims_user:sjcIQAC-IMS26@192.185.129.21/freewmbl_iqac_ims" if os.getenv("VERCEL") else "sqlite:///./iqac_ims.db"
DATABASE_URL = os.getenv("DATABASE_URL", default_db)

from sqlalchemy.pool import NullPool

# For SQLite, we need connect_args={"check_same_thread": False}
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
elif os.getenv("VERCEL"):
    # For Vercel Serverless Functions, use NullPool with connection timeout
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        connect_args={"connect_timeout": 10}
    )
else:
    # For persistent server processes (Optimized for shared cPanel hosting limits)
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
    try:
        from backend.main import ensure_db_initialized
        ensure_db_initialized()
    except Exception as e:
        print("get_db lazy init warning:", e)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
