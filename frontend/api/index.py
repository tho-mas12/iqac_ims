import sys
import os

# Add project root directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app

# Export FastAPI app for Vercel Serverless Function inside frontend directory
app = app
