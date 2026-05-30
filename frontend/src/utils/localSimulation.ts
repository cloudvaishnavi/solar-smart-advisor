/**
 * SolarSmart Advisor — Local Simulation Engine (Client-Side Fallback)
 *
 * Mirrors the Python backend rule_engine.py + decision_maker.py logic so that
 * the dashboard always has data to display even when the FastAPI server is offline.
 *
 * All constants & formulas kept identical to the backend for numerical consistency.
 */

import {
  HouseholdSettings,
  SimulationResult,
  HourlyDataPoint,
  DecisionLogEntry,
  DaySummary,
  WeatherData,
} from '../types';

// ── Constants (mirrors rule_engine.py) ───────────────────────────────────────

const CO2_FACTOR = 0.82;   // kg CO₂ / kWh — CEA India 2023
const MAX_DUST_LOSS = 0.25;

// ── Tariff schedule ──────────────────────────────────────────────────────────

function getTariff(hour: number): number {
  if (hour >= 18 && hour < 22) return 8.0;   // Peak
  if (hour >= 22 || hour < 6)  return 4.5;   // Off-peak
  return 6.0;                                  // Standard day
}

// ── Load profiles (kW) — mirrors APPLIANCE_PROFILES ─────────────────────────

interface ApplianceProfile {
  always_on: string[];
  base: string[];
  daytime: string[];
  evening: string[];
  ac_capable: boolean;
  ac_load_kw: number;
  peak_load_kw: number;
  base_load_kw: number;
}

const APPLIANCE_PROFILES: Record<string, ApplianceProfile> = {
  '2BHK': {
    always_on:    ['Fridge', 'WiFi Router'],
    base:         ['Ceiling Fans (2)', 'LED Lights'],
    daytime:      ['Water Pump'],
    evening:      ['TV', 'Ceiling Fans (3)'],
    ac_capable:   false,
    ac_load_kw:   0,
    peak_load_kw: 2.5,
    base_load_kw: 0.35,
  },
  '3BHK': {
    always_on:    ['Fridge', 'WiFi Router'],
    base:         ['Ceiling Fans (3)', 'LED Lights'],
    daytime:      ['Washing Machine', 'Water Pump'],
    evening:      ['TV', 'Microwave'],
    ac_capable:   true,
    ac_load_kw:   1.5,
    peak_load_kw: 4.0,
    base_load_kw: 0.60,
  },
  '4BHK': {
    always_on:    ['Fridge (2)', 'WiFi Router', 'Security System'],
    base:         ['Ceiling Fans (5)', 'LED Lights'],
    daytime:      ['Washing Machine', 'Dishwasher', 'Water Pump'],
    evening:      ['TV (2)', 'Microwave', 'Water Heater'],
    ac_capable:   true,
    ac_load_kw:   3.0,
    peak_load_kw: 6.5,
    base_load_kw: 0.85,
  },
};

function getHouseholdLoad(
  hour: number,
  bhk: string,
  isPowerCut: boolean,
): [number, string[]] {
  const p = APPLIANCE_PROFILES[bhk] ?? APPLIANCE_PROFILES['3BHK'];
  const base = p.base_load_kw;
  const peak = p.peak_load_kw;
  const appliances: string[] = [...p.always_on];

  if (isPowerCut) {
    appliances.push('Battery-backed Fans', 'Emergency Lights');
    return [parseFloat((base * 0.4).toFixed(2)), appliances];
  }

  let load: number;
  if (hour >= 0 && hour < 5) {
    load = base;
    appliances.push('Ceiling Fans (1)');
  } else if (hour >= 5 && hour < 9) {
    load = base + (peak - base) * 0.5;
    appliances.push(...p.base, ...p.daytime);
  } else if (hour >= 9 && hour < 17) {
    load = base + (peak - base) * 0.4;
    appliances.push(...p.base);
    if ([9, 10, 11].includes(hour)) appliances.push(...p.daytime);
  } else if (hour >= 17 && hour < 22) {
    load = peak;
    appliances.push(...p.base, ...p.evening);
    if (p.ac_capable && hour >= 18) {
      load += p.ac_load_kw;
      appliances.push('AC');
    }
  } else {
    load = base + (peak - base) * 0.25;
    appliances.push(...p.base);
  }

  const maxLoad = peak + (p.ac_capable ? p.ac_load_kw : 0);
  return [parseFloat(Math.min(load, maxLoad).toFixed(2)), appliances];
}

