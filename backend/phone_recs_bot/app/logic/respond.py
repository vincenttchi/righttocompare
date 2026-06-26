from app.models.prefs import PreferenceProfile


def missing_questions(p: PreferenceProfile) -> list[str]:
    qs = []
    if p.budget.max_amount is None:
        qs.append("What’s your max budget (USD)?")
    if p.platform is None:
        qs.append("Do you prefer iPhone (iOS) or Android — or either is fine?")
    if not p.priorities:
        qs.append("What matters most: camera, battery, performance, display, or value?")
    return qs


def build_user_view(profile: PreferenceProfile, docs: list[dict]) -> dict:
    recs = []

    for i, d in enumerate(docs, 1):
        recs.append({
            "id": d.get("id"),
            "rank": i,
            "brand": d.get("manufacturer", "Unknown"),
            "model": d.get("name", "Unknown"),
            "score": d.get("_score"),
            "why": d.get("_why", [])[:3],
            "link": None,
        })

    return {
        "summary": "Here are the best phones based on your preferences.",
        "recommendations": recs,
        "next_step": "Want me to refine results, like best camera, best battery, or best value?"
    }


def build_dev_view(profile: PreferenceProfile, docs: list[dict]) -> dict:
    return {
        "parsed_preferences": {
            "budget": profile.budget.max_amount,
            "platform": profile.platform,
            "priorities": list(profile.priorities),
            "must_5g": profile.must_5g,
            "must_nfc": profile.must_nfc
        },
        "candidate_count": len(docs),
        "top_results": [
            {
                "model": d.get("name"),
                "brand": d.get("manufacturer"),
                "price": d.get("price"),
                "score": d.get("_score"),
                "score_breakdown": d.get("_score_breakdown"),
            }
            for d in docs[:5]
        ],
        "scoring_model": "weighted_sum_v3_phones_test2"
    }


def make_reply(profile: PreferenceProfile, top_docs: list[dict]) -> dict:
    qs = missing_questions(profile)

    if qs:
        return {
            "user_view": {
                "summary": "I need a bit more info before recommending.",
                "questions": qs[:2]
            },
            "developer_view": {
                "state": "missing_preferences",
                "missing_fields": qs
            }
        }

    if not top_docs:
        return {
            "user_view": {
                "summary": "No phones matched your constraints.",
                "suggestion": "Try increasing your budget or relaxing a requirement."
            },
            "developer_view": {
                "state": "no_results",
                "top_results": [],
                "missing_fields": []
            }
        }

    return {
        "user_view": build_user_view(profile, top_docs),
        "developer_view": build_dev_view(profile, top_docs)
    }