"""
SolarSmart Advisor — Decision Maker (Simulation Engine)
=======================================================
Runs the full 24-hour energy simulation step-by-step.
Calls the rule engine for each hour and collects results.

This is the orchestrator — it wires together:
  rule_engine.py  → generates solar, loads, dispatch decisions
  explainability.py → formats each decision into a log entry
"""
import logging
from datetime import datetime
from typing import List

from app.core.rule_engine import (
    calculate_solar_generation,
    calculate_dust_loss,
    get_household_load,
    predict_power_cut,
    decide_energy_flow,
    get_tariff,
    CO2_FACTOR_KG_PER_KWH,
)
from app.core.explainability import build_decision_entry, summarise_day
from app.models.schemas import (
    HouseholdSettings,
    WeatherData,
    HourlyDataPoint,
    DecisionLogEntry,
    SimulationResult,
    DaySummary,
)

logger = logging.getLogger(__name__)


def run_simulation(
    settings: HouseholdSettings,
    weather: WeatherData,
) -> SimulationResult:
    """
    Execute the 24-hour energy simulation.

    For each hour (0–23):
      1. Calculate solar generation (with dust + weather derating)
      2. Determine household load based on BHK + time
      3. Check for power cut
      4. Apply priority-mode dispatch rules
      5. Update battery SoC
      6. Compute costs and build decision log entry

    Returns a complete SimulationResult ready to be serialised.
    """
    logger.info("Starting simulation for %s BHK in %s (mode: %s)",
                settings.bhk_size, settings.city, settings.priority_mode)

    # ── Pre-simulation setup ──────────────────────────────────────────────────
    battery_cap_kwh = settings.battery_capacity_kwh          # e.g. 5.0 kWh
    battery_soc     = settings.battery_initial_soc           # e.g. 0.60
    solar_cap_kw    = settings.solar_capacity_kw             # e.g. 3.0 kW
    dust_loss       = calculate_dust_loss(settings.last_cleaned_date)

    hourly_data: List[HourlyDataPoint] = []
    decision_log: List[DecisionLogEntry] = []

    # Pre-compute power cut schedule for the full day
    # (so we can pass "next_hour_cut" to the dispatcher)
    cut_schedule = [
        predict_power_cut(h, weather, settings.city)
        for h in range(24)
    ]

    # ── Hour-by-hour simulation loop ──────────────────────────────────────────
    for hour in range(24):
        is_cut, cut_duration = cut_schedule[hour]
        next_cut = cut_schedule[hour + 1][0] if hour < 23 else False

        # 1. Solar generation this hour
        solar_kw = calculate_solar_generation(hour, solar_cap_kw, weather, dust_loss)

        # 2. Household load (reduced if power cut)
        load_kw, active_appliances = get_household_load(
            hour, settings.bhk_size, is_cut
        )

        # 3. Dispatch decision based on priority mode
        dispatch = decide_energy_flow(
            hour=hour,
            solar_kw=solar_kw,
            load_kw=load_kw,
            battery_soc=battery_soc,
            battery_cap_kwh=battery_cap_kwh,
            weather=weather,
            priority_mode=settings.priority_mode,
            next_hour_cut=next_cut,
        )

        # 4. Update battery SoC (clamp between 0 and 1)
        delta_kwh   = dispatch["battery_delta_kwh"]
        battery_kwh = battery_soc * battery_cap_kwh
        new_battery_kwh = max(0.0, min(battery_cap_kwh, battery_kwh + delta_kwh))
        battery_soc = new_battery_kwh / battery_cap_kwh

        # 5. Calculate net cost for this hour
        tariff       = get_tariff(hour)
        import_cost  = dispatch["grid_import_kw"] * tariff
        export_earn  = dispatch["grid_export_kw"] * 2.0   # ₹2/kWh net-metering
        net_cost     = import_cost - export_earn

        # 6. Build hourly data point
        data_point = HourlyDataPoint(
            hour=hour,
            solar_generation_kw=solar_kw,
            battery_soc=round(battery_soc, 3),
            battery_soc_kwh=round(new_battery_kwh, 3),
            grid_import_kw=round(dispatch["grid_import_kw"], 3),
            grid_export_kw=round(dispatch["grid_export_kw"], 3),
            household_load_kw=load_kw,
            is_power_cut=is_cut,
            power_cut_duration_min=cut_duration,
            active_appliances=active_appliances,
            tariff=tariff,
            net_cost=round(net_cost, 3),
            dust_loss_factor=round(dust_loss, 3),
        )
        hourly_data.append(data_point)

        # 7. Build explainable log entry
        log_entry = build_decision_entry(
            hour=hour,
            action=dispatch["action"],
            reason=dispatch["reason"],
            battery_delta_kwh=delta_kwh,
            grid_import_kw=dispatch["grid_import_kw"],
            grid_export_kw=dispatch["grid_export_kw"],
            priority_mode=settings.priority_mode,
            is_power_cut=is_cut,
            weather_condition=weather.condition,
        )
        decision_log.append(log_entry)

    # ── Summarise the day ─────────────────────────────────────────────────────
    hourly_dicts = [h.model_dump() for h in hourly_data]
    summary_dict = summarise_day(hourly_dicts)
    summary      = DaySummary(**summary_dict)

    logger.info(
        "Simulation complete. Solar: %.1f kWh | Savings: ₹%.0f | CO₂: %.1f kg",
        summary.total_solar_kwh,
        summary.total_savings_inr,
        summary.total_co2_avoided_kg,
    )

    return SimulationResult(
        created_at=datetime.utcnow(),
        settings=settings,
        weather=weather,
        hourly_data=hourly_data,
        decision_log=decision_log,
        summary=summary,
    )
