"""
SolarSmart Advisor — Settings Router
CRUD endpoints for household profile settings.
"""
import logging
from fastapi import APIRouter, HTTPException
from app.database import database
from app.models.schemas import HouseholdSettings
from app.services.weather_service import fetch_weather

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/{user_id}")
async def get_settings(user_id: str = "default"):
    """Retrieve saved household settings for a user."""
    saved = database.get_settings(user_id)
    if not saved:
        # Return defaults if nothing saved yet
        return HouseholdSettings(user_id=user_id).model_dump()
    return saved


@router.post("/{user_id}")
async def save_settings(user_id: str, settings: HouseholdSettings):
    """Save or update household settings for a user."""
    try:
        data = settings.model_dump()
        database.save_settings(user_id, data)
        return {"status": "saved", "user_id": user_id, "settings": data}
    except Exception as exc:
        logger.error("Failed to save settings: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/weather/{city}")
async def get_weather(city: str = "Bengaluru"):
    """Fetch real-time weather for the given city."""
    if city not in ["Bengaluru", "Delhi", "Mumbai"]:
        raise HTTPException(status_code=400, detail="City must be Bengaluru, Delhi, or Mumbai")
    weather = fetch_weather(city)
    return weather.model_dump()
