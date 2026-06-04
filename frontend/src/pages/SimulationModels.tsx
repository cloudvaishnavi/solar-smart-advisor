import React, { useState } from 'react';
import { 
  Scale, 
  CircleDollarSign, 
  BatteryCharging, 
  Leaf, 
  Sparkles, 
  CloudRain, 
  Sun, 
  AlertOctagon, 
  Cpu, 
  Play, 
  HelpCircle,
  Zap,
  TrendingUp,
  Battery,
  AlertTriangle
} from 'lucide-react';
import { HouseholdSettings, SimulationResult } from '../types';
import { computeLocalSimulation } from '../utils/localSimulation';

interface SimulationModelsProps {
  settings: HouseholdSettings;
  onPriorityModeChange: (mode: HouseholdSettings['priority_mode']) => void;
  onSettingsChange: (settings: HouseholdSettings) => void;
  onRunSimulation: (settings: HouseholdSettings) => void;
}

export const SimulationModels: React.FC<SimulationModelsProps> = ({
  settings,
  onPriorityModeChange,
  onSettingsChange,
  onRunSimulation,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('normal');
  const [sandboxResult, setSandboxResult] = useState<SimulationResult | null>(null);

  const modesInfo = [
    {
      id: 'balanced' as const,
      name: 'Balanced Dispatch',
      description: 'Protects a 50% backup reserve, optimizing the remaining capacity to lower evening electricity rates.',
      icon: <Scale className="h-5 w-5 text-sky-400" />,
      ratingSavings: '★★★★☆',
      ratingBackup: '★★★☆☆',
      ratingCarbon: '★★★★☆',
      highlight: 'Best for standard residential connections with occasional power cuts.',
      badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      textColor: 'text-sky-400'
    },
    {
      id: 'cost_save' as const,
      name: 'Tariff Shaving',
      description: 'Shifts battery use aggressively to expensive peak slots (6-10 PM) and charges during cheap night windows.',
      icon: <CircleDollarSign className="h-5 w-5 text-amber-400" />,
      ratingSavings: '★★★★★',
      ratingBackup: '★☆☆☆☆',
      ratingCarbon: '★★★☆☆',
      highlight: 'Best for high time-of-day billing zones where saving money is priority.',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      textColor: 'text-amber-400'
    },
    {
      id: 'backup_priority' as const,
      name: 'Grid Backup',
      description: 'Maintains battery SoC at 90%+ at all times. Restricts discharging to actual grid failures.',
      icon: <BatteryCharging className="h-5 w-5 text-violet-400" />,
      ratingSavings: '★☆☆☆☆',
      ratingBackup: '★★★★★',
      ratingCarbon: '★★☆☆☆',
      highlight: 'Best for rural regions experiencing frequent or long power cuts.',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      textColor: 'text-purple-400'
    },
    {
      id: 'carbon_first' as const,
      name: 'Green Energy First',
      description: 'Prioritizes storing all solar power and discharges solar battery down to 10% to avoid coal grid imports.',
      icon: <Leaf className="h-5 w-5 text-emerald-400" />,
      ratingSavings: '★★★★☆',
      ratingBackup: '★☆☆☆☆',
      ratingCarbon: '★★★★★',
      highlight: 'Best for eco-conscious households seeking minimal carbon footprint.',
      badgeColor: 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20',
      textColor: 'text-emerald-400'
    },
  ];

  const handleRunScenario = (scenario: string) => {
    setSelectedScenario(scenario);
    let simSettings = { ...settings };
    if (scenario === 'monsoon') {
      simSettings.city = 'Mumbai';
    } else if (scenario === 'heatwave') {
      simSettings.city = 'Delhi';
    } else {
      simSettings.city = 'Bengaluru';
    }

    const res = computeLocalSimulation(simSettings);
    if (scenario === 'monsoon') {
      res.weather = {
        city: simSettings.city,
        temperature: 24,
        cloud_cover: 95,
        rain_probability: 90,
        wind_speed: 28,
        condition: 'rainy',
        is_monsoon: true,
        uv_index: 2,
      };
    } else if (scenario === 'heatwave') {
      res.weather = {
        city: simSettings.city,
        temperature: 42,
        cloud_cover: 5,
        rain_probability: 0,
        wind_speed: 12,
        condition: 'sunny',
        is_monsoon: false,
        uv_index: 10,
      };
    }
    setSandboxResult(res);
  };

  // Run initial default scenario on mount if not loaded
  React.useEffect(() => {
    handleRunScenario('normal');
  }, [settings.solar_capacity_kw, settings.battery_capacity_kwh]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="h-5 w-5 text-emerald-400" /> Energy Dispatch Algorithms
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
            Choose a dispatch algorithm to control how energy flows between your solar panels, battery, and grid.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 uppercase">
            <Sparkles className="h-3 w-3" /> Live Simulator
          </span>
        </div>
      </div>

      {/* Mode Comparison Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modesInfo.map((m) => {
          const isActive = settings.priority_mode === m.id;
          
          let activeGlowClass = "";
          let iconBorderColor = "";
          if (m.id === 'balanced') {
            activeGlowClass = isActive ? "glow-active-blue border-blue-500/40 text-blue-200" : "border-slate-900/80 hover:border-blue-500/30 hover:bg-slate-900/20";
            iconBorderColor = "border-sky-500/20 bg-sky-500/5";
          } else if (m.id === 'cost_save') {
            activeGlowClass = isActive ? "glow-active-yellow border-yellow-500/40 text-yellow-200" : "border-slate-900/80 hover:border-yellow-500/30 hover:bg-slate-900/20";
            iconBorderColor = "border-amber-500/20 bg-amber-500/5";
          } else if (m.id === 'backup_priority') {
            activeGlowClass = isActive ? "glow-active-purple border-purple-500/40 text-purple-200" : "border-slate-900/80 hover:border-purple-500/30 hover:bg-slate-900/20";
            iconBorderColor = "border-violet-500/20 bg-violet-500/5";
          } else if (m.id === 'carbon_first') {
            activeGlowClass = isActive ? "glow-active-green border-emerald-500/40 text-emerald-200" : "border-slate-900/80 hover:border-emerald-500/30 hover:bg-slate-900/20";
            iconBorderColor = "border-emerald-500/20 bg-emerald-500/5";
          }

          return (
            <div 
              key={m.id}
              className={`p-5 rounded-3xl border backdrop-blur-md transition-all duration-300 flex flex-col justify-between ${activeGlowClass}`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl border ${iconBorderColor}`}>
                    {m.icon}
                  </div>
                  {isActive && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-mono font-extrabold border ${m.badgeColor}`}>
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mt-4">{m.name}</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed h-12 overflow-hidden">
                  {m.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-900/60 space-y-2 text-[10px] font-mono text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Tariff Savings:</span>
                  <span className="text-emerald-400 font-bold">{m.ratingSavings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Grid Backup:</span>
                  <span className="text-purple-400 font-bold">{m.ratingBackup}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Carbon Offset:</span>
                  <span className="text-sky-400 font-bold">{m.ratingCarbon}</span>
                </div>

                <div className="bg-slate-950/40 p-2.5 rounded-2xl border border-slate-900 text-[9px] leading-snug text-slate-400 mt-3">
                  <span className="font-bold text-slate-300 block mb-0.5">Primary Use Case:</span>
                  {m.highlight}
                </div>

                <button
                  onClick={() => onPriorityModeChange(m.id)}
                  disabled={isActive}
                  className={`w-full mt-3 py-2 px-3 rounded-xl text-[10px] font-mono font-bold transition-all ${
                    isActive 
                      ? 'bg-slate-950/40 text-slate-600 cursor-default border border-slate-900' 
                      : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/15 active:scale-95'
                  }`}
                >
                  {isActive ? 'Active dispatcher' : 'Activate mode'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scenario Sandbox */}
      <div className="glass-card p-6 bg-slate-900/40 border border-slate-900/60 space-y-4">
        <div>
          <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Scenario Testing</h4>
          <h3 className="text-sm font-bold text-white mt-1">Weather & Grid Stress Sandbox</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Test how your setup behaves under extreme conditions. Select a scenario below to run a dry-run calculation instantly.
          </p>
        </div>

        {/* Pick Scenario */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <button
            onClick={() => handleRunScenario('normal')}
            className={`p-4 rounded-3xl border text-left flex gap-3 transition-all ${
              selectedScenario === 'normal'
                ? 'bg-slate-950 border-sky-500/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'bg-slate-900/10 border-slate-900 text-slate-400 hover:bg-slate-900/30'
            }`}
          >
            <Sun className="h-5 w-5 text-sky-400 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Sunny Peak Summer</p>
              <p className="text-[10px] text-slate-500 mt-0.5">High solar generation, normal grid stability.</p>
            </div>
          </button>

          <button
            onClick={() => handleRunScenario('monsoon')}
            className={`p-4 rounded-3xl border text-left flex gap-3 transition-all ${
              selectedScenario === 'monsoon'
                ? 'bg-slate-950 border-indigo-500/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                : 'bg-slate-900/10 border-slate-900 text-slate-400 hover:bg-slate-900/30'
            }`}
          >
            <CloudRain className="h-5 w-5 text-indigo-455 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Monsoon Grid Failure</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Heavy rains, high outages probability, pre-charging active.</p>
            </div>
          </button>

          <button
            onClick={() => handleRunScenario('heatwave')}
            className={`p-4 rounded-3xl border text-left flex gap-3 transition-all ${
              selectedScenario === 'heatwave'
                ? 'bg-slate-950 border-amber-500/30 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                : 'bg-slate-900/10 border-slate-900 text-slate-400 hover:bg-slate-900/30'
            }`}
          >
            <AlertOctagon className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Heatwave Overload</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Sizzling temperatures, heavy load drawing, tariff spikes risk.</p>
            </div>
          </button>
        </div>

        {/* Sandbox Output Log */}
        {sandboxResult && (
          <div className="pt-4 border-t border-slate-900/60 space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
                <span className="text-[9px] text-slate-550 block uppercase">Net Cost</span>
                <span className="text-sm font-bold text-white mt-1 block">₹{sandboxResult.summary.total_cost_inr.toFixed(1)}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
                <span className="text-[9px] text-slate-550 block uppercase">Solar Yield</span>
                <span className="text-sm font-bold text-sky-400 mt-1 block">{sandboxResult.summary.total_solar_kwh.toFixed(1)} kWh</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
                <span className="text-[9px] text-slate-550 block uppercase">Power Cuts</span>
                <span className="text-sm font-bold text-red-400 mt-1 block">{sandboxResult.summary.power_cut_events} cuts ({sandboxResult.summary.power_cut_duration_min} min)</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
                <span className="text-[9px] text-slate-550 block uppercase">Independence</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{sandboxResult.summary.self_sufficiency_pct}%</span>
              </div>
            </div>

            {/* Concise decision notes */}
            <div className="bg-slate-950/40 rounded-2xl border border-slate-900 p-4 space-y-2">
              <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-450" /> Key Engine Decisions Taken:
              </span>
              <div className="space-y-2 font-mono text-[10px]">
                {sandboxResult.decision_log.slice(0, 2).map((l, index) => (
                  <div key={index} className="flex gap-2 text-slate-400 leading-relaxed border-b border-slate-950 pb-2 last:border-b-0 last:pb-0">
                    <span>{l.icon}</span>
                    <p>
                      <strong className="text-slate-200">{l.action}:</strong> {l.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationModels;
