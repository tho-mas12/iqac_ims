import sys
import os

sys.path.insert(0, os.getcwd())
file_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(file_dir)
sys.path.insert(0, parent_dir)

try:
    from backend.main import app
except ImportError:
    from frontend.backend.main import app

app = app
