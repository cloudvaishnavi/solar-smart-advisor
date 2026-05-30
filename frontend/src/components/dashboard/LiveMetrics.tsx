import React from 'react';
import { Sun, Battery, Zap, ArrowDownLeft, ArrowUpRight, BatteryCharging, CloudSun, Leaf, Lightbulb } from 'lucide-react';
import { HourlyDataPoint, DaySummary, WeatherData } from '../../types';

interface LiveMetricsProps {
  activePoint: HourlyDataPoint;
  summary: DaySummary;
  weather: WeatherData;
  batteryCapacityKwh: number;
  bhkSize: string;
}

export const LiveMetrics: React.FC<LiveMetricsProps> = ({
  activePoint,
  summary,
  weather,
  batteryCapacityKwh,
  bhkSize,
}) => {
  const socPct = Math.round(activePoint.battery_soc * 100);
  const kwhRemaining = (activePoint.battery_soc * batteryCapacityKwh).toFixed(1);
  const batteryDelta = activePoint.solar_generation_kw - activePoint.household_load_kw - activePoint.grid_import_kw + activePoint.grid_export_kw;
  const isCharging = batteryDelta > 0.05;
  const isDischarging = batteryDelta < -0.05;

  // Dust loss calculation
  const dustLossPct = Math.round(activePoint.dust_loss_factor * 100);
  const isDusty = dustLossPct < 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. SOLAR GENERATION CARD */}
      <div className="glass-card group p-5 bg-slate-900/40 border border-slate-800/80 border-t-4 border-t-amber-500 hover:border-t-amber-400 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between h-44">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">Solar Generation</p>
            <h3 className="text-3xl font-extrabold text-white mt-2 transition-all">
              {activePoint.solar_generation_kw.toFixed(2)} <span className="text-xs font-semibold text-slate-400">kW</span>
            </h3>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform duration-200 border border-amber-500/20">
            <Sun className="h-5 w-5 animate-pulse-slow" />
          </div>
        </div>

        <div className="border-t border-slate-800/50 pt-2.5 flex flex-col gap-1 text-[11px] font-mono text-slate-400">
          <div className="flex justify-between">
            <span>Daily Generation:</span>
            <span className="text-slate-200 font-bold">{summary.total_solar_kwh.toFixed(1)} kWh</span>
          </div>
          <div className="flex justify-between">
            <span>Array Status:</span>
            {isDusty ? (
              <span className="text-red-400 font-bold">-{100 - dustLossPct}% Dust Loss</span>
            ) : (
              <span className="text-emerald-450 font-bold">100% Optimized</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. BATTERY STATE CARD */}
      <div className="glass-card group p-5 bg-slate-900/40 border border-slate-800/80 border-t-4 border-t-violet-500 hover:border-t-violet-400 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between h-44">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">Battery Bank</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              {socPct}% <span className="text-xs font-semibold text-slate-400">({kwhRemaining} kWh)</span>
            </h3>
          </div>
          <div className={`p-2 rounded-xl transition-all duration-200 border ${
            isCharging 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : isDischarging 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            {isCharging ? (
              <BatteryCharging className="h-5 w-5 animate-bounce" />
            ) : (
              <Battery className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Battery progress fill bar */}
        <div className="my-1">
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                socPct > 50 
                  ? 'bg-emerald-500' 
                  : socPct > 20 
                    ? 'bg-amber-500' 
                    : 'bg-red-500 animate-pulse'
              }`}
              style={{ width: `${socPct}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 border-t border-slate-800/50 pt-2">
          <span>Flow Rate:</span>
          <span className={`font-bold ${isCharging ? 'text-emerald-400' : isDischarging ? 'text-amber-400' : 'text-slate-400'}`}>
            {isCharging ? `Charging +${batteryDelta.toFixed(1)} kW` : isDischarging ? `Discharging ${Math.abs(batteryDelta).toFixed(1)} kW` : 'Standby'}
          </span>
        </div>
      </div>

      {/* 3. HOUSEHOLD DEMAND CARD */}
      <div className="glass-card group p-5 bg-slate-900/40 border border-slate-800/80 border-t-4 border-t-red-500 hover:border-t-red-400 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between h-44">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">Home Demand</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              {activePoint.household_load_kw.toFixed(2)} <span className="text-xs font-semibold text-slate-400">kW</span>
            </h3>
          </div>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-500 group-hover:scale-105 transition-transform duration-200 border border-red-500/20">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        {/* Scrollable appliance indicators */}
        <div className="flex gap-1 overflow-x-auto py-1 scrollbar-none text-[9px] font-bold font-mono text-slate-300">
          {activePoint.active_appliances.slice(0, 3).map((app) => (
            <span key={app} className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 text-slate-300">
              <Lightbulb className="h-2.5 w-2.5 text-yellow-400" />
              {app}
            </span>
          ))}
          {activePoint.active_appliances.length > 3 && (
            <span className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-slate-550">
              +{activePoint.active_appliances.length - 3}
            </span>
          )}
        </div>

        <div className="border-t border-slate-800/50 pt-2 flex justify-between text-[11px] font-mono text-slate-400">
          <span>Usage Model:</span>
          <span className="text-slate-200 font-bold">{bhkSize} Profile</span>
        </div>
      </div>

      {/* 4. GRID EXCHANGE CARD */}
      <div className="glass-card group p-5 bg-slate-900/40 border border-slate-800/80 border-t-4 border-t-sky-500 hover:border-t-sky-400 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between h-44">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">Grid Exchange</p>
            {activePoint.grid_import_kw > 0 ? (
              <h3 className="text-3xl font-extrabold text-sky-400 mt-2 flex items-center gap-1">
                <ArrowDownLeft className="h-5 w-5 text-sky-400" />
                {activePoint.grid_import_kw.toFixed(2)} <span className="text-xs font-semibold text-slate-400">kW</span>
              </h3>
            ) : activePoint.grid_export_kw > 0 ? (
              <h3 className="text-3xl font-extrabold text-emerald-450 mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                {activePoint.grid_export_kw.toFixed(2)} <span className="text-xs font-semibold text-slate-400">kW</span>
              </h3>
            ) : (
              <h3 className="text-3xl font-extrabold text-slate-450 mt-2">
                Net Balanced
              </h3>
            )}
          </div>
          <div className={`p-2 rounded-xl transition-all duration-200 border ${
            activePoint.grid_import_kw > 0 
              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' 
              : activePoint.grid_export_kw > 0 
                ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}>
            <CloudSun className="h-5 w-5" />
          </div>
        </div>

        <div className="border-t border-slate-800/50 pt-2 flex flex-col gap-1 text-[11px] font-mono text-slate-400">
          <div className="flex justify-between">
            <span>Slab Tariff:</span>
            <span className="text-white font-bold">₹{activePoint.tariff.toFixed(1)}/kWh</span>
          </div>
          <div className="flex justify-between">
            <span>Grid Status:</span>
            <span className="text-slate-200 font-bold">
              {activePoint.grid_import_kw > 0 ? 'Importing' : activePoint.grid_export_kw > 0 ? 'Exporting Surplus' : 'Self-Sufficient'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LiveMetrics;
