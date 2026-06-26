import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    mongo_uri: str
    mongo_db: str
    mongo_collection: str

    user_agent: str
    request_timeout_seconds: int
    request_retries: int
    request_delay_seconds: float


def get_settings() -> Settings:
    return Settings(
        mongo_uri=os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        mongo_db=os.getenv("MONGO_DB", "test"),
        mongo_collection=os.getenv("SCRAPE_COLLECTION", "scrape_output"),
        user_agent=os.getenv("USER_AGENT", "Mozilla/5.0 (compatible; PhoneSpecBot/1.0)"),
        request_timeout_seconds=int(os.getenv("REQUEST_TIMEOUT_SECONDS", "20")),
        request_retries=int(os.getenv("REQUEST_RETRIES", "3")),
        request_delay_seconds=float(os.getenv("REQUEST_DELAY_SECONDS", "0.4")),
    )