from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)

class Settings(BaseModel):
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    mongo_db: str = os.getenv("DB_NAME", "test")
    mongo_collection: str = os.getenv("SCRAPE_COLLECTION", "scrape_output")
    max_candidates: int = int(os.getenv("MAX_CANDIDATES", "200"))

settings = Settings()