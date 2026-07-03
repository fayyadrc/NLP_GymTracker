import os
from dotenv import load_dotenv

# backend/app/core -> backend/
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# repo root (parent of backend/)
_root_dir = os.path.dirname(_backend_dir)

_env_files = (
    os.path.join(_backend_dir, ".env"),
    os.path.join(_root_dir, ".env"),
    os.path.join(_root_dir, ".env.local"),
    os.path.join(_backend_dir, ".env.local"),
)

for env_path in _env_files:
    if os.path.exists(env_path):
        print(f"Loading env from: {env_path}")
        load_dotenv(dotenv_path=env_path, override=True)
