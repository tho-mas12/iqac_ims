import sys
import os
import traceback

sys.path.insert(0, os.getcwd())
file_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(file_dir)
sys.path.insert(0, parent_dir)

try:
    try:
        from backend.main import app
    except ImportError:
        from frontend.backend.main import app
    app = app
except Exception as e:
    err_msg = str(e)
    err_tb = traceback.format_exc()
    from fastapi import FastAPI
    app = FastAPI()
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    def catch_err(path: str = ""):
        return {"error": err_msg, "traceback": err_tb}
