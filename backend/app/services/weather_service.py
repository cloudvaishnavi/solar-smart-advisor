"""
SolarSmart Advisor — Weather Service
Fetches real-time forecasts from the free, keyless Open-Meteo API.
Falls back to realistic sample profiles if the network is unavailable.
"""
import logging
from datetime import datetime
from typing import Dict, Any

import requests

from app.models.schemas import WeatherData

logger = logging.getLogger(__name__)

# ── City coordinates ──────────────────────────────────────────────────────────
CITY_COORDS: Dict[str, Dict[str, float]] = {
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "Delhi":     {"lat": 28.6139, "lon": 77.2090},
    "Mumbai":    {"lat": 19.0760, "lon": 72.8777},
}

# ── Monsoon months by city ────────────────────────────────────────────────────
MONSOON_MONTHS: Dict[str, list] = {
    "Bengaluru": [6, 7, 8, 9, 10],
    "Delhi":     [7, 8, 9],
    "Mumbai":    [6, 7, 8, 9],
}

# ── Fallback weather profiles (realistic Indian summer / monsoon data) ────────
FALLBACK_WEATHER: Dict[str, Dict] = {
    "Bengaluru": {
        "temperature": 28.0, "cloud_cover": 45, "rain_probability": 35,
        "wind_speed": 12.0, "condition": "partly_cloudy", "uv_index": 6.0,
    },
    "Delhi": {
        "temperature": 38.0, "cloud_cover": 20, "rain_probability": 10,
        "wind_speed": 8.0, "condition": "sunny", "uv_index": 9.0,
    },
    "Mumbai": {
        "temperature": 32.0, "cloud_cover": 70, "rain_probability": 65,
        "wind_speed": 20.0, "condition": "cloudy", "uv_index": 4.0,
    },
}

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _derive_condition(cloud_cover: int, rain_prob: int) -> str:
    """Convert numeric values to a human-readable weather condition string."""
    if rain_prob >= 60:
        return "rainy"
    if cloud_cover >= 70:
        return "cloudy"
    if cloud_cover >= 30:
        return "partly_cloudy"
    return "sunny"


def fetch_weather(city: str) -> WeatherData:
    """
    Fetch current weather for the given city from Open-Meteo.
    Returns a WeatherData object (uses fallback on any network error).

    Open-Meteo fields used:
      - temperature_2m           → current temperature
      - cloudcover               → cloud cover %
      - precipitation_probability → rain probability %
      - windspeed_10m            → wind speed
      - uv_index                 → UV index
    """
    coords = CITY_COORDS.get(city, CITY_COORDS["Bengaluru"])
    month = datetime.now().month
    is_monsoon = month in MONSOON_MONTHS.get(city, [])

    try:
        params = {
            "latitude":  coords["lat"],
            "longitude": coords["lon"],
            "current":   (
                "temperature_2m,cloudcover,precipitation_probability,"
                "windspeed_10m,uv_index"
            ),
            "timezone":  "Asia/Kolkata",
        }
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        current = data.get("current", {})
        cloud_cover  = int(current.get("cloudcover", 30))
        rain_prob    = int(current.get("precipitation_probability", 20))
        temperature  = float(current.get("temperature_2m", 28.0))
        wind_speed   = float(current.get("windspeed_10m", 10.0))
        uv_index     = float(current.get("uv_index", 5.0))

        logger.info("✅ Weather fetched for %s: %d°C, cloud=%d%%", city, temperature, cloud_cover)

        return WeatherData(
            city=city,
            temperature=temperature,
            cloud_cover=cloud_cover,
            rain_probability=rain_prob,
            wind_speed=wind_speed,
            condition=_derive_condition(cloud_cover, rain_prob),
            is_monsoon=is_monsoon,
            uv_index=uv_index,
        )

    except Exception as exc:
        logger.warning("⚠️ Weather API failed (%s) — using fallback data for %s", exc, city)
        fb = FALLBACK_WEATHER.get(city, FALLBACK_WEATHER["Bengaluru"])
        return WeatherData(
            city=city,
            is_monsoon=is_monsoon,
            **fb,
        )
