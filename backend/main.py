import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.database import engine, Base
from backend.router import router
from backend import models, auth
from backend.database import SessionLocal

app = FastAPI(title="SJC IQAC-IMS API", version="1.0.0")

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

# Initialize database tables and seed default admin user (runs on serverless module load)
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
            print("Default admin account seeded successfully (admin/admin123)")
            
            # Seed default titles and checklists for quick demonstration
            if db.query(models.Title).count() == 0:
                sample_title = models.Title(
                    name="SJC Academic Audit 2026",
                    description="Institutional self-monitoring checklist for departmental audit, verification of registers, and syllabus progression."
                )
                db.add(sample_title)
                db.commit()
                
                questions = [
                    "Verify course plan completion registers and signature of HOD",
                    "Check departmental meeting minutes and resolution registry",
                    "Audit student feedback collection reports and action-taken files",
                    "Verify continuous assessment marksheets and parent communication registry",
                    "Verify research publication logs and proof folders of faculty members",
                ]
                for q_text in questions:
                    q = models.Question(title_id=sample_title.id, text=q_text)
                    db.add(q)
                    db.commit()
                    status = models.ChecklistStatus(question_id=q.id, is_checked=False)
                    db.add(status)
                db.commit()
                print("Seeded sample Title: 'SJC Academic Audit 2026' with 5 questions")
    except Exception as e:
        print("Error during database user seeding:", e)
    finally:
        db.close()
except Exception as e:
    print("Database startup exception:", e)

@app.get("/")
def read_root():
    return {"message": "SJC IQAC-IMS API is running"}
