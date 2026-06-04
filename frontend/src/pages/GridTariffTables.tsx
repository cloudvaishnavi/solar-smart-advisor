import React, { useState } from 'react';
import { 
  Compass, 
  Flame, 
  Moon, 
  Sun, 
  Info,
  Zap,
  Layers,
  MapPin
} from 'lucide-react';

interface CityPreset {
  name: string;
  discom: string;
  day: number;
  peak: number;
  offpeak: number;
  avgDailyLoad: number;
  notes: string;
}

const CITY_PRESETS: Record<string, CityPreset> = {
  bengaluru: {
    name: 'Bengaluru',
    discom: 'BESCOM (Karnataka)',
    day: 6.0,
    peak: 8.0,
    offpeak: 4.5,
    avgDailyLoad: 12,
    notes: 'Default settings for Karnataka. Peak hours are evening 6 PM – 10 PM.',
  },
  mumbai: {
    name: 'Mumbai',
    discom: 'MSEDCL (Maharashtra)',
    day: 7.2,
    peak: 9.5,
    offpeak: 5.0,
    avgDailyLoad: 15,
    notes: 'Higher base rates with a steep ₹9.5 surcharge during evening peak.',
  },
  delhi: {
    name: 'Delhi',
    discom: 'BYPL (Delhi)',
    day: 5.5,
    peak: 7.5,
    offpeak: 4.0,
    avgDailyLoad: 18,
    notes: 'Standard residential slab tariffs with night off-peak discount.',
  },
};

