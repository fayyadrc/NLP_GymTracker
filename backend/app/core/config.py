import os
from . import dotenv_loader

class Settings:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

settings = Settings()
