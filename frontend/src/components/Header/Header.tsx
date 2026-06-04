import React, { useState, useRef, useEffect } from 'react';
import { Sun, Battery, Menu, Settings, LogOut, Sliders, MapPin, Building2, ChevronDown, RefreshCw } from 'lucide-react';
import { HouseholdSettings } from '../../types';

interface HeaderProps {
  priorityMode: string;
  isSimulating: boolean;
  user: { name: string; email: string; bhk_size: string; city: string } | null;
  settings: HouseholdSettings;
  onSettingsChange: (settings: HouseholdSettings) => void;
  onLogout: () => void;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  priorityMode, 
  isSimulating,
  user,
  settings,
  onSettingsChange,
  onLogout,
  onMenuClick,
}) => {
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'cost_save':
        return { label: 'Cost-Save Mode', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 text-glow-yellow' };
      case 'backup_priority':
        return { label: 'Backup Priority', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'carbon_first':
        return { label: 'Carbon-First Mode', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-glow-green' };
      default:
        return { label: 'Balanced Mode', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20 text-glow-blue' };
    }
  };

  const modeInfo = getModeLabel(priorityMode);

  const handleSliderChange = (field: keyof HouseholdSettings, value: number) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-xl px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
      
      {/* Mobile Drawer Trigger & Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition-colors"
          title="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            Energy Control Center
            {isSimulating && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Syncing
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-500 font-mono hidden md:block">PM Surya Ghar smart rooftop solar and storage advisory engine</p>
        </div>
      </div>

      {/* User Welcome, Indicators, & Settings Popover */}
      <div className="flex items-center gap-3 relative" ref={popoverRef}>
        
        {/* Welcome message with avatar */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-900/40 border border-slate-850">
            <div className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-[10px]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left leading-none">
              <span className="text-[9px] text-slate-500 font-mono block">Welcome back,</span>
              <span className="text-xs font-bold text-slate-200">{user.name}</span>
            </div>
          </div>
        )}

        {/* Priority mode tag */}
        <div className={`hidden md:block px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${modeInfo.color}`}>
          {modeInfo.label}
        </div>

        {/* Premium Settings Popover Button */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all duration-200 ${
            showConfig
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-white hover:border-slate-800'
          }`}
          title="Configure System Parameters"
        >
          <Sliders className={`h-4 w-4 ${isSimulating ? 'animate-spin-slow' : ''}`} />
          <span className="hidden sm:inline">System Config</span>
          <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-300 ${showConfig ? 'rotate-180' : ''}`} />
        </button>

        {/* Popover Content */}
        {showConfig && (
          <div className="absolute right-0 top-full mt-3 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-slate-900/95 border border-slate-800/80 rounded-3xl p-5 shadow-2xl backdrop-blur-xl animate-fade-up z-50">
            <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800/60 mb-4">
              <Settings className="h-4.5 w-4.5 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Rooftop & Battery Settings</h3>
            </div>

            <div className="space-y-4">
              {/* City selector */}
              <div>
                <label className="text-[9px] uppercase font-bold tracking-wider font-mono text-slate-500 block mb-1.5">
                  Installation City
                </label>
                <div className="relative">
                  <select
                    value={settings.city}
                    onChange={(e) => onSettingsChange({ ...settings, city: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500/80 font-semibold appearance-none cursor-pointer"
                  >
                    <option value="Bengaluru">Bengaluru (Karnataka)</option>
                    <option value="Delhi">Delhi (NCR Region)</option>
                    <option value="Mumbai">Mumbai (Maharashtra)</option>
                  </select>
                  <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-emerald-500 pointer-events-none" />
                  <div className="absolute right-3 top-3 h-1.5 w-1.5 border-r-2 border-b-2 border-slate-500 rotate-45 pointer-events-none"></div>
                </div>
              </div>

              {/* BHK Type selector */}
              <div>
                <label className="text-[9px] uppercase font-bold tracking-wider font-mono text-slate-500 block mb-1.5">
                  Household Type
                </label>
                <div className="relative">
                  <select
                    value={settings.bhk_size}
                    onChange={(e) => onSettingsChange({ ...settings, bhk_size: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500/80 font-semibold appearance-none cursor-pointer"
                  >
                    <option value="2BHK">2 BHK Apartment / House</option>
                    <option value="3BHK">3 BHK Standard Rooftop</option>
                    <option value="4BHK">4 BHK Luxury Rooftop</option>
                  </select>
                  <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-emerald-500 pointer-events-none" />
                  <div className="absolute right-3 top-3 h-1.5 w-1.5 border-r-2 border-b-2 border-slate-500 rotate-45 pointer-events-none"></div>
                </div>
              </div>

              {/* Solar Panel Size slider */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-amber-400" /> Solar Size
                  </span>
                  <span className="font-mono text-white font-extrabold">{settings.solar_capacity_kw.toFixed(1)} kWp</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={settings.solar_capacity_kw}
                  onChange={(e) => handleSliderChange('solar_capacity_kw', parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Battery Size slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Battery className="h-4 w-4 text-violet-400" /> Battery Storage
                  </span>
                  <span className="font-mono text-white font-extrabold">{settings.battery_capacity_kwh.toFixed(0)} kWh</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="15.0"
                  step="1.0"
                  value={settings.battery_capacity_kwh}
                  onChange={(e) => handleSliderChange('battery_capacity_kwh', parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

      </div>
      
    </header>
  );
};

export default Header;

