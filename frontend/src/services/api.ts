import axios from 'axios';
import { HouseholdSettings, SimulationResult, SubsidyInfo, WeatherData } from '../types';

// Determine the API base URL. Fallback to current domain in production if not specified.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Run a new energy simulation.
   * If saveToDb is true, the simulation result is stored.
   */
  runSimulation: async (settings: HouseholdSettings, saveToDb = true): Promise<SimulationResult> => {
    const response = await client.post<SimulationResult>('/api/simulation/run', {
      settings,
      save_to_db: saveToDb,
    });
    return response.data;
  },

  /**
   * Run a default simulation (initial dashboard load).
   */
  getDefaultSimulation: async (): Promise<SimulationResult> => {
    const response = await client.get<SimulationResult>('/api/simulation/default');
    return response.data;
  },

  /**
   * Fetch historical simulation summaries.
   */
  getSimulationHistory: async (limit = 10): Promise<{ simulations: any[]; count: number }> => {
    const response = await client.get(`/api/simulation/history?limit=${limit}`);
    return response.data;
  },

  /**
   * Calculate PM Surya Ghar subsidy and payback projections.
   */
  getSubsidyInfo: async (solarKw: number, cost: number): Promise<SubsidyInfo> => {
    const response = await client.get<SubsidyInfo>(
      `/api/simulation/subsidy?solar_kw=${solarKw}&installation_cost=${cost}`
    );
    return response.data;
  },

  /**
   * Fetch current user settings.
   */
  getSettings: async (userId = 'default'): Promise<HouseholdSettings> => {
    const response = await client.get<HouseholdSettings>(`/api/settings/${userId}`);
    return response.data;
  },

  /**
   * Save user settings.
   */
  saveSettings: async (userId = 'default', settings: HouseholdSettings): Promise<any> => {
    const response = await client.post(`/api/settings/${userId}`, settings);
    return response.data;
  },

  /**
   * Fetch current weather for a city.
   */
  getWeather: async (city: string): Promise<WeatherData> => {
    const response = await client.get<WeatherData>(`/api/settings/weather/${city}`);
    return response.data;
  },
};