// ── Solar generation (mirrors calculate_solar_generation) ────────────────────

function calcSolarGeneration(
  hour: number,
  capacityKw: number,
  weather: WeatherData,
  dustLossFactor: number,
): number {
  if (hour < 6 || hour > 18) return 0.0;

  const solarAngle = Math.sin(Math.PI * (hour - 6) / 12);
  const cloudFactor = 1.0 - 0.75 * (weather.cloud_cover / 100);
  const rainFactor  = weather.rain_probability > 60 ? 0.85 : 1.0;
  const cleanFactor = 1.0 - dustLossFactor;

  const raw = capacityKw * solarAngle * cloudFactor * rainFactor * cleanFactor;
  return parseFloat(Math.max(0, raw).toFixed(3));
}

// ── Dust loss (mirrors calculate_dust_loss) ──────────────────────────────────

function calcDustLoss(lastCleanedDateStr: string): number {
  let lastCleaned: Date;
  try {
    lastCleaned = new Date(lastCleanedDateStr);
    if (isNaN(lastCleaned.getTime())) lastCleaned = new Date();
  } catch {
    lastCleaned = new Date();
  }
  const daysSinceClean = Math.max(0, (Date.now() - lastCleaned.getTime()) / 86_400_000);
  const weeks = daysSinceClean / 7;
  return parseFloat(Math.min(weeks * 0.01, MAX_DUST_LOSS).toFixed(3));
}

// ── Power-cut prediction ──────────────────────────────────────────────────────

const POWER_CUT_RISK: number[] = [
  0.05, 0.03, 0.03, 0.02, 0.02, 0.03,
  0.08, 0.10, 0.12, 0.08, 0.06, 0.05,
  0.08, 0.07, 0.06, 0.07, 0.10, 0.20,
  0.30, 0.35, 0.25, 0.15, 0.10, 0.07,
];

// Simple deterministic RNG (same seed formula as Python backend)
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function predictPowerCut(hour: number, weather: WeatherData, city: string): [boolean, number] {
  let risk = POWER_CUT_RISK[hour];
  if (weather.is_monsoon && weather.rain_probability > 50) risk += 0.20;
  const cityMult: Record<string, number> = { Bengaluru: 1.1, Mumbai: 1.3, Delhi: 0.9 };
  risk *= cityMult[city] ?? 1.0;

  const seed = hour * 31 + Math.round(weather.rain_probability);
  const isCut = seededRand(seed) < Math.min(risk, 0.85);
  if (!isCut) return [false, 0];

  const durations = [15, 30, 45, 60, 90, 120];
  const duration = durations[Math.floor(seededRand(seed + 7) * durations.length)];
  return [true, duration];
}

// ── Energy dispatch — balanced mode (default) ─────────────────────────────────

interface DispatchResult {
  battery_delta_kwh: number;
  grid_import_kw:    number;
  grid_export_kw:    number;
  action:            string;
  reason:            string;
}

