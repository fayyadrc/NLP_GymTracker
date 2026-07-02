import os
from dotenv import load_dotenv

# Resolve path to backend/.env (3 levels up from backend/app/core/dotenv_loader.py)
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_env_path = os.path.join(_backend_dir, ".env")

print(f"Loading env from: {_env_path}")
load_dotenv(dotenv_path=_env_path)
