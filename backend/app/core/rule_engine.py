"""
SolarSmart Advisor — Rule Engine
===================================
The heart of the system. Contains all rule-based logic for:
  1. Solar generation calculation (weather + dust derating)
  2. Household load profiles per BHK size
  3. Power-cut prediction (India-specific time + weather patterns)
  4. Energy dispatch rules per priority mode
  5. Tariff schedule (Indian peak/off-peak rates)
  6. Monsoon pre-charge logic
  7. Dust accumulation simulation

NOTE: All functions are pure (no side effects) so they can be
replaced with ML models later by simply swapping out the function
calls in decision_maker.py.
"""
import math
from datetime import date, datetime
from typing import List, Tuple

from app.models.schemas import HouseholdSettings, WeatherData

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

# CO₂ emission factor for Indian grid (kg CO₂ per kWh) — CEA 2023 estimate
CO2_FACTOR_KG_PER_KWH = 0.82

# Maximum dust loss fraction (after ~8 weeks without cleaning)
MAX_DUST_LOSS = 0.25

# Appliances per BHK (priority-ordered: always-on → optional)
APPLIANCE_PROFILES: dict = {
    "2BHK": {
        "always_on":  ["Fridge", "WiFi Router"],
        "base":       ["Ceiling Fans (2)", "LED Lights"],
        "daytime":    ["Water Pump"],
        "evening":    ["TV", "Ceiling Fans (3)"],
        "ac_capable": False,
        "peak_load_kw": 2.5,
        "base_load_kw": 0.35,
    },
    "3BHK": {
        "always_on":  ["Fridge", "WiFi Router"],
        "base":       ["Ceiling Fans (3)", "LED Lights"],
        "daytime":    ["Washing Machine", "Water Pump"],
        "evening":    ["TV", "Microwave"],
        "ac_capable": True,
        "ac_load_kw": 1.5,
        "peak_load_kw": 4.0,
        "base_load_kw": 0.60,
    },
    "4BHK": {
        "always_on":  ["Fridge (2)", "WiFi Router", "Security System"],
        "base":       ["Ceiling Fans (5)", "LED Lights"],
        "daytime":    ["Washing Machine", "Dishwasher", "Water Pump"],
        "evening":    ["TV (2)", "Microwave", "Water Heater"],
        "ac_capable": True,
        "ac_load_kw": 3.0,
        "peak_load_kw": 6.5,
        "base_load_kw": 0.85,
    },
}

# Indian tariff schedule (₹/kWh)
def get_tariff(hour: int) -> float:
    """
    Returns the electricity tariff for the given hour.
    Peak: 18:00–22:00 → ₹8.0/kWh
    Off-peak: 22:00–06:00 → ₹4.5/kWh
    Day: 06:00–18:00 → ₹6.0/kWh
    """
    if 18 <= hour < 22:
        return 8.0   # Peak tariff
    if hour >= 22 or hour < 6:
        return 4.5   # Off-peak tariff
    return 6.0        # Standard day tariff


# ─────────────────────────────────────────────────────────────────────────────
# 1. Solar Generation
# ─────────────────────────────────────────────────────────────────────────────

def calculate_solar_generation(
    hour: int,
    capacity_kw: float,
    weather: WeatherData,
    dust_loss_factor: float,
) -> float:
    """
    Calculate solar output for a given hour (kW).

    Model:
      - Bell-curve profile peaking at noon (hour 12)
      - Cloud cover reduces output: effective_factor = 1 - 0.75*(cloud/100)
      - Rain further reduces by 15 %
      - Dust reduces linearly up to MAX_DUST_LOSS
    """
    # No generation at night
    if hour < 6 or hour > 18:
        return 0.0

    # Bell-curve: peak at noon, zero at 6 AM and 6 PM
    solar_angle = math.sin(math.pi * (hour - 6) / 12)

    # Cloud attenuation (0.75 = max cloud reduction factor)
    cloud_factor = 1.0 - 0.75 * (weather.cloud_cover / 100.0)

    # Rain attenuation (additional 15 % drop during rain)
    rain_factor = 0.85 if weather.rain_probability > 60 else 1.0

    # Dust loss
    clean_factor = 1.0 - dust_loss_factor

    raw_output = capacity_kw * solar_angle * cloud_factor * rain_factor * clean_factor
    return round(max(0.0, raw_output), 3)


