"""
SolarSmart Advisor — Explainability Engine
==========================================
Converts raw decision data into rich, human-readable log entries.
Calculates financial impact (₹ saved) and environmental impact (kg CO₂ avoided).

This module is intentionally kept separate from decision_maker.py so that:
  - The log format can be upgraded without touching simulation logic
  - ML models can plug in here to provide their own explanations
"""
from app.models.schemas import DecisionLogEntry
from app.core.rule_engine import CO2_FACTOR_KG_PER_KWH, get_tariff


# Icon mapping for log entry visual indicators
ACTION_ICONS = {
    "Charging battery from solar surplus":   "☀️",
    "Exporting excess solar to grid":         "📤",
    "Discharging battery — peak tariff hour": "🔋",
    "Grid import (battery low)":              "⚡",
    "Off-peak charging from grid":            "🌙",
    "Grid import":                            "⚡",
    "⚡ Monsoon pre-charge":                  "🌧️",
    "Charging battery — backup mode":         "🛡️",
    "Battery full — exporting surplus":       "📤",
    "Holding battery — power cut expected":   "⚠️",
    "Grid charging — maintaining backup buffer": "🔌",
    "Storing clean solar energy":             "🌍",
    "Exporting clean energy to grid":         "🌱",
    "Discharging battery — avoiding grid carbon": "♻️",
    "⚠️ Grid import (critical)":              "🚨",
    "Charging battery (balanced mode)":       "⚖️",
    "Exporting surplus to grid":              "📤",
    "Peak-hour battery discharge (balanced)": "💰",
    "Grid import (within budget)":            "⚡",
    "⚡ Monsoon pre-charge (balanced)":       "🌧️",
}

SEVERITY_MAP = {
    "⚠️ Grid import (critical)": "critical",
    "⚡ Monsoon pre-charge":     "warning",
    "⚡ Monsoon pre-charge (balanced)": "warning",
    "Holding battery — power cut expected": "warning",
    "Discharging battery — peak tariff hour": "success",
    "Discharging battery — avoiding grid carbon": "success",
    "Exporting clean energy to grid": "success",
    "Exporting excess solar to grid": "success",
}


def build_decision_entry(
    hour: int,
    action: str,
    reason: str,
    battery_delta_kwh: float,
    grid_import_kw: float,
    grid_export_kw: float,
    priority_mode: str,
    is_power_cut: bool,
    weather_condition: str,
) -> DecisionLogEntry:
    """
    Build a rich DecisionLogEntry from raw simulation outputs.

    Financial impact:
      - Energy saved from grid = battery discharged + solar used directly
      - Saving = kWh * local tariff rate

    CO₂ impact:
      - CO₂ avoided = kWh of clean energy used * 0.82 kg/kWh (CEA 2023 Indian grid)
    """
    tariff = get_tariff(hour)
    timestamp = f"{hour:02d}:00"

    # ── Financial impact ──────────────────────────────────────────────────────
    # Positive: money saved by not importing from grid
    # Negative: money spent importing
    if battery_delta_kwh < 0:
        # Discharging: saved the equivalent grid cost
        impact_inr = abs(battery_delta_kwh) * tariff
    elif grid_export_kw > 0:
        # Export earns ₹2/kWh net-metering rate (GoI typical)
        impact_inr = grid_export_kw * 2.0
    elif grid_import_kw > 0:
        # Importing costs money
        impact_inr = -(grid_import_kw * tariff)
    else:
        impact_inr = 0.0

    # ── CO₂ impact ────────────────────────────────────────────────────────────
    # Clean kWh = discharged battery + exported solar
    clean_kwh = max(0, abs(battery_delta_kwh) if battery_delta_kwh < 0 else 0) + grid_export_kw
    impact_co2 = round(clean_kwh * CO2_FACTOR_KG_PER_KWH, 3)

    # Power-cut context
    if is_power_cut:
        reason = f"🔴 POWER CUT ACTIVE — " + reason
        action = f"Backup power active"

    # Enrich reason with impact summary
    enriched_reason = reason
    if abs(impact_inr) > 0.5:
        sign = "saved" if impact_inr > 0 else "cost"
        enriched_reason += f" | Impact: ₹{abs(impact_inr):.0f} {sign}"
    if impact_co2 > 0:
        enriched_reason += f" | {impact_co2:.2f} kg CO₂ avoided"

    icon = ACTION_ICONS.get(action, "⚡")
    severity = SEVERITY_MAP.get(action, "info")
    if is_power_cut:
        severity = "critical"
        icon = "🔴"

    return DecisionLogEntry(
        timestamp=timestamp,
        action=action,
        reason=enriched_reason,
        impact_inr=round(impact_inr, 2),
        impact_co2_kg=round(impact_co2, 3),
        priority_mode=priority_mode,
        icon=icon,
        severity=severity,
    )


def summarise_day(hourly_data: list) -> dict:
    """
    Compute aggregate daily totals from the list of HourlyDataPoint dicts.
    """
    total_solar     = sum(h["solar_generation_kw"] for h in hourly_data)
    total_load      = sum(h["household_load_kw"] for h in hourly_data)
    total_import    = sum(h["grid_import_kw"] for h in hourly_data)
    total_export    = sum(h["grid_export_kw"] for h in hourly_data)
    dust_loss       = sum(h["solar_generation_kw"] * h.get("dust_loss_factor", 0) for h in hourly_data)
    cuts            = [h for h in hourly_data if h["is_power_cut"]]
    total_cut_min   = sum(h.get("power_cut_duration_min", 0) for h in cuts)

    # Cost vs. 100 % grid baseline
    total_cost = sum(h["net_cost"] for h in hourly_data)
    baseline_cost = sum(h["household_load_kw"] * h["tariff"] for h in hourly_data)
    savings = baseline_cost - total_cost

    # CO₂ avoided = solar used locally (not exported to grid for simplicity)
    co2_avoided = (total_solar - total_export) * CO2_FACTOR_KG_PER_KWH

    # Self-sufficiency = % of load NOT from grid
    self_suf = ((total_load - total_import) / max(total_load, 0.01)) * 100

    return {
        "total_solar_kwh":        round(total_solar, 2),
        "total_household_kwh":    round(total_load, 2),
        "total_grid_import_kwh":  round(total_import, 2),
        "total_grid_export_kwh":  round(total_export, 2),
        "total_cost_inr":         round(total_cost, 2),
        "total_savings_inr":      round(max(savings, 0), 2),
        "total_co2_avoided_kg":   round(max(co2_avoided, 0), 3),
        "power_cut_events":       len(cuts),
        "power_cut_duration_min": total_cut_min,
        "dust_loss_kwh":          round(dust_loss, 3),
        "self_sufficiency_pct":   round(min(self_suf, 100), 1),
    }
