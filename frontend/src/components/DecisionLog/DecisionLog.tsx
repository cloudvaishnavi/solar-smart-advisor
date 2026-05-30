import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Leaf, 
  Scroll, 
  CircleDollarSign, 
  TrendingUp, 
  AlertTriangle,
  Sun,
  Battery,
  Zap,
  Globe,
  Clock,
  Code
} from 'lucide-react';
import { DecisionLogEntry } from '../../types';

interface DecisionLogProps {
  logs: DecisionLogEntry[];
  highlightedHour: number | null;
  onHourSelect: (hour: number | null) => void;
}

export const DecisionLog: React.FC<DecisionLogProps> = ({ logs, highlightedHour, onHourSelect }) => {
  const [filter, setFilter] = useState<'all' | 'savings' | 'critical' | 'carbon'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter logs based on category
  const filteredLogs = logs.filter((log) => {
    if (filter === 'savings') return log.impact_inr > 0 || log.action.toLowerCase().includes('saving') || log.action.toLowerCase().includes('tariff');
    if (filter === 'critical') return log.severity === 'critical' || log.severity === 'warning';
    if (filter === 'carbon') return log.impact_co2_kg > 0;
    return true;
  });

  // Handle auto-scrolling to highlighted hour
  useEffect(() => {
    if (highlightedHour !== null && scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector(`[data-hour="${highlightedHour}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [highlightedHour]);

  // Helper to map log properties to Lucide Icons for high-fidelity appearance
  const getActionIcon = (emoji: string, action: string) => {
    const act = action.toLowerCase();
    if (act.includes('solar') || emoji.includes('☀️')) return <Sun className="h-4.5 w-4.5 text-amber-500 animate-pulse-slow" />;
    if (act.includes('battery') || emoji.includes('🔋')) return <Battery className="h-4.5 w-4.5 text-emerald-400" />;
    if (act.includes('power cut') || act.includes('grid failure') || emoji.includes('🚨') || emoji.includes('⚠️')) return <AlertTriangle className="h-4.5 w-4.5 text-red-500 animate-bounce" />;
    if (act.includes('grid') || emoji.includes('🔌')) return <Zap className="h-4.5 w-4.5 text-sky-400" />;
    if (act.includes('carbon') || emoji.includes('☘️') || emoji.includes('🌍')) return <Leaf className="h-4.5 w-4.5 text-emerald-500" />;
    return <Globe className="h-4.5 w-4.5 text-slate-400" />;
  };

  // Helper to get priority mode styles
  const getPriorityModeStyles = (mode: string) => {
    switch (mode) {
      case 'cost_save':
        return {
          border: 'border-l-amber-500 bg-slate-900/50 hover:bg-slate-800 border-slate-800',
          active: 'border-l-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.08)] border-slate-700',
          badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          label: 'Tariff Shave'
        };
      case 'backup_priority':
        return {
          border: 'border-l-violet-500 bg-slate-900/50 hover:bg-slate-800 border-slate-800',
          active: 'border-l-violet-500 bg-violet-500/5 ring-1 ring-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.08)] border-slate-700',
          badge: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          label: 'Grid Backup'
        };
      case 'carbon_first':
        return {
          border: 'border-l-emerald-500 bg-slate-900/50 hover:bg-slate-800 border-slate-800',
          active: 'border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)] border-slate-700',
          badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          label: 'Carbon First'
        };
      default:
        return {
          border: 'border-l-emerald-500 bg-slate-900/50 hover:bg-slate-800 border-slate-800',
          active: 'border-l-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)] border-slate-700',
          badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          label: 'Balanced Engine'
        };
    }
  };

  return (
    <div className="glass-card p-5 h-[480px] flex flex-col bg-slate-900/40 border border-slate-800/80">
      
      {/* Filters Header bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Scroll className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Explainable Decision Log
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time solar optimization decisions & engine logic explanations.</p>
          </div>
        </div>

        {/* Filters Selectors */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
              filter === 'all' 
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              filter === 'critical' 
                ? 'bg-red-500/10 text-red-400 border border-red-500/25 shadow-sm' 
                : 'text-slate-400 hover:text-red-400'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Alerts
          </button>
          <button
            onClick={() => setFilter('savings')}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              filter === 'savings' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-sm' 
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <CircleDollarSign className="h-3.5 w-3.5" />
            Savings
          </button>
          <button
            onClick={() => setFilter('carbon')}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              filter === 'carbon' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm' 
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Leaf className="h-3.5 w-3.5" />
            CO₂ Offsets
          </button>
        </div>
      </div>

      {/* Decision Logs lists */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 scroll-smooth scrollbar-thin"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono py-12 space-y-2">
            <ShieldCheck className="h-9 w-9 text-slate-700" />
            <p className="text-xs">No logs found matching filter criteria.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const hour = parseInt(log.timestamp.split(':')[0]);
            const isHighlighted = highlightedHour === hour;
            const modeStyle = getPriorityModeStyles(log.priority_mode);

            // Splitting reason to isolate the primary justification and technical rules fired
            const parts = log.reason.split(' | ');
            const primaryJustification = parts[0];
            const ruleId = parts[1] || 'Rule: ENGINE_DEFAULT';

            return (
              <div
                key={log.timestamp}
                data-hour={hour}
                onClick={() => onHourSelect(isHighlighted ? null : hour)}
                className={`p-3.5 rounded-2xl border-l-4 border cursor-pointer transition-all duration-200 ${
                  isHighlighted 
                    ? modeStyle.active
                    : `${modeStyle.border}`
                } hover:border-slate-700 hover:translate-x-0.5`}
              >
                <div className="flex items-start gap-3.5">
                  
                  {/* Styled Icon Wrapper */}
                  <div className="p-2 rounded-xl flex-shrink-0 bg-slate-950 border border-slate-800">
                    {getActionIcon(log.icon, log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    
                    {/* Timestamp, Action Title, Priority Mode */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <Clock className="h-3 w-3 inline mr-1 text-slate-500" />
                          {log.timestamp}
                        </span>
                        <h4 className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-xs xl:max-w-md">
                          {log.action}
                        </h4>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold font-mono border ${modeStyle.badge}`}>
                        {modeStyle.label}
                      </span>
                    </div>

                    {/* Explanatory Description */}
                    <div className="space-y-1">
                      <p className="text-xs text-slate-450 leading-relaxed">
                        <span className="text-slate-400 font-bold">Explanation: </span>
                        {primaryJustification}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                        <Code className="h-3 w-3 text-slate-650" />
                        <span>{ruleId}</span>
                      </div>
                    </div>

                    {/* Metric Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-850/50">
                      {log.impact_inr > 0 ? (
                        <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/10 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-amber-400" />
                          Saved ₹{log.impact_inr.toFixed(0)}
                        </span>
                      ) : log.impact_inr < 0 ? (
                        <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                          Grid Cost ₹{Math.abs(log.impact_inr).toFixed(0)}
                        </span>
                      ) : null}

                      {log.impact_co2_kg > 0 && (
                        <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10 flex items-center gap-1">
                          <Leaf className="h-3 w-3 text-emerald-400" />
                          {log.impact_co2_kg.toFixed(2)} kg CO₂ avoided
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DecisionLog;