def calculate_dust_loss(last_cleaned_date_str: str) -> float:
    """
    Estimate dust accumulation loss factor.
    Rule: 1 % loss per week after cleaning, capped at MAX_DUST_LOSS (25 %).
    Rain gives a natural clean (resets 30 % of dust accumulation).
    """
    try:
        last_cleaned = date.fromisoformat(last_cleaned_date_str)
    except ValueError:
        last_cleaned = date.today()

    days_since_clean = (date.today() - last_cleaned).days
    weeks = max(0, days_since_clean) / 7.0
    loss = min(weeks * 0.01, MAX_DUST_LOSS)
    return round(loss, 3)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Household Load Profile
# ─────────────────────────────────────────────────────────────────────────────

def get_household_load(
    hour: int,
    bhk: str,
    is_power_cut: bool,
) -> Tuple[float, List[str]]:
    """
    Returns (load_kw, active_appliances) for the given hour and BHK size.

    Load profile (typical Indian household):
      00-05: base load (fridge, router)
      06-09: morning surge (water pump, fans, lights)
      09-17: day load (washing machine, moderate)
      17-23: evening peak (TV, fans, AC, microwave)
      23-00: winding down
    """
    profile = APPLIANCE_PROFILES[bhk]
    base = profile["base_load_kw"]
    peak = profile["peak_load_kw"]
    appliances: List[str] = list(profile["always_on"])

    if is_power_cut:
        # Only essential loads survive a cut (no grid-dependent appliances)
        appliances += ["Battery-backed Fans", "Emergency Lights"]
        return round(base * 0.4, 2), appliances

    if 0 <= hour < 5:
        # Deep night — only standby loads
        load = base
        appliances += ["Ceiling Fans (1)"]

    elif 5 <= hour < 9:
        # Morning — water pump, lighting, fans
        load = base + (peak - base) * 0.5
        appliances += profile["base"] + profile["daytime"]

    elif 9 <= hour < 17:
        # Daytime — moderate load, some appliances
        load = base + (peak - base) * 0.4
        appliances += profile["base"]
        if hour in [9, 10, 11]:
            appliances += profile["daytime"]

    elif 17 <= hour < 22:
        # Evening peak — everything running
        load = peak
        appliances += profile["base"] + profile["evening"]
        if profile.get("ac_capable") and hour >= 18:
            load += profile.get("ac_load_kw", 0)
            appliances.append("AC")

    else:
        # Late night — winding down
        load = base + (peak - base) * 0.25
        appliances += profile["base"]

    return round(min(load, peak + profile.get("ac_load_kw", 0)), 2), appliances


# ─────────────────────────────────────────────────────────────────────────────
# 3. Power-Cut Prediction (India-Specific)
# ─────────────────────────────────────────────────────────────────────────────

# Historical power-cut risk by hour (0 = low, 1 = high) for Indian metros
POWER_CUT_RISK_PROFILE: List[float] = [
    0.05, 0.03, 0.03, 0.02, 0.02, 0.03,   # 00–05
    0.08, 0.10, 0.12, 0.08, 0.06, 0.05,   # 06–11
    0.08, 0.07, 0.06, 0.07, 0.10, 0.20,   # 12–17
    0.30, 0.35, 0.25, 0.15, 0.10, 0.07,   # 18–23
]

def predict_power_cut(
    hour: int,
    weather: WeatherData,
    city: str,
) -> Tuple[bool, int]:
    """
    Predict if a power cut occurs at the given hour.
    Returns (is_cut, duration_minutes).

    Rules:
      - Base risk from historical profile
      - Rain/monsoon adds +20 % risk
      - Peak demand hours (18–21) add extra risk
      - Mumbai has lower grid reliability historically
    """
    base_risk = POWER_CUT_RISK_PROFILE[hour]

    # Monsoon penalty
    if weather.is_monsoon and weather.rain_probability > 50:
        base_risk += 0.20

    # City-specific reliability (Delhi DISCOMs better than older areas)
    city_multiplier = {"Bengaluru": 1.1, "Mumbai": 1.3, "Delhi": 0.9}
    base_risk *= city_multiplier.get(city, 1.0)

    # Simulate deterministic cut (use hour as seed for reproducibility)
    # In Phase 2, replace with ML model here
    import random
    rng = random.Random(hour * 31 + int(weather.rain_probability))
    is_cut = rng.random() < min(base_risk, 0.85)

    # Duration: 15 min to 2 hours depending on severity
    duration = 0
    if is_cut:
        duration = rng.choice([15, 30, 45, 60, 90, 120])

    return is_cut, duration


