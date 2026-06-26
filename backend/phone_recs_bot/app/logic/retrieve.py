from app.db import get_collection
from app.config import settings
from app.models.prefs import PreferenceProfile


def _usd_min_from_doc(doc: dict) -> float | None:
    price = doc.get("price")
    if isinstance(price, (int, float)):
        return float(price)
    return None


async def retrieve_candidates(profile: PreferenceProfile) -> list[dict]:
    col = get_collection()

    q: dict = {}

    # Platform from new schema
    if profile.platform == "ios":
        q["specs.performance.operatingSystem.raw"] = {
            "$regex": r"\bios\b|iphone",
            "$options": "i",
        }
    elif profile.platform == "android":
        q["specs.performance.operatingSystem.raw"] = {
            "$regex": r"android",
            "$options": "i",
        }

    # 5G from new schema
    if profile.must_5g is True:
        q["specs.connectivity.has5G"] = True

    # Refresh rate from new schema
    if profile.min_refresh_hz is not None:
        q["specs.display.refreshRateHz"] = {"$gte": profile.min_refresh_hz}

    # Display size from new schema
    if profile.min_display_in is not None or profile.max_display_in is not None:
        rng = {}
        if profile.min_display_in is not None:
            rng["$gte"] = profile.min_display_in
        if profile.max_display_in is not None:
            rng["$lte"] = profile.max_display_in
        q["specs.display.screenSizeInches"] = rng

    # Avoid brands from new schema
    if profile.avoid_brands:
        q["manufacturer"] = {"$nin": profile.avoid_brands}

    cursor = col.find(q).sort("updatedAt", -1).limit(settings.max_candidates)
    docs = await cursor.to_list(length=settings.max_candidates)

    # Budget filter from new schema
    if profile.budget.max_amount is not None and profile.budget.currency.upper() == "USD":
        filtered = []
        for d in docs:
            usd_min = _usd_min_from_doc(d)
            if usd_min is None or usd_min <= profile.budget.max_amount:
                filtered.append(d)
        docs = filtered

    return docs