import React, { useEffect, useState, useRef } from 'react';
import { 
  Sun, 
  Battery, 
  Leaf, 
  Zap, 
  AlertTriangle, 
  Database,
  Building2,
  Calendar,
  Compass,
  LineChart,
  LayoutDashboard,
  ShieldAlert,
  Server,
  Sparkles,
  HelpCircle,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Mail,
  MapPin
} from 'lucide-react';
import { api } from './services/api';
import { SimulationResult, HouseholdSettings } from './types';
import { computeLocalSimulation } from './utils/localSimulation';
import { Header } from './components/Header/Header';
import { LiveMetrics } from './components/dashboard/LiveMetrics';
import { ModeSelector } from './components/dashboard/ModeSelector';
import { SimulationChart } from './components/Charts/SimulationChart';
import { DecisionLog } from './components/DecisionLog/DecisionLog';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { PaybackTracker } from './components/PaybackTracker/PaybackTracker';
import { SimulationModels } from './pages/SimulationModels';
import { PmSuryaGharRoi } from './pages/PmSuryaGharRoi';
import { GridTariffTables } from './pages/GridTariffTables';

export const App: React.FC = () => {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [settings, setSettings] = useState<HouseholdSettings>({
    user_id: 'default',
    bhk_size: '3BHK',
    solar_capacity_kw: 3.0,
    battery_capacity_kwh: 5.0,
    battery_initial_soc: 0.6,
    city: 'Bengaluru',
    priority_mode: 'balanced',
    panel_installation_date: '2024-01-01',
    last_cleaned_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days default
    installation_cost: 180000,
  });

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [dbMode, setDbMode] = useState<string>('local_json');
  const [highlightedHour, setHighlightedHour] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<'dashboard' | 'simulation' | 'roi' | 'tariffs'>('dashboard');
  
  // Responsive sidebar states
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(false);

  // Simulated Authentication states
  const [user, setUser] = useState<{ name: string; email: string; bhk_size: string; city: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  
  // Auth Form inputs
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authBhk, setAuthBhk] = useState<'2BHK' | '3BHK' | '4BHK'>('3BHK');
  const [authCity, setAuthCity] = useState<'Bengaluru' | 'Delhi' | 'Mumbai'>('Bengaluru');

  // Prevent simulation run on initial change until authenticated/loaded
  const isInitialized = useRef<boolean>(false);

  // Compute dust build-up duration
  const getDustDays = () => {
    if (!settings.last_cleaned_date) return 0;
    const last = new Date(settings.last_cleaned_date);
    const diffTime = Math.abs(Date.now() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 0 : diffDays;
  };

  // Run simulation query
  const handleRunSimulation = async (customSettings = settings) => {
    try {
      setIsSimulating(true);
      setErrorMsg(null);

      // Save user configuration
      await api.saveSettings('default', customSettings);

      // Fetch fresh rules simulation results
      const data = await api.runSimulation(customSettings);
      setResult(data);
      setDbMode(data.id ? 'mongodb' : 'local_json');
    } catch (err: any) {
      console.error('Simulation failure', err);
      setErrorMsg('FastAPI back-end is currently offline. Running local calculations fallback.');

      // Attempt backend default simulation first
      try {
        const fallback = await api.getDefaultSimulation();
        const updatedFallback = {
          ...fallback,
          settings: customSettings,
          hourly_data: fallback.hourly_data.map((d: any) => ({
            ...d,
            solar_generation_kw: d.solar_generation_kw * (customSettings.solar_capacity_kw / 3.0),
          }))
        };
        setResult(updatedFallback);
      } catch (_fallbackErr) {
        // Both API paths failed — run fully local simulation engine
        console.warn('Both API paths offline. Using built-in local simulation engine.');
        const localResult = computeLocalSimulation(customSettings);
        setResult(localResult);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  // Initial load check for authentication and fetch profile
  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('solarsmart_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        try {
          setIsSimulating(true);
          const savedSettings = await api.getSettings('default');
          const finalSettings = {
            ...savedSettings,
            bhk_size: parsedUser.bhk_size || savedSettings.bhk_size,
            city: parsedUser.city || savedSettings.city,
          };
          setSettings(finalSettings);
          isInitialized.current = true;
          
          const data = await api.runSimulation(finalSettings);
          setResult(data);
          setDbMode(data.id ? 'mongodb' : 'local_json');
        } catch (err) {
          console.warn('Backend unavailable, running local simulation.');
          const currentSettings = {
            ...settings,
            bhk_size: parsedUser.bhk_size || settings.bhk_size,
            city: parsedUser.city || settings.city,
          };
          setSettings(currentSettings);
          isInitialized.current = true;
          handleRunSimulation(currentSettings);
        } finally {
          setIsSimulating(false);
        }
      } else {
        setShowAuthModal(true);
      }
    };
    checkAuth();
  }, []);

  // Debounced execution of simulation when slider or dropdown settings change
  useEffect(() => {
    if (!isInitialized.current || !user) return;

    const delayDebounce = setTimeout(() => {
      handleRunSimulation(settings);
    }, 450); // 450ms debounce for sliders

    return () => clearTimeout(delayDebounce);
  }, [
    settings.solar_capacity_kw,
    settings.battery_capacity_kwh,
    settings.bhk_size,
    settings.city
  ]);

  // Clean panels action resets dust loss parameters
  const handleCleanPanels = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = {
      ...settings,
      last_cleaned_date: todayStr,
    };
    setSettings(updated);
    handleRunSimulation(updated);
  };

  // Adjust parameters
  const handleSettingsChange = (newSettings: HouseholdSettings) => {
    // 3kW is approx 1.8 Lakhs. Scale: 60k per kW
    const calculatedCost = newSettings.solar_capacity_kw * 60000;
    const updated = {
      ...newSettings,
      installation_cost: calculatedCost
    };
    setSettings(updated);
  };

  const handlePriorityModeChange = (mode: HouseholdSettings['priority_mode']) => {
    const updated = {
      ...settings,
      priority_mode: mode
    };
    setSettings(updated);
    handleRunSimulation(updated);
  };

  const handleCapacityChange = (cap: number) => {
    if (settings.solar_capacity_kw === cap) return;
    const calculatedCost = cap * 60000;
    const updated = {
      ...settings,
      solar_capacity_kw: cap,
      installation_cost: calculatedCost
    };
    setSettings(updated);
  };

  // Handles simulated sign up / login
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim()) return;

    const profile = {
      name: authName,
      email: authEmail || 'user@example.com',
      bhk_size: authBhk,
      city: authCity,
    };

    localStorage.setItem('solarsmart_user', JSON.stringify(profile));
    setUser(profile);
    
    const updated = {
      ...settings,
      bhk_size: authBhk,
      city: authCity,
    };
    setSettings(updated);
    isInitialized.current = true;
    setShowAuthModal(false);
    handleRunSimulation(updated);
  };

  // Handles simulated logout
  const handleLogout = () => {
    localStorage.removeItem('solarsmart_user');
    setUser(null);
    setAuthName('');
    setAuthEmail('');
    isInitialized.current = false;
    setShowAuthModal(true);
  };  // Active hour information (defaults to noon hour 12:00)
  const activeHourIndex = highlightedHour !== null ? highlightedHour : 12;
  const activePoint = result?.hourly_data?.[activeHourIndex];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* ==================== LEFT SIDEBAR ==================== */}
      {/* Overlay backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/80 border-r border-slate-900/60 p-6 flex flex-col justify-between transform transition-transform duration-300 xl:translate-x-0 xl:static xl:h-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6 flex flex-col h-full justify-between">
          <div className="space-y-6">
            {/* Logo Branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Sun className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-200">
                    SolarSmart
                  </h1>
                  <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Advisor</p>
                </div>
              </div>
              
              {/* Close sidebar button on mobile */}
              <button 
                onClick={() => setSidebarOpen(false)}
                className="xl:hidden p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5 pt-4">
              <button
                onClick={() => { setActivePage('dashboard'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  activePage === 'dashboard'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                    : 'text-slate-405 border-transparent hover:text-slate-200 hover:bg-slate-900/50 hover:border-slate-900'
                }`}
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
                Smart Dashboard
              </button>
              <button
                onClick={() => { setActivePage('simulation'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  activePage === 'simulation'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                    : 'text-slate-405 border-transparent hover:text-slate-200 hover:bg-slate-900/50 hover:border-slate-900'
                }`}
              >
                <LineChart className="h-4.5 w-4.5" />
                Simulation Models
              </button>
              <button
                onClick={() => { setActivePage('roi'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  activePage === 'roi'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                    : 'text-slate-405 border-transparent hover:text-slate-200 hover:bg-slate-900/50 hover:border-slate-900'
                }`}
              >
                <Building2 className="h-4.5 w-4.5" />
                PM Surya Ghar ROI
              </button>
              <button
                onClick={() => { setActivePage('tariffs'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  activePage === 'tariffs'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                    : 'text-slate-405 border-transparent hover:text-slate-200 hover:bg-slate-900/50 hover:border-slate-900'
                }`}
              >
                <Compass className="h-4.5 w-4.5" />
                Grid Tariff Tables
              </button>
            </nav>
          </div>

          {/* Compact User Card with integrated Logout */}
          {user && (
            <div className="pt-4 border-t border-slate-905 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-450 flex items-center justify-center text-white font-black text-sm shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">{settings.bhk_size} • {settings.city}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-all active:scale-95"
                title="Logout Profile"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>


      {/* ==================== MIDDLE MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Header */}
        <Header 
          priorityMode={settings.priority_mode}
          isSimulating={isSimulating}
          user={user}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onLogout={handleLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Scrollable Dashboard View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Error fallback message */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3.5 text-red-400 text-xs font-mono">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-extrabold text-white">Simulation Engine Dynamic Mode Active</p>
                <p className="mt-1 text-slate-400">
                  Rooftop simulation inputs synchronized dynamically. Fast mathematical fallback model deployed for real-time slider response.
                </p>
              </div>
            </div>
          )}

          {activePage === 'dashboard' && (
            <>
              {/* Core metrics bar */}
              {result && activePoint && (
                <LiveMetrics
                  activePoint={activePoint}
                  summary={result.summary}
                  weather={result.weather}
                  batteryCapacityKwh={settings.battery_capacity_kwh}
                  bhkSize={settings.bhk_size}
                />
              )}

              {/* Primary Layout Columns (Charts and Decision Logs) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Simulation Chart & Mode Select on tablet */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Hourly graph */}
                  {result && (
                    <SimulationChart data={result.hourly_data} />
                  )}

                  {/* Explainable Decision Log (Visual Highlight) */}
                  {result && (
                    <DecisionLog
                      logs={result.decision_log}
                      highlightedHour={highlightedHour}
                      onHourSelect={setHighlightedHour}
                    />
                  )}
                </div>

                {/* Payback Tracker, Weather, Maintenance Stack */}
                <div className="space-y-6">
                  
                  {/* PM Surya Ghar financial tracker */}
                  <PaybackTracker
                    solarCapacityKw={settings.solar_capacity_kw}
                    installationCost={settings.installation_cost}
                  />

                  {/* Panel Maintenance card */}
                  <div className="glass-card p-5 bg-slate-900/40 border border-slate-800/80 space-y-4">
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Rooftop Maintenance</h4>
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="text-sm font-bold text-white">Soiling & Dust Accumulation</p>
                        <p className="text-slate-400 mt-0.5">{getDustDays()} days since last wash</p>
                        <p className="text-[10px] font-mono mt-1">
                          Generation: <span className={`${getDustDays() > 0 ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}`}>-{(Math.min(getDustDays() * 0.15, 25)).toFixed(1)}%</span>
                        </p>
                      </div>
                      <button
                        onClick={handleCleanPanels}
                        disabled={getDustDays() === 0}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-mono font-bold transition-all border ${
                          getDustDays() === 0
                            ? 'border-slate-850 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                            : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Wash Panels
                      </button>
                    </div>
                  </div>
                  
                  {/* Live Conditions block */}
                  {result && (
                    <div className="glass-card p-5 bg-slate-900/40 border border-slate-800/80">
                      <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-3">Live Rooftop Conditions</h4>
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="text-sm font-bold text-white capitalize">{result.weather.city} Weather</p>
                          <p className="text-slate-400 mt-0.5">Wind: {result.weather.wind_speed} km/h | UV Index: {result.weather.uv_index}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-emerald-400">{result.weather.temperature}°C</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cloud: {result.weather.cloud_cover}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activePage === 'simulation' && (
            <SimulationModels
              settings={settings}
              onPriorityModeChange={handlePriorityModeChange}
              onSettingsChange={handleSettingsChange}
              onRunSimulation={handleRunSimulation}
            />
          )}

          {activePage === 'roi' && (
            <PmSuryaGharRoi
              currentCapacity={settings.solar_capacity_kw}
              onCapacityChange={handleCapacityChange}
            />
          )}

          {activePage === 'tariffs' && (
            <GridTariffTables />
          )}

        </div>

        {/* Global Footer */}
        <footer className="border-t border-slate-900/60 py-4 bg-slate-950/40 text-center text-[10px] text-slate-500 font-mono">
          <p>© SolarSmart Advisor Rooftop Solar Optimization Platform</p>
        </footer>
      </div>

      {/* ==================== SIMULATED LOGIN/SIGNUP MODAL ==================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-955/70 border border-slate-800/80 p-6 md:p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.6)] space-y-6 transform transition-all duration-300 animate-slide-in backdrop-blur-xl">
            
            <div className="text-center space-y-2.5">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse-slow">
                <Sun className="h-6 w-6 text-glow-green" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">SolarSmart Advisor Setup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Create your household simulation profile to model solar generation, battery sizing, and time-of-day tariffs.</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Rahul Sharma"
                    required
                    className="w-full bg-slate-950/60 border border-slate-850 text-slate-205 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition-all font-semibold focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-emerald-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="rahul.sharma@example.com"
                    className="w-full bg-slate-950/60 border border-slate-850 text-slate-205 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition-all font-semibold focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-emerald-500 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Household BHK</label>
                  <div className="relative">
                    <select 
                      value={authBhk}
                      onChange={(e) => setAuthBhk(e.target.value as any)}
                      className="w-full bg-slate-950/60 border border-slate-850 text-slate-205 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-emerald-500 appearance-none font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500/20"
                    >
                      <option value="2BHK">2 BHK</option>
                      <option value="3BHK">3 BHK</option>
                      <option value="4BHK">4 BHK</option>
                    </select>
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-emerald-500 pointer-events-none" />
                    <div className="absolute right-3 top-3.5 h-2 w-2 border-r-2 border-b-2 border-slate-500 rotate-45 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block mb-1.5">City Location</label>
                  <div className="relative">
                    <select 
                      value={authCity}
                      onChange={(e) => setAuthCity(e.target.value as any)}
                      className="w-full bg-slate-950/60 border border-slate-850 text-slate-205 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-emerald-500 appearance-none font-semibold cursor-pointer focus:ring-1 focus:ring-emerald-500/20"
                    >
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Mumbai">Mumbai</option>
                    </select>
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-emerald-500 pointer-events-none" />
                    <div className="absolute right-3 top-3.5 h-2 w-2 border-r-2 border-b-2 border-slate-500 rotate-45 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-xs shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] font-mono tracking-wider uppercase"
                >
                  Create Simulated Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