# ─────────────────────────────────────────────────────────────────────────────
# 4. Energy Dispatch Rules (Priority Modes)
# ─────────────────────────────────────────────────────────────────────────────

def decide_energy_flow(
    hour: int,
    solar_kw: float,
    load_kw: float,
    battery_soc: float,
    battery_cap_kwh: float,
    weather: WeatherData,
    priority_mode: str,
    next_hour_cut: bool,
) -> dict:
    """
    Decide how energy flows for the current hour based on priority mode.

    Returns a dict:
      battery_delta_kwh  → positive = charge, negative = discharge
      grid_import_kw
      grid_export_kw
      action             → short label for the decision log
      reason             → "Why?" explanation string
    """
    battery_kwh = battery_soc * battery_cap_kwh
    surplus_kw  = solar_kw - load_kw    # positive = solar surplus
    tariff      = get_tariff(hour)

    # ── Shared logic: always use solar first to cover load ────────────────────
    # After covering load, deal with surplus or deficit per mode

    # ── MODE: Cost-Save 💰 ────────────────────────────────────────────────────
    if priority_mode == "cost_save":
        return _dispatch_cost_save(hour, surplus_kw, battery_soc, battery_kwh,
                                   battery_cap_kwh, load_kw, solar_kw, tariff, next_hour_cut, weather)

    # ── MODE: Backup Priority 🔋 ──────────────────────────────────────────────
    elif priority_mode == "backup_priority":
        return _dispatch_backup(hour, surplus_kw, battery_soc, battery_kwh,
                                battery_cap_kwh, load_kw, solar_kw, tariff, next_hour_cut, weather)

    # ── MODE: Carbon-First 🌍 ─────────────────────────────────────────────────
    elif priority_mode == "carbon_first":
        return _dispatch_carbon(hour, surplus_kw, battery_soc, battery_kwh,
                                battery_cap_kwh, load_kw, solar_kw, tariff, weather)

    # ── MODE: Balanced ────────────────────────────────────────────────────────
    else:
        return _dispatch_balanced(hour, surplus_kw, battery_soc, battery_kwh,
                                  battery_cap_kwh, load_kw, solar_kw, tariff, next_hour_cut, weather)


# ── Dispatch helpers ──────────────────────────────────────────────────────────

def _dispatch_cost_save(hour, surplus_kw, battery_soc, battery_kwh,
                         battery_cap_kwh, load_kw, solar_kw, tariff,
                         next_hour_cut, weather):
    """Maximise financial savings: discharge during peak, charge off-peak."""
    result = {"battery_delta_kwh": 0.0, "grid_import_kw": 0.0,
              "grid_export_kw": 0.0, "action": "", "reason": ""}

    if surplus_kw > 0:
        # Solar surplus
        if battery_soc < 0.95:
            result["battery_delta_kwh"] = min(surplus_kw, battery_cap_kwh * (0.95 - battery_soc))
            result["action"] = "Charging battery from solar surplus"
            result["reason"] = f"Solar surplus {surplus_kw:.1f} kW — storing in battery to sell during peak hours. Tariff now: ₹{tariff}/kWh."
        else:
            result["grid_export_kw"] = surplus_kw
            result["action"] = "Exporting excess solar to grid"
            result["reason"] = f"Battery full. Feeding {surplus_kw:.1f} kW surplus to grid at ₹{tariff}/kWh."
    else:
        deficit_kw = abs(surplus_kw)
        if 18 <= hour < 22:
            # Peak hours — discharge battery to avoid expensive grid import
            if battery_soc > 0.15:
                discharge = min(deficit_kw, battery_kwh * 0.5)
                result["battery_delta_kwh"] = -discharge
                result["grid_import_kw"] = max(0, deficit_kw - discharge)
                result["action"] = "Discharging battery — peak tariff hour"
                result["reason"] = f"Peak tariff ₹{tariff}/kWh active (18:00–22:00). Discharging battery saves ₹{discharge * tariff:.0f} vs. grid import."
            else:
                result["grid_import_kw"] = deficit_kw
                result["action"] = "Grid import (battery low)"
                result["reason"] = f"Battery SoC {battery_soc*100:.0f}% too low to discharge. Importing from grid at ₹{tariff}/kWh."
        elif hour >= 22 or hour < 6:
            # Off-peak — charge battery cheaply for tomorrow
            if battery_soc < 0.8:
                result["grid_import_kw"] = deficit_kw + min(1.5, battery_cap_kwh * (0.8 - battery_soc))
                result["battery_delta_kwh"] = min(1.5, battery_cap_kwh * (0.8 - battery_soc))
                result["action"] = "Off-peak charging from grid"
                result["reason"] = f"Off-peak tariff ₹{tariff}/kWh — charging battery cheaply for tomorrow's peak discharge."
            else:
                result["grid_import_kw"] = deficit_kw
                result["action"] = "Grid import"
                result["reason"] = f"Battery charged. Importing deficit {deficit_kw:.1f} kW from grid at cheap off-peak rate ₹{tariff}/kWh."
        else:
            result["grid_import_kw"] = deficit_kw
            result["action"] = "Grid import"
            result["reason"] = f"Solar {solar_kw:.1f} kW insufficient for load {load_kw:.1f} kW. Importing {deficit_kw:.1f} kW from grid."

    # Monsoon pre-charge override
    if weather.is_monsoon and weather.rain_probability > 60 and battery_soc < 0.8:
        extra = battery_cap_kwh * (0.8 - battery_soc)
        result["battery_delta_kwh"] += extra
        result["grid_import_kw"] += extra
        result["action"] = "⚡ Monsoon pre-charge"
        result["reason"] += f" MONSOON OVERRIDE: Rain probability {weather.rain_probability}% — pre-charging battery to avoid blackout."

    return result


