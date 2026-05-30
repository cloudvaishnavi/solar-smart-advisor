"""
SolarSmart Advisor — Simulation Router
API endpoints to trigger and retrieve energy simulations.
"""
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.core.decision_maker import run_simulation
from app.core.rule_engine import calculate_subsidy
from app.database import database
from app.models.schemas import (
    HouseholdSettings,
    SimulationRequest,
    SimulationResult,
    SubsidyInfo,
)
from app.services.weather_service import fetch_weather
from app.config import settings as app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/run", response_model=SimulationResult)
async def run_new_simulation(request: SimulationRequest):
    """
    Trigger a full 24-hour energy simulation.

    Steps:
      1. Fetch real-time weather from Open-Meteo
      2. Run rule-based simulation engine
      3. Optionally persist result to database
      4. Return complete simulation result
    """
    try:
        # 1. Get live weather (falls back gracefully if offline)
        weather = fetch_weather(request.settings.city)

        # 2. Run the simulation
        result = run_simulation(request.settings, weather)

        # 3. Persist to DB (optional)
        if request.save_to_db:
            result_dict = result.model_dump()
            result_dict["created_at"] = str(result.created_at)
            database.save_simulation(result_dict)

        return result

    except Exception as exc:
        logger.error("Simulation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(exc)}")


@router.get("/default", response_model=SimulationResult)
async def get_default_simulation():
    """
    Run a simulation with default settings (3 kW + 5 kWh, Bengaluru, balanced).
    Useful for the initial dashboard load — no configuration needed.
    """
    default_settings = HouseholdSettings()
    weather = fetch_weather(default_settings.city)
    result  = run_simulation(default_settings, weather)
    return result


@router.get("/history")
async def get_simulation_history(limit: int = 10):
    """Return the last N simulation summaries from the database."""
    try:
        history = database.get_recent_simulations(limit=limit)
        return {"simulations": history, "count": len(history)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/subsidy", response_model=SubsidyInfo)
async def get_subsidy_info(
    solar_kw: float = 3.0,
    installation_cost: float = 180_000.0,
):
    """
    Calculate PM Surya Ghar subsidy and return payback projections.

    - Official GoI subsidy slabs applied automatically
    - Annual savings estimated from typical Indian solar yield (1500 kWh/kWp/yr)
    - CO₂ offset at 0.82 kg/kWh (CEA 2023 grid emission factor)
    """
    subsidy = calculate_subsidy(solar_kw)
    net_cost = max(0, installation_cost - subsidy)

    # Typical Indian solar yield: ~1500 kWh per kWp per year
    units_per_year = solar_kw * 1500
    # At average tariff of ₹6/kWh
    annual_savings = units_per_year * 6.0
    payback = net_cost / annual_savings if annual_savings > 0 else 0

    return SubsidyInfo(
        solar_capacity_kw=solar_kw,
        subsidy_amount=subsidy,
        installation_cost=installation_cost,
        net_cost=net_cost,
        annual_savings_inr=round(annual_savings, 0),
        payback_years=round(payback, 1),
        co2_offset_kg_per_year=round(units_per_year * 0.82, 1),
        units_generated_per_year=round(units_per_year, 0),
        monthly_savings_inr=round(annual_savings / 12, 0),
    )