function dispatchBalanced(
  hour: number,
  surplusKw: number,
  batterySoc: number,
  batteryKwh: number,
  batteryCapKwh: number,
  loadKw: number,
  solarKw: number,
  tariff: number,
  weather: WeatherData,
): DispatchResult {
  const r: DispatchResult = { battery_delta_kwh: 0, grid_import_kw: 0, grid_export_kw: 0, action: '', reason: '' };
  const backupReserve = 0.50;

  if (surplusKw > 0) {
    if (batterySoc < 0.90) {
      r.battery_delta_kwh = surplusKw;
      r.action = 'Charging battery (balanced mode)';
      r.reason = `Solar surplus ${surplusKw.toFixed(1)} kW → battery. Maintaining 50% backup buffer + cost saving potential.`;
    } else {
      r.grid_export_kw = surplusKw;
      r.action = 'Exporting surplus to grid';
      r.reason = `Battery full. Exporting ${surplusKw.toFixed(1)} kW surplus at ₹${tariff}/kWh.`;
    }
  } else {
    const deficitKw = Math.abs(surplusKw);
    const usableKwh = Math.max(0, batteryKwh - backupReserve * batteryCapKwh);

    if (hour >= 18 && hour < 22 && usableKwh > 0) {
      const discharge = Math.min(deficitKw, usableKwh * 0.5);
      r.battery_delta_kwh = -discharge;
      r.grid_import_kw    = Math.max(0, deficitKw - discharge);
      r.action = 'Peak-hour battery discharge (balanced)';
      r.reason = `Peak tariff ₹${tariff}/kWh. Discharging ${discharge.toFixed(1)} kWh above 50% reserve. Saving ₹${(discharge * tariff).toFixed(0)} while keeping backup buffer intact.`;
    } else {
      r.grid_import_kw = deficitKw;
      r.action = 'Grid import (within budget)';
      r.reason = `Deficit ${deficitKw.toFixed(1)} kW. Battery reserve protected. Grid import at ₹${tariff}/kWh.`;
    }
  }

  // Monsoon pre-charge override
  if (weather.is_monsoon && weather.rain_probability > 60 && batterySoc < 0.80) {
    const extra = batteryCapKwh * (0.80 - batterySoc);
    r.battery_delta_kwh += extra;
    r.grid_import_kw    += extra;
    r.action = '⚡ Monsoon pre-charge (balanced)';
    r.reason += ` Monsoon override: pre-charging to 80% — rain probability ${weather.rain_probability}%.`;
  }
  return r;
}

function dispatchCostSave(
  hour: number,
  surplusKw: number,
  batterySoc: number,
  batteryKwh: number,
  batteryCapKwh: number,
  loadKw: number,
  solarKw: number,
  tariff: number,
  weather: WeatherData,
): DispatchResult {
  const r: DispatchResult = { battery_delta_kwh: 0, grid_import_kw: 0, grid_export_kw: 0, action: '', reason: '' };

  if (surplusKw > 0) {
    if (batterySoc < 0.95) {
      r.battery_delta_kwh = Math.min(surplusKw, batteryCapKwh * (0.95 - batterySoc));
      r.action = 'Charging battery from solar surplus';
      r.reason = `Solar surplus ${surplusKw.toFixed(1)} kW — storing in battery to use during peak hours. Tariff now: ₹${tariff}/kWh.`;
    } else {
      r.grid_export_kw = surplusKw;
      r.action = 'Exporting excess solar to grid';
      r.reason = `Battery full. Feeding ${surplusKw.toFixed(1)} kW surplus to grid at ₹${tariff}/kWh.`;
    }
  } else {
    const deficitKw = Math.abs(surplusKw);
    if (hour >= 18 && hour < 22) {
      if (batterySoc > 0.15) {
        const discharge = Math.min(deficitKw, batteryKwh * 0.5);
        r.battery_delta_kwh = -discharge;
        r.grid_import_kw    = Math.max(0, deficitKw - discharge);
        r.action = 'Discharging battery — peak tariff hour';
        r.reason = `Peak tariff ₹${tariff}/kWh active (18:00–22:00). Discharging battery saves ₹${(discharge * tariff).toFixed(0)} vs. grid import.`;
      } else {
        r.grid_import_kw = deficitKw;
        r.action = 'Grid import (battery low)';
        r.reason = `Battery SoC ${(batterySoc * 100).toFixed(0)}% too low to discharge. Importing from grid at ₹${tariff}/kWh.`;
      }
    } else if (hour >= 22 || hour < 6) {
      if (batterySoc < 0.8) {
        const charge = Math.min(1.5, batteryCapKwh * (0.8 - batterySoc));
        r.grid_import_kw    = deficitKw + charge;
        r.battery_delta_kwh = charge;
        r.action = 'Off-peak charging from grid';
        r.reason = `Off-peak tariff ₹${tariff}/kWh — charging battery cheaply for tomorrow's peak discharge.`;
      } else {
        r.grid_import_kw = deficitKw;
        r.action = 'Grid import';
        r.reason = `Battery charged. Importing deficit ${deficitKw.toFixed(1)} kW from grid at cheap off-peak rate ₹${tariff}/kWh.`;
      }
    } else {
      r.grid_import_kw = deficitKw;
      r.action = 'Grid import';
      r.reason = `Solar ${solarKw.toFixed(1)} kW insufficient for load ${loadKw.toFixed(1)} kW. Importing ${deficitKw.toFixed(1)} kW from grid.`;
    }
  }
  return r;
}

