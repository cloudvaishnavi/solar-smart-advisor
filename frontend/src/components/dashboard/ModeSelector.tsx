import React from 'react';
import { Scale, CircleDollarSign, BatteryCharging, Leaf } from 'lucide-react';
import { HouseholdSettings } from '../../types';

interface ModeSelectorProps {
  currentMode: HouseholdSettings['priority_mode'];
  onChange: (mode: HouseholdSettings['priority_mode']) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onChange }) => {
  const modes: {
    id: HouseholdSettings['priority_mode'];
    label: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
    glowClass: string;
  }[] = [
    {
      id: 'balanced',
      label: 'Balanced Engine',
      description: 'Optimizes cost-saving while keeping a 50% battery backup buffer.',
      icon: <Scale className="h-4.5 w-4.5" />,
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      glowClass: 'border-sky-500/40 bg-sky-500/5 text-white ring-1 ring-sky-500/20',
    },
    {
      id: 'cost_save',
      label: 'Tariff Shaving',
      description: 'Discharges battery aggressively during high peak grid tariff intervals.',
      icon: <CircleDollarSign className="h-4.5 w-4.5" />,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      glowClass: 'border-amber-500/40 bg-amber-500/5 text-white ring-1 ring-amber-500/20',
    },
    {
      id: 'backup_priority',
      label: 'Grid Backup',
      description: 'Keeps battery charged to 100% to protect against frequent power cuts.',
      icon: <BatteryCharging className="h-4.5 w-4.5" />,
      colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
      glowClass: 'border-violet-500/40 bg-violet-500/5 text-white ring-1 ring-violet-500/20',
    },
    {
      id: 'carbon_first',
      label: 'Green Energy First',
      description: 'Maxes green self-consumption, minimizing dependency on grid coal fuel.',
      icon: <Leaf className="h-4.5 w-4.5" />,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      glowClass: 'border-emerald-500/40 bg-emerald-500/5 text-white ring-1 ring-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-500">Engine Priority Mode</h4>
        <span className="text-[9px] font-bold font-mono text-emerald-400 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Active Mode
        </span>
      </div>
      
      <div className="flex flex-col gap-2">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange(mode.id)}
              className={`p-3 rounded-xl border text-left flex gap-3 transition-all duration-200 ${
                isActive
                  ? `${mode.glowClass} border-l-4 border-l-emerald-500`
                  : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className={`p-2 rounded-xl flex-shrink-0 transition-transform duration-200 ${
                isActive ? mode.colorClass : 'bg-slate-950 text-slate-500 border border-slate-800'
              }`}>
                {mode.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold tracking-tight ${isActive ? 'text-white font-extrabold' : 'text-slate-200'}`}>
                  {mode.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  {mode.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;
