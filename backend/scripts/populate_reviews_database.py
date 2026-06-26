import os
import json
import random
import argparse
import requests
import time
import re
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

# Setup paths relative to script
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
load_dotenv(SCRIPT_DIR.parent / ".env")

from helper.firebase_tool import get_firebase_id_token

# --- CONFIG ---
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME") or "test"
PHONE_COLLECTION = os.getenv("PHONE_COLLECTION") or "phones"
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
API_BASE_URL = "http://localhost:5001/api/phones"

def clear_all_reviews(db):
    """Wipes the reviews collection and resets phone metadata to zero."""
    print("Clearing existing reviews and resetting phone metadata...")
    
    # Delete all reviews
    rev_result = db.reviews.delete_many({})
    
    # Reset all phone metadata fields to default/empty state
    phone_result = db.phones_test2.update_many({}, {
        "$set": {
            "totalReviews": 0,
            "aggregateRating": 0,
            "categoryAverages": {
                "camera": 0,
                "battery": 0,
                "design": 0,
                "performance": 0,
                "value": 0
            },
            "sentimentSummary": {
                "pros": [],
                "cons": [],
                "totalAnalyzed": 0
            }
        }
    })
    
    print(f"   Deleted {rev_result.deleted_count} reviews.")
    print(f"   Reset metadata for {phone_result.modified_count} phones.")

def get_phone_profile(phone):
    """
    Categorizes the phone so we can match it with template tags.
    """
    tags = ["general"]
    price = phone.get("price", 500)
    brand = phone.get("manufacturer", "").lower()

    if price > 800: tags.append("premium")
    if price < 350: tags.append("budget")
    
    # Specific brand targeting
    if brand in ["asus", "xiaomi", "poco"]: tags.append("gaming")
    if brand in ["apple", "google", "samsung"]: tags.append("software")
    if brand in ["sony", "huawei"]: tags.append("camera")
    return tags

def get_target_sentiment(phone):
    """
    Decides if this phone should generally be liked, hated, or mixed.
    This is what breaks the 3.5 average.
    """
    brand = phone.get("manufacturer", "").lower()
    price = phone.get("price", 500)

    # High-end flagships usually get Positive/Mixed (High expectations)
    # Budget Kings (Poco/Redmi) get Positive
    # Overpriced old tech gets Negative
    if brand in ["apple", "samsung", "google"]:
        return random.choices(["positive", "mixed"], weights=[0.7, 0.3])[0]
    if brand in ["nothing", "poco"] and price < 500:
        return "positive"
    if price > 1200:
        return "mixed" # Diminishing returns leads to critical reviews
    return random.choice(["positive", "mixed", "negative"])

def apply_hardware_constraints(phone, template_ratings):
    dynamic_ratings = template_ratings.copy()
    specs = phone.get("specs", {})
    price = phone.get("price", 500)

    # --- BATTERY & CHARGING ---
    battery_info = specs.get("battery", {})
    mah = battery_info.get("capacitymAH", 4500)
    watts = battery_info.get("chargingSpeedW", 25)

    if mah < 3500:
        dynamic_ratings["battery"] = min(2, dynamic_ratings["battery"])
    elif mah >= 5200:
        dynamic_ratings["battery"] = min(5, dynamic_ratings["battery"] + 1)

    if watts < 20:
        dynamic_ratings["battery"] = min(3, dynamic_ratings["battery"])
    elif watts >= 80:
        dynamic_ratings["battery"] = min(5, dynamic_ratings["battery"] + 1)

    # --- CAMERA CONSTRAINTS ---
    # Path example: specs.camera.mainCameraMegapixels
    camera_info = specs.get("camera", {})
    mp = camera_info.get("mainMegapixels", 12)
    
    if mp < 13: 
        # Old/Budget sensors
        dynamic_ratings["camera"] = min(2, dynamic_ratings["camera"])
    elif mp >= 108:
        # High-res bonus
        dynamic_ratings["camera"] = min(5, dynamic_ratings["camera"] + 1)

    # --- PERFORMANCE & PRICE CONSTRAINTS ---
    if price < 250:
        # Budget hardware performance cap
        dynamic_ratings["performance"] = min(3, dynamic_ratings["performance"])
    elif price > 1100 and dynamic_ratings["performance"] < 4:
        dynamic_ratings["value"] = min(2, dynamic_ratings["value"])

    # --- DISPLAY / DESIGN CONSTRAINTS ---
    display_info = specs.get("display", {})
    refresh_rate = display_info.get("refreshRateHz") or 60
    if refresh_rate <= 60 and price > 700:
        dynamic_ratings["design"] = min(3, dynamic_ratings["design"])
        dynamic_ratings["value"] = min(2, dynamic_ratings["value"])

    # --- RAM CONSTRAINTS ---
    perf_data = specs.get("performance", {})
    ram_data = perf_data.get("ram", {})
    ram_options = ram_data.get("options", [])
    
    max_ram = 8 # Default fallback
    if ram_options:
        parsed_rams = []
        for opt in ram_options:
            if isinstance(opt, (int, float)):
                parsed_rams.append(opt)
            elif isinstance(opt, str):
                # Extract digits (e.g., "12GB" -> 12)
                nums = re.findall(r'\d+', opt)
                if nums: parsed_rams.append(int(nums[0]))
        
        if parsed_rams:
            max_ram = max(parsed_rams)

    # Anything 4GB or less is a performance bottleneck
    if max_ram <= 4:
        dynamic_ratings["performance"] = min(2, dynamic_ratings["performance"])
    elif max_ram >= 16:
        # High-end multitasking bonus
        dynamic_ratings["performance"] = min(5, dynamic_ratings["performance"] + 1)

    # --- BUILD MATERIAL PENALTY ---
    build_material = specs.get("design", {}).get("buildMaterials", "glass").lower()
    if price > 800 and "plastic" in build_material:
        dynamic_ratings["design"] = min(2, dynamic_ratings["design"])
        dynamic_ratings["value"] = min(2, dynamic_ratings["value"])
    return dynamic_ratings

