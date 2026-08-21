import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database import engine, Base
from backend.router import router
from backend import models, auth
from backend.database import SessionLocal

from fastapi.responses import JSONResponse
import traceback

app = FastAPI(
    title="SJC IQAC-IMS API",
    description="Institutional Monitoring System API for St. Joseph's College IQAC",
    version="1.0.0"
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "traceback": traceback.format_exc()}
    )

# Setup CORS middleware
# React 19 + Vite app runs on localhost:5173 by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For flexibility in development, refine for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static files directory
UPLOAD_DIR = "/tmp/uploads" if os.getenv("VERCEL") else os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include the main routing module (supports both /api/* and root path routing on Vercel)
app.include_router(router)
# Strip redundant /api prefix if Vercel strips /api in function rewrites
app.include_router(router, prefix="/api")

# Lazy initialization flag to ensure fast serverless module cold starts
_db_initialized = False

def ensure_db_initialized():
    global _db_initialized
    if not _db_initialized:
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                admin_user = db.query(models.User).filter(models.User.username == "admin").first()
                if not admin_user:
                    hashed_pwd = auth.get_password_hash("admin123")
                    default_admin = models.User(
                        username="admin",
                        password_hash=hashed_pwd,
                        role="Admin"
                    )
                    db.add(default_admin)
                    db.commit()
            except Exception as e:
                print("Admin seed check:", e)
            finally:
                db.close()
            _db_initialized = True
        except Exception as e:
            print("Lazy DB init check:", e)

@app.get("/")
def read_root():
    return {"message": "SJC IQAC-IMS API is running"}
