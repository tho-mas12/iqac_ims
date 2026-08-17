import sys
import os

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.main import app
    app = app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI()
    @app.all("/{path:path}")
    def error_handler(path: str):
        return {"error": f"Serverless initialization error: {str(e)}"}
