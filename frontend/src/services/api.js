import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  runSimulation: async (settings, saveToDb = true) => {
    const response = await client.post('/api/simulation/run', {
      settings,
      save_to_db: saveToDb,
    });
    return response.data;
  },

  getDefaultSimulation: async () => {
    const response = await client.get('/api/simulation/default');
    return response.data;
  },

  getSimulationHistory: async (limit = 10) => {
    const response = await client.get(`/api/simulation/history?limit=${limit}`);
    return response.data;
  },

  getSubsidyInfo: async (solarKw, cost) => {
    const response = await client.get(
      `/api/simulation/subsidy?solar_kw=${solarKw}&installation_cost=${cost}`
    );
    return response.data;
  },

  getSettings: async (userId = 'default') => {
    const response = await client.get(`/api/settings/${userId}`);
    return response.data;
  },

  saveSettings: async (userId = 'default', settings) => {
    const response = await client.post(`/api/settings/${userId}`, settings);
    return response.data;
  },

  getWeather: async (city) => {
    const response = await client.get(`/api/settings/weather/${city}`);
    return response.data;
  },
};
export default api;
