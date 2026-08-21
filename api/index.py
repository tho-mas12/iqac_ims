import sys
import os

cwd = os.getcwd()
if cwd not in sys.path:
    sys.path.insert(0, cwd)

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.main import app

app = app
