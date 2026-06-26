import os
import random
import argparse
import datetime
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv
from pathlib import Path

# --- SETUP ---
SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(SCRIPT_DIR.parent / ".env")

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME") or "test"
PHONE_COLLECTION = os.getenv("PHONE_COLLECTION") or "phones"

def apply_lifecycle_sentiment(ratings, days_since_release):
    """
    Simulates a product's lifecycle sentiment:
    0-30 days: 'Honeymoon Phase' (High Ratings)
    31-90 days: 'The Bug Discovery' (Dip in Ratings)
    91-200 days: 'The Optimization' (Ratings Recover)
    200+ days: 'Legacy Phase' (Stable/Neutral)
    """
    new_ratings = ratings.copy()
    jitter = 0
    
    if days_since_release <= 30:
        jitter = random.choices([0, 1], weights=[0.7, 0.3])[0] # 30% chance of +1
    elif 31 <= days_since_release <= 110:
        jitter = random.choices([0, -1, -2], weights=[0.5, 0.4, 0.1])[0] # Bug phase
    elif 111 <= days_since_release <= 250:
        jitter = random.choices([0, 1], weights=[0.8, 0.2])[0] # Recovery
    
    # Apply jitter to random categories
    for _ in range(abs(jitter)):
        cat = random.choice(list(new_ratings.keys()))
        if jitter > 0:
            new_ratings[cat] = min(5, new_ratings[cat] + 1)
        else:
            new_ratings[cat] = max(1, new_ratings[cat] - 1)
            
    return new_ratings

def fix_dates(days_back_limit):
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        reviews_col = db["reviews"]
        phones_col = db[PHONE_COLLECTION]

        # Map phone release dates
        phone_data = {p["id"]: p.get("releaseDate") for p in phones_col.find({}, {"id": 1, "releaseDate": 1})}
        reviews = list(reviews_col.find({}))
        
        if not reviews:
            print("No reviews found to fix.")
            return

        print(f"Simulating hype cycles for {len(reviews)} reviews...")

        bulk_ops = []
        now = datetime.datetime.now()

        for review in reviews:
            p_id = review.get("phoneId")
            
            # Get release date or fallback to 1 year ago
            release_raw = phone_data.get(p_id)
            if isinstance(release_raw, str):
                release_date = datetime.datetime.fromisoformat(release_raw.replace("Z", ""))
            elif isinstance(release_raw, datetime.datetime):
                release_date = release_raw
            else:
                release_date = now - datetime.timedelta(days=180)

            # Determine the window of time this phone has been 'alive'
            total_days_active = (now - release_date).days
            
            # Beta Distribution clustering
            if random.random() > 0.4:
                offset_percent = random.betavariate(0.5, 2) 
            else:
                offset_percent = random.betavariate(2, 0.5)

            days_offset = int(offset_percent * total_days_active)
            days_offset = max(0, min(days_offset, total_days_active))
            
            # Calculate the backdated createdAt
            new_date = release_date + datetime.timedelta(
                days=days_offset, 
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )

            # Apply the lifecycle sentiment drift
            original_ratings = review.get("categoryRatings", {})
            drifted_ratings = apply_lifecycle_sentiment(original_ratings, days_offset)

            bulk_ops.append(
                UpdateOne(
                    {"_id": review["_id"]},
                    {"$set": {
                        "createdAt": new_date,
                        "updatedAt": new_date,
                        "date": new_date,
                        "categoryRatings": drifted_ratings
                    }}
                )
            )

        if bulk_ops:
            reviews_col.bulk_write(bulk_ops)
            print("Completed.")
        else:
            print("No reviews updated.")

    except Exception as e:
        print(f"Migration Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Advanced Temporal Sentiment Simulator.")
    parser.add_argument("--days", type=int, default=365, help="Maximum lookback limit")
    args = parser.parse_args()
    
    fix_dates(args.days)