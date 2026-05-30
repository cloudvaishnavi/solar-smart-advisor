"""
SolarSmart Advisor — Pydantic Schemas
All request/response models live here so they can be imported cleanly.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Household Settings
# ─────────────────────────────────────────────────────────────────────────────

class HouseholdSettings(BaseModel):
    """User-configurable household profile."""
    user_id: str = "default"

    # Home size → drives the load profile
    bhk_size: Literal["2BHK", "3BHK", "4BHK"] = "3BHK"

    # Solar + battery system specs (3 kW + 5 kWh defaults)
    solar_capacity_kw: float = Field(default=3.0, ge=0.5, le=20.0,
                                     description="Installed solar panel capacity in kW")
    battery_capacity_kwh: float = Field(default=5.0, ge=1.0, le=50.0,
                                        description="Battery storage capacity in kWh")
    battery_initial_soc: float = Field(default=0.6, ge=0.0, le=1.0,
                                       description="Battery state-of-charge at simulation start (0–1)")

    # Location — determines weather and tariff zone
    city: Literal["Bengaluru", "Delhi", "Mumbai"] = "Bengaluru"

    # Energy management strategy
    priority_mode: Literal[
        "cost_save", "backup_priority", "carbon_first", "balanced"
    ] = "balanced"

    # For dust-loss simulation and subsidy payback calculation
    panel_installation_date: str = "2024-01-01"
    last_cleaned_date: str = "2026-05-01"

    # Financial inputs for PM Surya Ghar payback tracker
    installation_cost: float = Field(default=180_000.0,
                                     description="Total system installation cost in ₹")


# ─────────────────────────────────────────────────────────────────────────────
# Weather
# ─────────────────────────────────────────────────────────────────────────────

class WeatherData(BaseModel):
    """Real-time weather snapshot from Open-Meteo (or fallback sample)."""
    city: str
    temperature: float           # °C
    cloud_cover: int             # 0–100 %
    rain_probability: int        # 0–100 %
    wind_speed: float            # km/h
    condition: str               # "sunny" | "partly_cloudy" | "cloudy" | "rainy"
    is_monsoon: bool             # True June–September for most Indian cities
    uv_index: float = 5.0


# ─────────────────────────────────────────────────────────────────────────────
# Simulation Data Points
# ─────────────────────────────────────────────────────────────────────────────

class HourlyDataPoint(BaseModel):
    """Energy-flow snapshot for a single hour of the 24-hour simulation."""
    hour: int                        # 0–23
    solar_generation_kw: float       # After weather + dust derating
    battery_soc: float               # 0.0–1.0
    battery_soc_kwh: float           # kWh equivalent
    grid_import_kw: float            # Power pulled from grid
    grid_export_kw: float            # Excess solar fed back to grid
    household_load_kw: float         # Total home consumption
    is_power_cut: bool
    power_cut_duration_min: int = 0
    active_appliances: List[str]
    tariff: float                    # ₹/kWh at this hour
    net_cost: float                  # ₹ spent (negative = earned from export)
    dust_loss_factor: float = 0.0    # Fraction of generation lost to dust


# ─────────────────────────────────────────────────────────────────────────────
# Decision Log
# ─────────────────────────────────────────────────────────────────────────────

class DecisionLogEntry(BaseModel):
    """One explainable decision event in the simulation."""
    timestamp: str               # "HH:MM" format
    action: str                  # Short action title
    reason: str                  # Full "Why?" explanation
    impact_inr: float            # ₹ saved or earned
    impact_co2_kg: float         # kg CO₂ avoided
    priority_mode: str
    icon: str                    # Emoji for visual distinction
    severity: Literal["info", "warning", "success", "critical"] = "info"


# ─────────────────────────────────────────────────────────────────────────────
# Simulation Result
# ─────────────────────────────────────────────────────────────────────────────

class DaySummary(BaseModel):
    """Aggregate totals for the full 24-hour simulation."""
    total_solar_kwh: float
    total_household_kwh: float
    total_grid_import_kwh: float
    total_grid_export_kwh: float
    total_cost_inr: float          # Net electricity bill for the day
    total_savings_inr: float       # Compared to 100 % grid baseline
    total_co2_avoided_kg: float
    power_cut_events: int
    power_cut_duration_min: int
    dust_loss_kwh: float
    self_sufficiency_pct: float    # % of load met by solar+battery


class SimulationResult(BaseModel):
    """Full simulation output returned to the frontend."""
    id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: HouseholdSettings
    weather: WeatherData
    hourly_data: List[HourlyDataPoint]
    decision_log: List[DecisionLogEntry]
    summary: DaySummary


# ─────────────────────────────────────────────────────────────────────────────
# Subsidy / Payback
# ─────────────────────────────────────────────────────────────────────────────

class SubsidyInfo(BaseModel):
    """PM Surya Ghar subsidy calculation and ROI projection."""
    solar_capacity_kw: float
    subsidy_amount: float            # ₹ from government
    installation_cost: float         # ₹ total before subsidy
    net_cost: float                  # ₹ after subsidy
    annual_savings_inr: float        # Estimated annual electricity savings
    payback_years: float             # Net cost / annual savings
    co2_offset_kg_per_year: float
    units_generated_per_year: float  # kWh
    monthly_savings_inr: float       # Approximate monthly saving


# ─────────────────────────────────────────────────────────────────────────────
# API Request Models
# ─────────────────────────────────────────────────────────────────────────────

class SimulationRequest(BaseModel):
    """Payload to trigger a new simulation run."""
    settings: HouseholdSettings
    save_to_db: bool = True