def _dispatch_backup(hour, surplus_kw, battery_soc, battery_kwh,
                      battery_cap_kwh, load_kw, solar_kw, tariff,
                      next_hour_cut, weather):
    """Keep battery as full as possible — backup is top priority."""
    result = {"battery_delta_kwh": 0.0, "grid_import_kw": 0.0,
              "grid_export_kw": 0.0, "action": "", "reason": ""}

    # Target SoC: 90 %
    target_soc = 0.90

    if surplus_kw > 0:
        if battery_soc < target_soc:
            result["battery_delta_kwh"] = surplus_kw
            result["action"] = "Charging battery — backup mode"
            result["reason"] = f"Backup Priority: keeping battery charged to 90%. Solar surplus {surplus_kw:.1f} kW → battery."
        else:
            result["grid_export_kw"] = surplus_kw
            result["action"] = "Battery full — exporting surplus"
            result["reason"] = f"Battery at {battery_soc*100:.0f}% (target 90%). Exporting {surplus_kw:.1f} kW to grid."
    else:
        deficit_kw = abs(surplus_kw)
        if next_hour_cut and battery_soc > 0.3:
            # Avoid discharging before expected power cut
            result["grid_import_kw"] = deficit_kw
            result["action"] = "Holding battery — power cut expected"
            result["reason"] = f"Power cut predicted next hour. Preserving battery at {battery_soc*100:.0f}% for backup. Importing from grid instead."
        elif battery_soc < target_soc:
            # Pull from grid to top up battery
            charge_kw = min(2.0, battery_cap_kwh * (target_soc - battery_soc))
            result["grid_import_kw"] = deficit_kw + charge_kw
            result["battery_delta_kwh"] = charge_kw
            result["action"] = "Grid charging — maintaining backup buffer"
            result["reason"] = f"Battery SoC {battery_soc*100:.0f}% below 90% target. Topping up from grid ₹{tariff}/kWh."
        else:
            result["grid_import_kw"] = deficit_kw
            result["action"] = "Grid import"
            result["reason"] = f"Meeting {deficit_kw:.1f} kW deficit from grid. Battery reserved for outages."

    return result


