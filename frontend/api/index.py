import sys
import os

cwd = os.getcwd()
if cwd not in sys.path:
    sys.path.insert(0, cwd)

file_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(file_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from backend.main import app
except ImportError:
    from frontend.backend.main import app

app = app