function dispatchBackup(
  hour: number,
  surplusKw: number,
  batterySoc: number,
  batteryKwh: number,
  batteryCapKwh: number,
  loadKw: number,
  solarKw: number,
  tariff: number,
  nextHourCut: boolean,
): DispatchResult {
  const r: DispatchResult = { battery_delta_kwh: 0, grid_import_kw: 0, grid_export_kw: 0, action: '', reason: '' };
  const targetSoc = 0.90;

  if (surplusKw > 0) {
    if (batterySoc < targetSoc) {
      r.battery_delta_kwh = surplusKw;
      r.action = 'Charging battery — backup mode';
      r.reason = `Backup Priority: keeping battery charged to 90%. Solar surplus ${surplusKw.toFixed(1)} kW → battery.`;
    } else {
      r.grid_export_kw = surplusKw;
      r.action = 'Battery full — exporting surplus';
      r.reason = `Battery at ${(batterySoc * 100).toFixed(0)}% (target 90%). Exporting ${surplusKw.toFixed(1)} kW to grid.`;
    }
  } else {
    const deficitKw = Math.abs(surplusKw);
    if (nextHourCut && batterySoc > 0.3) {
      r.grid_import_kw = deficitKw;
      r.action = 'Holding battery — power cut expected';
      r.reason = `Power cut predicted next hour. Preserving battery at ${(batterySoc * 100).toFixed(0)}% for backup.`;
    } else if (batterySoc < targetSoc) {
      const charge = Math.min(2.0, batteryCapKwh * (targetSoc - batterySoc));
      r.grid_import_kw    = deficitKw + charge;
      r.battery_delta_kwh = charge;
      r.action = 'Grid charging — maintaining backup buffer';
      r.reason = `Battery SoC ${(batterySoc * 100).toFixed(0)}% below 90% target. Topping up from grid ₹${tariff}/kWh.`;
    } else {
      r.grid_import_kw = deficitKw;
      r.action = 'Grid import';
      r.reason = `Meeting ${deficitKw.toFixed(1)} kW deficit from grid. Battery reserved for outages.`;
    }
  }
  return r;
}

function dispatchCarbon(
  surplusKw: number,
  batterySoc: number,
  batteryKwh: number,
  batteryCapKwh: number,
  loadKw: number,
  solarKw: number,
  tariff: number,
): DispatchResult {
  const r: DispatchResult = { battery_delta_kwh: 0, grid_import_kw: 0, grid_export_kw: 0, action: '', reason: '' };

  if (surplusKw > 0) {
    if (batterySoc < 0.95) {
      r.battery_delta_kwh = surplusKw;
      r.action = 'Storing clean solar energy';
      r.reason = `Carbon-First: maximising solar storage. ${surplusKw.toFixed(1)} kW → battery. Avoids ${(surplusKw * CO2_FACTOR).toFixed(2)} kg CO₂.`;
    } else {
      r.grid_export_kw = surplusKw;
      r.action = 'Exporting clean energy to grid';
      r.reason = `Battery full. Exporting ${surplusKw.toFixed(1)} kW clean solar to grid — decarbonising neighbours!`;
    }
  } else {
    const deficitKw = Math.abs(surplusKw);
    if (batterySoc > 0.10) {
      const discharge = Math.min(deficitKw, batteryKwh);
      const remainder = Math.max(0, deficitKw - discharge);
      r.battery_delta_kwh = -discharge;
      r.grid_import_kw    = remainder;
      r.action = 'Discharging battery — avoiding grid carbon';
      r.reason = `Discharging ${discharge.toFixed(1)} kWh clean storage instead of grid. Avoids ${(discharge * CO2_FACTOR).toFixed(2)} kg CO₂/hr.`;
    } else {
      r.grid_import_kw = deficitKw;
      r.action = '⚠️ Grid import (critical)';
      r.reason = `Battery critically low (${(batterySoc * 100).toFixed(0)}%). Must import ${deficitKw.toFixed(1)} kW from grid.`;
    }
  }
  return r;
}

