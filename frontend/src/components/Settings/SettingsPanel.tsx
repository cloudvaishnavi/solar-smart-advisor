import React, { useState } from 'react';
import { Sliders, Wrench, RefreshCw, Sun, Battery, Building2, MapPin, Sparkles, HelpCircle } from 'lucide-react';
import { HouseholdSettings } from '../../types';

interface SettingsPanelProps {
  settings: HouseholdSettings;
  onSettingsChange: (settings: HouseholdSettings) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  onCleanPanels: () => void;
  dustLossDays: number;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onRunSimulation,
  isSimulating,
  onCleanPanels,
  dustLossDays,
}) => {
  const [isCleaning, setIsCleaning] = useState<boolean>(false);

  const handleBhkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, bhk_size: e.target.value as any });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ ...settings, city: e.target.value as any });
  };

  const handleSliderChange = (field: keyof HouseholdSettings, value: number) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  // Clean action triggers a local temporary sparkle animation before resetting
  const triggerCleanAction = () => {
    setIsCleaning(true);
    setTimeout(() => {
      onCleanPanels();
      setIsCleaning(false);
    }, 1000);
  };

  const currentLoss = Math.min(dustLossDays * 0.15, 25);

  return (
    <div className="flex flex-col space-y-5 h-full">
      
      {/* Dropdown selectors for City and BHK size */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3.5">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-500 block mb-1.5">
              Installation City
            </label>
            <div className="relative">
              <select
                value={settings.city}
                onChange={handleCityChange}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold appearance-none cursor-pointer"
              >
                <option value="Bengaluru">Bengaluru (Karnataka)</option>
                <option value="Delhi">Delhi (NCR Region)</option>
                <option value="Mumbai">Mumbai (Maharashtra)</option>
              </select>
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-emerald-500 pointer-events-none" />
              <div className="absolute right-3 top-3.5 h-2 w-2 border-r-2 border-b-2 border-slate-500 rotate-45 pointer-events-none"></div>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-500 block mb-1.5">
              Household Type
            </label>
            <div className="relative">
              <select
                value={settings.bhk_size}
                onChange={handleBhkChange}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold appearance-none cursor-pointer"
              >
                <option value="2BHK">2 BHK Apartment / House</option>
                <option value="3BHK">3 BHK Standard Rooftop</option>
                <option value="4BHK">4 BHK Luxury Rooftop</option>
              </select>
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-emerald-500 pointer-events-none" />
              <div className="absolute right-3 top-3.5 h-2 w-2 border-r-2 border-b-2 border-slate-500 rotate-45 pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Sizing Sliders */}
        <div className="space-y-4 border-t border-slate-800/80 pt-4">
          
          {/* Solar Panel capacity slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500 animate-pulse-slow" />
                Solar Rooftop Size
              </span>
              <span className="font-mono text-white font-extrabold">{settings.solar_capacity_kw.toFixed(1)} kWp</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-650">1kW</span>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={settings.solar_capacity_kw}
                onChange={(e) => handleSliderChange('solar_capacity_kw', parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-slate-800"
              />
              <span className="text-[10px] font-mono text-slate-650">10kW</span>
            </div>
          </div>

          {/* Battery bank capacity slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-2">
                <Battery className="h-4 w-4 text-violet-400" />
                Battery Storage Bank
              </span>
              <span className="font-mono text-white font-extrabold">{settings.battery_capacity_kwh.toFixed(0)} kWh</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-650">2kWh</span>
              <input
                type="range"
                min="2.0"
                max="15.0"
                step="1.0"
                value={settings.battery_capacity_kwh}
                onChange={(e) => handleSliderChange('battery_capacity_kwh', parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-slate-800"
              />
              <span className="text-[10px] font-mono text-slate-650">15kWh</span>
            </div>
          </div>
        </div>

        {/* Dust Loss Penalty Widget */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 mt-2">
          <div className="space-y-1">
            <p className="text-[9px] font-bold font-mono uppercase text-slate-500">Soiling & Dust Penalty</p>
            <p className="text-xs text-slate-200 font-bold font-mono">{dustLossDays} Days of Dust</p>
            <p className="text-[10px] text-slate-400 font-mono">
              Generation: <span className={`${currentLoss > 0 ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}`}>-{currentLoss.toFixed(1)}%</span>
            </p>
          </div>
          
          <button
            onClick={triggerCleanAction}
            disabled={isCleaning || dustLossDays === 0}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
              dustLossDays === 0 
                ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] active:scale-95'
            }`}
          >
            {isCleaning ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                Washing
              </>
            ) : (
              <>
                <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                Wash Panels
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recalculate Simulation Call Action */}
      <div className="pt-4 border-t border-slate-800/60">
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.98] disabled:opacity-50 text-xs uppercase tracking-wider font-mono"
        >
          <RefreshCw className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
          {isSimulating ? 'Syncing...' : 'Sync & Recalculate'}
        </button>
      </div>
      
    </div>
  );
};

export default SettingsPanel;
