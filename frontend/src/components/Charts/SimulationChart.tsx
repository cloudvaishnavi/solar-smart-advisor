import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { AlertOctagon, Clock } from 'lucide-react';
import { HourlyDataPoint } from '../../types';

interface SimulationChartProps {
  data: HourlyDataPoint[];
}

export const SimulationChart: React.FC<SimulationChartProps> = ({ data }) => {
  // Format hour labels for X Axis
  const chartData = data.map((d) => ({
    ...d,
    timeLabel: `${d.hour.toString().padStart(2, '0')}:00`,
    socPct: Math.round(d.battery_soc * 100),
  }));

  // Detect and group power cut hours for ReferenceAreas
  const powerCutHours = chartData.filter(d => d.is_power_cut);

  // Custom tooltips to present Indian tariff rates alongside load and battery info
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const activeTariff = payload[0]?.payload?.tariff;
      const isPowerCut = payload[0]?.payload?.is_power_cut;
      const powerCutMin = payload[0]?.payload?.power_cut_duration_min;
      const activeApps = payload[0]?.payload?.active_appliances || [];

      return (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-xs font-mono max-w-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 gap-4">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              Hour {label}
            </span>
            {isPowerCut && (
              <span className="text-[9px] font-extrabold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse flex items-center gap-1">
                <AlertOctagon className="h-3 w-3" />
                POWER CUT ({powerCutMin}m)
              </span>
            )}
          </div>
          
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-amber-400 flex items-center gap-1">☀️ Solar Power:</span>
              <span className="font-bold text-slate-100">{payload.find((p: any) => p.dataKey === 'solar_generation_kw')?.value?.toFixed(2) ?? '0.00'} kW</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-rose-400 flex items-center gap-1">🏠 Home Demand:</span>
              <span className="font-bold text-slate-100">{payload.find((p: any) => p.dataKey === 'household_load_kw')?.value?.toFixed(2) ?? '0.00'} kW</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-violet-400 flex items-center gap-1">🔋 Battery Bank:</span>
              <span className="font-bold text-violet-300">{payload.find((p: any) => p.dataKey === 'socPct')?.value ?? 0}% SoC</span>
            </div>
            
            <div className="flex justify-between border-t border-slate-850 pt-1.5 mt-1.5">
              <span className="text-sky-400 flex items-center gap-1">🔌 Grid Import:</span>
              <span className="font-bold text-sky-400">{payload.find((p: any) => p.dataKey === 'grid_import_kw')?.value?.toFixed(2) ?? '0.00'} kW</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-emerald-450 flex items-center gap-1">📤 Grid Export:</span>
              <span className="font-bold text-emerald-450">{payload.find((p: any) => p.dataKey === 'grid_export_kw')?.value?.toFixed(2) ?? '0.00'} kW</span>
            </div>
            
            <div className="flex justify-between border-t border-slate-850 pt-1.5 mt-1.5">
              <span className="text-slate-500">Grid Tariff:</span>
              <span className="text-amber-500 font-bold">₹{activeTariff?.toFixed(2)}/kWh</span>
            </div>
            
            {activeApps.length > 0 && (
              <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-850 leading-snug">
                <span className="font-semibold text-slate-350 block mb-1">Active Loads:</span>
                {activeApps.join(', ')}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-5 h-[420px] flex flex-col bg-slate-900/40 border border-slate-800/80">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            24-Hour Smart Energy Profile
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Visualize generation stacking, load requirements, battery storage SoC and grid exchange dynamics.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-amber-400">
            <span className="h-1.5 w-1.5 bg-amber-450 rounded-full"></span>
            <span>Peak Tariff Slab (₹8.0/kWh)</span>
          </div>
          {powerCutHours.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg text-red-400 animate-pulse">
              <span className="h-1.5 w-1.5 bg-red-500 rounded-full"></span>
              <span>Power Cuts Active</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: -10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#facc15" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#facc15" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01}/>
              </linearGradient>
              <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} vertical={false} />
            <XAxis 
              dataKey="timeLabel" 
              stroke="#64748b" 
              fontSize={10} 
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="power"
              stroke="#64748b"
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={false}
              label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' } }}
            />
            <YAxis 
              yAxisId="soc"
              orientation="right"
              stroke="#8b5cf6"
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              label={{ value: 'Battery State (%)', angle: 90, position: 'insideRight', style: { fill: '#8b5cf6', fontSize: 10, fontFamily: 'JetBrains Mono' } }}
            />

            {/* Shading Grid Peak hours: 18:00 (6 PM) to 22:00 (10 PM) */}
            <ReferenceArea 
              yAxisId="power"
              x1="18:00" 
              x2="22:00" 
              fill="#facc15" 
              fillOpacity={0.03} 
              stroke="#facc15" 
              strokeOpacity={0.08}
              strokeDasharray="3 3"
            />

            {/* Dynamic rendering of simulated power cuts shading */}
            {powerCutHours.map((pcHour) => {
              const startLabel = `${pcHour.hour.toString().padStart(2, '0')}:00`;
              const endLabel = `${(pcHour.hour + 1).toString().padStart(2, '0')}:00`;
              return (
                <ReferenceArea 
                  key={startLabel}
                  yAxisId="power"
                  x1={startLabel} 
                  x2={endLabel} 
                  fill="#ef4444" 
                  fillOpacity={0.06} 
                  stroke="#ef4444" 
                  strokeOpacity={0.12}
                />
              );
            })}

            {/* Threshold Line at 0kW for Grid Balancing */}
            <ReferenceLine yAxisId="power" y={0} stroke="#334155" strokeWidth={1} opacity={0.5} />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1 }} />
            
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', paddingBottom: '10px' }}
            />

            {/* Solar Generation Area */}
            <Area
              yAxisId="power"
              type="monotone"
              name="Solar Output"
              dataKey="solar_generation_kw"
              stroke="#eab308"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorSolar)"
            />

            {/* Household Demand Area */}
            <Area
              yAxisId="power"
              type="monotone"
              name="Home Demand"
              dataKey="household_load_kw"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorLoad)"
            />

            {/* Grid Import Area */}
            <Area
              yAxisId="power"
              type="monotone"
              name="Grid Import"
              dataKey="grid_import_kw"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorGrid)"
            />

            {/* Battery SoC line */}
            <Area
              yAxisId="soc"
              type="monotone"
              name="Battery State"
              dataKey="socPct"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimulationChart;