function dispatch(
  hour: number,
  solarKw: number,
  loadKw: number,
  batterySoc: number,
  batteryCapKwh: number,
  weather: WeatherData,
  priorityMode: string,
  nextHourCut: boolean,
): DispatchResult {
  const batteryKwh = batterySoc * batteryCapKwh;
  const surplusKw  = solarKw - loadKw;
  const tariff     = getTariff(hour);

  switch (priorityMode) {
    case 'cost_save':
      return dispatchCostSave(hour, surplusKw, batterySoc, batteryKwh, batteryCapKwh, loadKw, solarKw, tariff, weather);
    case 'backup_priority':
      return dispatchBackup(hour, surplusKw, batterySoc, batteryKwh, batteryCapKwh, loadKw, solarKw, tariff, nextHourCut);
    case 'carbon_first':
      return dispatchCarbon(surplusKw, batterySoc, batteryKwh, batteryCapKwh, loadKw, solarKw, tariff);
    default:
      return dispatchBalanced(hour, surplusKw, batterySoc, batteryKwh, batteryCapKwh, loadKw, solarKw, tariff, weather);
  }
}

// ── Weather defaults per city ─────────────────────────────────────────────────

function getDefaultWeather(city: string): WeatherData {
  const map: Record<string, WeatherData> = {
    Bengaluru: { city: 'Bengaluru', temperature: 28, cloud_cover: 20, rain_probability: 15, wind_speed: 12, condition: 'sunny',        is_monsoon: false, uv_index: 7 },
    Delhi:     { city: 'Delhi',     temperature: 35, cloud_cover: 15, rain_probability: 5,  wind_speed: 8,  condition: 'sunny',        is_monsoon: false, uv_index: 9 },
    Mumbai:    { city: 'Mumbai',    temperature: 30, cloud_cover: 40, rain_probability: 40, wind_speed: 18, condition: 'partly_cloudy', is_monsoon: false, uv_index: 6 },
  };
  return map[city] ?? map['Delhi'];
}

// ── Main local simulation entry point ────────────────────────────────────────