def run_api_seeder(chance, clear):
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Handle clearing database first if clear flag
    if clear:
        clear_all_reviews(db)

    # Load templates and accounts
    with open(DATA_DIR / "test_accounts.txt", "r") as f:
        accounts_list = [line.strip().split(" ") for line in f if line.strip()]
    with open(DATA_DIR / "review_templates.txt", "r") as f:
        templates = json.load(f)

    # We store tokens in a dictionary: { "email": "token_string" }
    print("Logging into test accounts and caching tokens...")
    token_cache = {}
    for email, password in accounts_list:
        token = get_firebase_id_token(email, password)
        if token:
            token_cache[email] = token
            print(f"   Token cached for {email}")
        time.sleep(0.5) # Sleep to rate limit on firebase

    if not token_cache:
        print("Could not authenticate any users. Quota might still be exceeded.")
        return

    # Fetch more fields to allow for smart tagging
    phones = list(db[PHONE_COLLECTION].find({}, {"id": 1, "name": 1, "price": 1, "manufacturer": 1, "specs": 1}))
    print(f"\nStarting smart injection for {len(phones)} phones...")

    success_count = 0

    for phone in phones:
        p_id = phone["id"]
        profile_tags = get_phone_profile(phone)
        target_sentiment = get_target_sentiment(phone)
        
        print(f"--> {phone['name']} | Vibe: {target_sentiment} | Tags: {profile_tags}")

        for email, _ in accounts_list:
            if random.random() > chance:
                continue

            token = token_cache.get(email)
            if not token: continue

            # Match sentiment and ensure context is relevant
            eligible = [
                t for t in templates 
                if t["sentiment"] == target_sentiment and 
                any(tag in profile_tags for tag in t["tags"])
            ]

            if not eligible:
                eligible = [t for t in templates if t["sentiment"] == target_sentiment]

            tmpl = random.choice(eligible)
            final_ratings = apply_hardware_constraints(phone, tmpl["ratings"])
            payload = {
                "title": tmpl["title"],
                "review": tmpl["review"],
                "categoryRatings": final_ratings, 
            }
            
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            
            try:
                response = requests.post(f"{API_BASE_URL}/{p_id}/reviews", json=payload, headers=headers)
                if response.status_code == 201:
                    success_count += 1
                elif response.status_code == 409:
                    print(f"      {email.split('@')[0]} already reviewed.")
            except Exception as e:
                print(f"      Request failed: {e}")
            time.sleep(0.05) 

    print(f"\nInjected {success_count} reviews.")
    client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed reviews via Node.js API with token caching.")
    parser.add_argument("--chance", type=float, default=0.6, help="Chance (0.0 to 1.0) that a user reviews a phone")
    parser.add_argument("--clear", action="store_true", help="Clear all reviews and reset phone stats before seeding")
    args = parser.parse_args()

    if not FIREBASE_WEB_API_KEY:
        print("FIREBASE_WEB_API_KEY is missing from .env")
    else:
        run_api_seeder(args.chance, args.clear)
