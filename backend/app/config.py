"""
SolarSmart Advisor — Application Configuration
All settings are loaded from environment variables with sensible defaults.
Copy .env.example → .env and edit as needed.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Server ───────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Database ─────────────────────────────────────────────────────────────
    # Swap this for your Atlas URI; the app will fall back to a local JSON
    # file automatically if MongoDB is unreachable.
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "solar_smart_advisor"

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Comma-separated list; supports Vercel preview URLs via wildcard matching
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "https://*.vercel.app"
    )

    # ── Weather ──────────────────────────────────────────────────────────────
    WEATHER_CITY: str = "Bengaluru"   # Bengaluru | Delhi | Mumbai

    # ── Simulation defaults (3 kW solar + 5 kWh battery) ────────────────────
    SOLAR_CAPACITY_KW: float = 3.0
    BATTERY_CAPACITY_KWH: float = 5.0
    BATTERY_INITIAL_SOC: float = 0.6   # 60 % starting charge

    # ── Indian electricity tariff (₹/kWh) ───────────────────────────────────
    PEAK_TARIFF: float = 8.0           # 18:00–22:00
    OFF_PEAK_TARIFF: float = 4.5       # 22:00–06:00
    DAY_TARIFF: float = 6.0            # 06:00–18:00

    # ── PM Surya Ghar subsidy slabs (₹) ─────────────────────────────────────
    SUBSIDY_SLAB_2KW: float = 30_000   # ≤ 2 kW
    SUBSIDY_SLAB_3KW: float = 78_000   # 2–3 kW (additional ₹18k after slab 1)
    INSTALLATION_COST_PER_KW: float = 60_000   # ₹ per kW installed

    class Config:
        env_file = ".env"
        extra = "ignore"


# Singleton — import this everywhere
settings = Settings()