export const GridTariffTables: React.FC = () => {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('bengaluru');
  const [customPeak, setCustomPeak] = useState<number>(8.0);
  const [customOffPeak, setCustomOffPeak] = useState<number>(4.5);
  const [customDay, setCustomDay] = useState<number>(6.0);
  const [avgDailyLoad, setAvgDailyLoad] = useState<number>(12);

  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    if (key !== 'custom') {
      const preset = CITY_PRESETS[key];
      setCustomPeak(preset.peak);
      setCustomOffPeak(preset.offpeak);
      setCustomDay(preset.day);
      setAvgDailyLoad(preset.avgDailyLoad);
    }
  };

  const handleSliderChange = (type: 'peak' | 'offpeak' | 'day' | 'load', value: number) => {
    setSelectedPresetKey('custom');
    if (type === 'peak') setCustomPeak(value);
    else if (type === 'offpeak') setCustomOffPeak(value);
    else if (type === 'day') setCustomDay(value);
    else if (type === 'load') setAvgDailyLoad(value);
  };

  const getHourColor = (hour: number) => {
    if (hour >= 18 && hour < 22) return 'bg-rose-500 border-rose-600/40 text-rose-100 hover:bg-rose-455';
    if (hour >= 22 || hour < 6) return 'bg-sky-500 border-sky-600/40 text-sky-100 hover:bg-sky-555';
    return 'bg-amber-500 border-amber-600/40 text-amber-100 hover:bg-amber-555';
  };

  const getHourLabel = (hour: number) => {
    if (hour >= 18 && hour < 22) return `Peak Hour (₹${customPeak.toFixed(1)}/kWh)`;
    if (hour >= 22 || hour < 6) return `Off-Peak Hour (₹${customOffPeak.toFixed(1)}/kWh)`;
    return `Day Hour (₹${customDay.toFixed(1)}/kWh)`;
  };

  const computeTariffEstimate = () => {
    const offPeakLoad = avgDailyLoad * 0.25;
    const dayLoad = avgDailyLoad * 0.45;
    const peakLoad = avgDailyLoad * 0.30;

    const flatCost = avgDailyLoad * customDay;
    const smartToDBilling = (offPeakLoad * customOffPeak) + (dayLoad * customDay) + (peakLoad * customOffPeak * 1.15); 
    const dailySaving = Math.max(0, flatCost - smartToDBilling);
    
    return {
      flatCost,
      smartToDBilling,
      dailySaving,
      monthlySaving: dailySaving * 30,
    };
  };

  const stats = computeTariffEstimate();
  const savingsPercent = stats.flatCost > 0 ? Math.min(100, Math.round((stats.dailySaving / stats.flatCost) * 100)) : 0;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="h-5 w-5 text-emerald-450" /> Time-of-Day (ToD) Tariff Planner
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
            Visualize your utility pricing hours and simulate Time-of-Day (ToD) savings.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 uppercase">
            <Zap className="h-3.5 w-3.5" /> ToD Engine Active
          </span>
        </div>
      </div>

      {/* Grid Timeline Map */}
      <div className="glass-card p-6 bg-slate-900/40 border border-slate-900/60 space-y-5 animate-fade-up">
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">24-Hour Pricing Gradient Timeline</h4>
        
        {/* Seamless Premium Gradient visualizer bar */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="border border-slate-900/80 bg-slate-950 rounded-2xl overflow-hidden flex h-11 p-0.5 min-w-[640px] sm:min-w-0">
            {Array.from({ length: 24 }).map((_, h) => (
              <div 
                key={h} 
                className={`flex-1 flex flex-col justify-center items-center transition-all duration-300 hover:scale-y-[1.14] group relative cursor-pointer ${getHourColor(h)}`}
              >
                <span className="text-[9px] font-mono font-bold select-none">{h}</span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3.5 w-32 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-2xl text-center">
                  <p className="text-[9px] font-bold text-white font-mono">{String(h).padStart(2, '0')}:00 - {String((h + 1) % 24).padStart(2, '0')}:00</p>
                  <p className="text-[9px] text-slate-400 mt-1 border-t border-slate-950 pt-1 font-semibold leading-relaxed">{getHourLabel(h)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend Icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-sky-500/5 border border-sky-500/10 p-3 rounded-2xl flex items-center gap-3 text-xs">
            <Moon className="h-4 w-4 text-sky-400" />
            <div>
              <span className="text-[9px] font-mono text-slate-550 uppercase">Off-Peak Night</span>
              <p className="font-bold text-white mt-0.5">10 PM – 6 AM (₹{customOffPeak.toFixed(1)}/kWh)</p>
            </div>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl flex items-center gap-3 text-xs">
            <Sun className="h-4 w-4 text-amber-400" />
            <div>
              <span className="text-[9px] font-mono text-slate-550 uppercase">Standard Day</span>
              <p className="font-bold text-white mt-0.5">6 AM – 6 PM (₹{customDay.toFixed(1)}/kWh)</p>
            </div>
          </div>
          <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-2xl flex items-center gap-3 text-xs">
            <Flame className="h-4 w-4 text-rose-400" />
            <div>
              <span className="text-[9px] font-mono text-slate-550 uppercase">Evening Peak</span>
              <p className="font-bold text-white mt-0.5">6 PM – 10 PM (₹{customPeak.toFixed(1)}/kWh)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid customization and presets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Estimator sliders & Gauge Panel */}
        <div className="lg:col-span-1 glass-card p-5 bg-slate-900/40 border border-slate-900/60 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-900/60 pb-2">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Savings Analysis</h4>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Select Grid Preset</span>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(CITY_PRESETS).map((key) => {
                  const preset = CITY_PRESETS[key];
                  const isSelected = selectedPresetKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      type="button"
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-350 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/35 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:bg-slate-955 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-xs font-bold block">{preset.name}</span>
                        <div className={`p-1 rounded-lg border text-[9px] font-mono leading-none ${isSelected ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-bold' : 'border-slate-850 bg-slate-900 text-slate-500'}`}>
                          {preset.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-500 font-mono mt-2 truncate w-full">{preset.discom.split(' ')[0]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-3 border-t border-slate-900/60">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-455 font-mono">Daily Load</span>
                  <span className="text-white font-bold font-mono">{avgDailyLoad} kWh</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="40" 
                  value={avgDailyLoad} 
                  onChange={(e) => handleSliderChange('load', parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-455 font-mono">Peak Tariff</span>
                  <span className="text-rose-400 font-bold font-mono">₹{customPeak.toFixed(1)}/kWh</span>
                </div>
                <input 
                  type="range" 
                  min="5.0" 
                  max="14.0" 
                  step="0.5"
                  value={customPeak} 
                  onChange={(e) => handleSliderChange('peak', parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-455 font-mono">Day Tariff</span>
                  <span className="text-amber-500 font-bold font-mono">₹{customDay.toFixed(1)}/kWh</span>
                </div>
                <input 
                  type="range" 
                  min="4.0" 
                  max="10.0" 
                  step="0.5"
                  value={customDay} 
                  onChange={(e) => handleSliderChange('day', parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-455 font-mono">Off-Peak Rate</span>
                  <span className="text-sky-400 font-bold font-mono">₹{customOffPeak.toFixed(1)}/kWh</span>
                </div>
                <input 
                  type="range" 
                  min="3.0" 
                  max="8.0" 
                  step="0.5"
                  value={customOffPeak} 
                  onChange={(e) => handleSliderChange('offpeak', parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Premium Progress Ring Visual comparison */}
          <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-900 gap-4 mt-2">
            <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-slate-900"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-emerald-500 transition-all duration-500"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - savingsPercent / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white font-mono">{savingsPercent}%</span>
            </div>
            
            <div className="flex-1 font-mono text-[10px] leading-relaxed">
              <div className="flex justify-between text-slate-500">
                <span>Flat Rate:</span>
                <span>₹{stats.flatCost.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 mt-0.5">
                <span>Smart ToD:</span>
                <span>₹{stats.smartToDBilling.toFixed(0)}</span>
              </div>
              <div className="border-t border-slate-900 mt-1.5 pt-1.5 flex justify-between font-bold text-slate-200">
                <span>Saved/mo:</span>
                <span className="text-emerald-400 text-xs">₹{Math.round(stats.monthlySaving)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Benchmarking */}
        <div className="lg:col-span-2 glass-card p-6 bg-slate-900/40 border border-slate-900/60 space-y-5">
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Grid Benchmarking</h4>
            <h3 className="text-sm font-bold text-white mt-1">Rates Across Indian Grids</h3>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-900 bg-slate-950/20">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-slate-450 text-[9px] uppercase tracking-wider">
                  <th className="p-4 font-bold">DISCOM Name</th>
                  <th className="p-4 font-bold text-sky-400">Night Rate</th>
                  <th className="p-4 font-bold text-amber-500">Day Rate</th>
                  <th className="p-4 font-bold text-rose-400">Peak Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-[11px]">
                {Object.values(CITY_PRESETS).map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                    <td className="p-4 text-slate-200 font-semibold">
                      <div>{t.name}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 font-normal leading-none">{t.discom}</div>
                    </td>
                    <td className="p-4 font-bold text-sky-400">₹{t.offpeak.toFixed(1)}</td>
                    <td className="p-4 font-bold text-amber-500">₹{t.day.toFixed(1)}</td>
                    <td className="p-4 font-bold text-rose-400 font-extrabold">₹{t.peak.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple mechanism notes */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900 text-xs leading-normal flex gap-3">
            <Info className="h-4.5 w-4.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-slate-400">
              <strong>Smart Peak Shaving:</strong> The engine automatically triggers grid charging during low-tariff hours (₹{customOffPeak.toFixed(1)}/kWh) and discharges the battery block to drive home loads during peak evenings (₹{customPeak.toFixed(1)}/kWh), saving up to 35% on standard bills.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridTariffTables;
