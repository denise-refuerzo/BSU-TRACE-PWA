import os
from pathlib import Path
from dotenv import load_dotenv

# Look for .env in ml-engine, or in its parent directory (backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    ML_DATABASE_URL: str = os.getenv("ML_DATABASE_URL") or os.getenv("DATABASE_URL")

settings = Settings()