export function computeLocalSimulation(settings: HouseholdSettings): SimulationResult {
  const {
    solar_capacity_kw,
    battery_capacity_kwh,
    battery_initial_soc,
    bhk_size,
    city,
    priority_mode,
    last_cleaned_date,
    panel_installation_date,
  } = settings;

  const weather     = getDefaultWeather(city);
  const dustLoss    = calcDustLoss(last_cleaned_date);

  let batterySoc    = Math.max(0.1, Math.min(1.0, battery_initial_soc));
  const hourlyData: HourlyDataPoint[]   = [];
  const decisionLog: DecisionLogEntry[] = [];

  let totalCost = 0, totalSavings = 0, totalSolar = 0, totalLoad = 0;
  let totalGridImport = 0, totalGridExport = 0, totalCO2 = 0;
  let powerCutEvents = 0, powerCutMinutes = 0, dustLossKwh = 0;

  // Pre-compute power cuts for all 24 hours
  const cuts: [boolean, number][] = Array.from({ length: 24 }, (_, h) =>
    predictPowerCut(h, weather, city)
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date().toISOString().split('T')[0];

  for (let h = 0; h < 24; h++) {
    const [isPowerCut, cutDuration] = cuts[h];
    const [nextCut]                 = cuts[(h + 1) % 24];

    const solarKw    = calcSolarGeneration(h, solar_capacity_kw, weather, dustLoss);
    const [loadKw, appliances] = getHouseholdLoad(h, bhk_size, isPowerCut);
    const tariff     = getTariff(h);
    const battKwh    = batterySoc * battery_capacity_kwh;

    const result     = dispatch(h, solarKw, loadKw, batterySoc, battery_capacity_kwh, weather, priority_mode, nextCut);

    // Clamp battery SoC
    const newSocRaw  = batterySoc + result.battery_delta_kwh / battery_capacity_kwh;
    batterySoc       = Math.max(0.0, Math.min(1.0, newSocRaw));

    const withoutSolarCost = loadKw * tariff;
    const hourCost         = result.grid_import_kw * tariff;
    const hourSavings      = withoutSolarCost - hourCost;
    const co2Saved         = solarKw * CO2_FACTOR;
    const dustLossHour     = solarKw * dustLoss;

    totalCost       += hourCost;
    totalSavings    += hourSavings;
    totalSolar      += solarKw;
    totalLoad       += loadKw;
    totalGridImport += result.grid_import_kw;
    totalGridExport += result.grid_export_kw;
    totalCO2        += co2Saved;
    dustLossKwh     += dustLossHour;
    if (isPowerCut) { powerCutEvents++; powerCutMinutes += cutDuration; }

    hourlyData.push({
      hour: h,
      solar_generation_kw:  solarKw,
      battery_soc:          parseFloat(batterySoc.toFixed(3)),
      battery_soc_kwh:      parseFloat((batterySoc * battery_capacity_kwh).toFixed(3)),
      grid_import_kw:       parseFloat(result.grid_import_kw.toFixed(3)),
      grid_export_kw:       parseFloat(result.grid_export_kw.toFixed(3)),
      household_load_kw:    loadKw,
      is_power_cut:         isPowerCut,
      power_cut_duration_min: cutDuration,
      active_appliances:    appliances,
      tariff,
      net_cost:             parseFloat(hourCost.toFixed(2)),
      dust_loss_factor:     dustLoss,
    });

    // Decision log: emit for interesting hours or events
    const isInteresting =
      isPowerCut ||
      result.action.includes('pre-charge') ||
      result.action.includes('peak') ||
      h === 10 || h === 18 || h === 22;

    if (isInteresting || h % 4 === 0) {
      let icon = '⚡';
      let severity: DecisionLogEntry['severity'] = 'info';
      if (isPowerCut)                              { icon = '🔴'; severity = 'critical'; }
      else if (solarKw > loadKw)                   { icon = '☀️'; severity = 'success'; }
      else if (result.action.includes('peak'))     { icon = '🔋'; severity = 'success'; }
      else if (result.action.includes('Monsoon'))  { icon = '🌧️'; severity = 'warning'; }
      else if (result.action.includes('critical')) { icon = '⚠️'; severity = 'warning'; }

      decisionLog.push({
        timestamp: `${today}T${pad(h)}:00:00`,
        action:    result.action,
        reason:    result.reason,
        impact_inr:    parseFloat(Math.abs(hourSavings).toFixed(2)),
        impact_co2_kg: parseFloat(co2Saved.toFixed(3)),
        priority_mode,
        icon,
        severity,
      });
    }
  }

  const selfSufficiency = totalLoad > 0
    ? Math.min(100, ((totalSolar - totalGridExport) / totalLoad) * 100)
    : 0;

  const summary: DaySummary = {
    total_solar_kwh:         parseFloat(totalSolar.toFixed(3)),
    total_household_kwh:     parseFloat(totalLoad.toFixed(3)),
    total_grid_import_kwh:   parseFloat(totalGridImport.toFixed(3)),
    total_grid_export_kwh:   parseFloat(totalGridExport.toFixed(3)),
    total_cost_inr:          parseFloat(totalCost.toFixed(2)),
    total_savings_inr:       parseFloat(totalSavings.toFixed(2)),
    total_co2_avoided_kg:    parseFloat(totalCO2.toFixed(3)),
    power_cut_events:        powerCutEvents,
    power_cut_duration_min:  powerCutMinutes,
    dust_loss_kwh:           parseFloat(dustLossKwh.toFixed(3)),
    self_sufficiency_pct:    parseFloat(selfSufficiency.toFixed(1)),
  };

  return {
    created_at:   new Date().toISOString(),
    settings,
    weather,
    hourly_data:  hourlyData,
    decision_log: decisionLog,
    summary,
  };
}
