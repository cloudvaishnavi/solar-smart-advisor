export interface HouseholdSettings {
  user_id: string;
  bhk_size: '2BHK' | '3BHK' | '4BHK';
  solar_capacity_kw: number;
  battery_capacity_kwh: number;
  battery_initial_soc: number;
  city: 'Bengaluru' | 'Delhi' | 'Mumbai';
  priority_mode: 'cost_save' | 'backup_priority' | 'carbon_first' | 'balanced';
  panel_installation_date: string;
  last_cleaned_date: string;
  installation_cost: number;
}

export interface WeatherData {
  city: string;
  temperature: number;
  cloud_cover: number;
  rain_probability: number;
  wind_speed: number;
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy';
  is_monsoon: boolean;
  uv_index: number;
}

export interface HourlyDataPoint {
  hour: number;
  solar_generation_kw: number;
  battery_soc: number;
  battery_soc_kwh: number;
  grid_import_kw: number;
  grid_export_kw: number;
  household_load_kw: number;
  is_power_cut: boolean;
  power_cut_duration_min: number;
  active_appliances: string[];
  tariff: number;
  net_cost: number;
  dust_loss_factor: number;
}

export interface DecisionLogEntry {
  timestamp: string;
  action: string;
  reason: string;
  impact_inr: number;
  impact_co2_kg: number;
  priority_mode: string;
  icon: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
}

export interface DaySummary {
  total_solar_kwh: number;
  total_household_kwh: number;
  total_grid_import_kwh: number;
  total_grid_export_kwh: number;
  total_cost_inr: number;
  total_savings_inr: number;
  total_co2_avoided_kg: number;
  power_cut_events: number;
  power_cut_duration_min: number;
  dust_loss_kwh: number;
  self_sufficiency_pct: number;
}

export interface SimulationResult {
  id?: string;
  created_at: string;
  settings: HouseholdSettings;
  weather: WeatherData;
  hourly_data: HourlyDataPoint[];
  decision_log: DecisionLogEntry[];
  summary: DaySummary;
}

export interface SubsidyInfo {
  solar_capacity_kw: number;
  subsidy_amount: number;
  installation_cost: number;
  net_cost: number;
  annual_savings_inr: number;
  payback_years: number;
  co2_offset_kg_per_year: number;
  units_generated_per_year: number;
  monthly_savings_inr: number;
}