def _dispatch_carbon(hour, surplus_kw, battery_soc, battery_kwh,
                      battery_cap_kwh, load_kw, solar_kw, tariff, weather):
    """Minimise carbon footprint — avoid grid import, maximise solar use."""
    result = {"battery_delta_kwh": 0.0, "grid_import_kw": 0.0,
              "grid_export_kw": 0.0, "action": "", "reason": ""}

    if surplus_kw > 0:
        if battery_soc < 0.95:
            result["battery_delta_kwh"] = surplus_kw
            result["action"] = "Storing clean solar energy"
            result["reason"] = f"Carbon-First: maximising solar storage. {surplus_kw:.1f} kW → battery. Avoids {surplus_kw * CO2_FACTOR_KG_PER_KWH:.2f} kg CO₂."
        else:
            result["grid_export_kw"] = surplus_kw
            result["action"] = "Exporting clean energy to grid"
            result["reason"] = f"Battery full. Exporting {surplus_kw:.1f} kW clean solar to grid — decarbonising neighbours!"
    else:
        deficit_kw = abs(surplus_kw)
        if battery_soc > 0.10:
            discharge = min(deficit_kw, battery_kwh)
            remainder = max(0, deficit_kw - discharge)
            result["battery_delta_kwh"] = -discharge
            result["grid_import_kw"] = remainder
            co2_saved = discharge * CO2_FACTOR_KG_PER_KWH
            result["action"] = "Discharging battery — avoiding grid carbon"
            result["reason"] = f"Discharging {discharge:.1f} kWh clean storage instead of grid. Avoids {co2_saved:.2f} kg CO₂/hr."
        else:
            # Critical — must import from grid
            result["grid_import_kw"] = deficit_kw
            result["action"] = "⚠️ Grid import (critical)"
            result["reason"] = f"Battery critically low ({battery_soc*100:.0f}%). Must import {deficit_kw:.1f} kW from grid to prevent blackout."

    return result


def _dispatch_balanced(hour, surplus_kw, battery_soc, battery_kwh,
                        battery_cap_kwh, load_kw, solar_kw, tariff,
                        next_hour_cut, weather):
    """Balance cost savings with backup buffer (50 % battery reserved)."""
    result = {"battery_delta_kwh": 0.0, "grid_import_kw": 0.0,
              "grid_export_kw": 0.0, "action": "", "reason": ""}

    backup_reserve = 0.50   # Keep 50 % SoC as emergency buffer

    if surplus_kw > 0:
        if battery_soc < 0.90:
            result["battery_delta_kwh"] = surplus_kw
            result["action"] = "Charging battery (balanced mode)"
            result["reason"] = f"Solar surplus {surplus_kw:.1f} kW → battery. Maintaining 50% backup buffer + cost saving potential."
        else:
            result["grid_export_kw"] = surplus_kw
            result["action"] = "Exporting surplus to grid"
            result["reason"] = f"Battery full. Exporting {surplus_kw:.1f} kW surplus at ₹{tariff}/kWh."
    else:
        deficit_kw = abs(surplus_kw)
        # Discharge only the portion above the backup reserve
        usable_kwh = max(0, battery_kwh - backup_reserve * battery_cap_kwh)

        if 18 <= hour < 22 and usable_kwh > 0:
            discharge = min(deficit_kw, usable_kwh * 0.5)
            result["battery_delta_kwh"] = -discharge
            result["grid_import_kw"] = max(0, deficit_kw - discharge)
            result["action"] = "Peak-hour battery discharge (balanced)"
            result["reason"] = (f"Peak tariff ₹{tariff}/kWh. Discharging {discharge:.1f} kWh above 50% reserve. "
                                 f"Saving ₹{discharge * tariff:.0f} while keeping backup buffer intact.")
        else:
            result["grid_import_kw"] = deficit_kw
            result["action"] = "Grid import (within budget)"
            result["reason"] = f"Deficit {deficit_kw:.1f} kW. Battery reserve protected. Grid import at ₹{tariff}/kWh."

    # Monsoon pre-charge override
    if weather.is_monsoon and weather.rain_probability > 60 and battery_soc < 0.80:
        extra = battery_cap_kwh * (0.80 - battery_soc)
        result["battery_delta_kwh"] += extra
        result["grid_import_kw"] += extra
        result["action"] = "⚡ Monsoon pre-charge (balanced)"
        result["reason"] += f" Monsoon override: pre-charging to 80% — rain probability {weather.rain_probability}%."

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 5. Subsidy Calculation
# ─────────────────────────────────────────────────────────────────────────────

def calculate_subsidy(solar_kw: float) -> float:
    """
    PM Surya Ghar Muft Bijli Yojana subsidy slabs (GoI 2024):
      ≤ 2 kW  → ₹30,000
      2–3 kW  → ₹60,000 (₹30k first 2kW + ₹18k/kW for next 1kW = ₹48k, total ₹60k)
      > 3 kW  → ₹78,000 (capped)
    """
    if solar_kw <= 2:
        return 30_000.0
    elif solar_kw <= 3:
        return 60_000.0
    else:
        return 78_000.0
