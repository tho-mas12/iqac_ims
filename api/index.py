import sys
import os

# Add root directory to python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.main import app

# Export ASGI app for Vercel Serverless Python
app = app
