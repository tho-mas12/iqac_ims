import os
import jwt
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SJC IQAC-IMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-iqac-ims-key-2026")
ALGORITHM = "HS256"

class UserLogin(BaseModel):
    username: str
    password: str

@app.get("/api")
@app.get("/api/")
def root():
    return {"status": "online", "system": "SJC IQAC-IMS API"}

@app.post("/api/auth/login")
@app.post("/auth/login")
def login(data: UserLogin):
    if data.username.strip() == "admin" and data.password.strip() == "admin123":
        token_data = {
            "sub": "admin",
            "role": "Admin",
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "Admin",
            "username": "admin"
        }
    raise HTTPException(status_code=401, detail="Incorrect username or password")
