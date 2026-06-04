import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ExternalLink,
  Award,
  TrendingUp,
  ShieldCheck,
  Calendar,
  CheckCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { SubsidyInfo } from '../types';

interface PmSuryaGharRoiProps {
  currentCapacity: number;
  onCapacityChange?: (cap: number) => void;
}

export const PmSuryaGharRoi: React.FC<PmSuryaGharRoiProps> = ({
  currentCapacity,
  onCapacityChange,
}) => {
  const [capacity, setCapacity] = useState<number>(currentCapacity || 3.0);
  const [costPerKw, setCostPerKw] = useState<number>(60000);
  const [tariffRate, setTariffRate] = useState<number>(7.0);
  const [roiData, setRoiData] = useState<SubsidyInfo | null>(null);

  useEffect(() => {
    const grossCost = capacity * costPerKw;
    
    // Official GoI Subsidy rules
    let subsidy = 0;
    if (capacity <= 2) {
      subsidy = capacity * 30000;
    } else if (capacity > 2) {
      const extraKw = Math.min(capacity - 2, 1);
      subsidy = (2 * 30000) + (extraKw * 18000);
      if (capacity > 3) {
        subsidy = 78000;
      }
    }

    const netCost = Math.max(0, grossCost - subsidy);
    const annualGenUnits = capacity * 4.3 * 365;
    const annualSavings = annualGenUnits * tariffRate;
    const monthlySavings = annualSavings / 12;
    const co2Offset = annualGenUnits * 0.82;
    const payback = annualSavings > 0 ? netCost / annualSavings : 0;

    setRoiData({
      solar_capacity_kw: capacity,
      subsidy_amount: subsidy,
      installation_cost: grossCost,
      net_cost: netCost,
      annual_savings_inr: annualSavings,
      monthly_savings_inr: monthlySavings,
      co2_offset_kg_per_year: co2Offset,
      units_generated_per_year: annualGenUnits,
      payback_years: payback,
    });

    if (onCapacityChange) {
      onCapacityChange(capacity);
    }
  }, [capacity, costPerKw, tariffRate]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val).replace('INR', '₹');
  };

  const steps = [
    { num: '01', title: 'National Portal Registration', desc: 'Sign up on the PM Surya Ghar national portal.' },
    { num: '02', title: 'DISCOM Feasibility approval', desc: 'Submit standard request for net-meter validation.' },
    { num: '03', title: 'ALMM Vendor Installation', desc: 'Hire certified vendors to mount local panels.' },
    { num: '04', title: 'Claim Subsidy Transfer', desc: 'Direct credit processed post connection setup.' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-400" /> PM Surya Ghar Scheme Payback
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
            Check your estimated payback timeline and government subsidy claiming parameters.
          </p>
        </div>
        <div>
          <a
            href="https://pmsuryaghar.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-350 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all active:scale-98"
          >
            Official Portal <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Interactive sliders & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simple Sliders column */}
        <div className="lg:col-span-1 glass-card p-5 bg-slate-900/40 border border-slate-900/60 space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-900/60 pb-2">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Calculator Inputs</h4>
            </div>

            {/* Size Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Rooftop Solar Size</span>
                <span className="text-emerald-400 font-extrabold font-mono">{capacity.toFixed(1)} kWp</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="10.0" 
                step="0.5" 
                value={capacity}
                onChange={(e) => setCapacity(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Price Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Cost per kWp</span>
                <span className="text-slate-200 font-bold font-mono">{formatPrice(costPerKw)}</span>
              </div>
              <input 
                type="range" 
                min="45000" 
                max="80000" 
                step="1000" 
                value={costPerKw}
                onChange={(e) => setCostPerKw(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Tariff slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Electricity Bill Tariff</span>
                <span className="text-amber-500 font-bold font-mono">₹{tariffRate.toFixed(1)}/kWh</span>
              </div>
              <input 
                type="range" 
                min="4.0" 
                max="10.0" 
                step="0.5" 
                value={tariffRate}
                onChange={(e) => setTariffRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-[10px] text-slate-400 leading-relaxed font-mono flex gap-2">
            <Award className="h-4 w-4 text-emerald-450 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-emerald-400">MNRE Policy:</strong> Subsidy is calculated at ₹30k/kWp up to 2kWp, and ₹18k/kWp for the 3rd kWp (capped at ₹78k max).
            </p>
          </div>
        </div>

        {/* Financial Breakdown */}
        {roiData && (
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-5 bg-slate-900/40 border border-slate-900/60 space-y-5">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-900/60">Investment Audit</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900">
                  <span className="text-[9px] text-slate-500 uppercase">Gross Cost</span>
                  <p className="text-sm font-bold text-white mt-1">{formatPrice(roiData.installation_cost)}</p>
                </div>
                <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/10">
                  <span className="text-[9px] text-emerald-400 uppercase">MNRE Subsidy</span>
                  <p className="text-sm font-bold text-emerald-400 mt-1">-{formatPrice(roiData.subsidy_amount)}</p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900">
                  <span className="text-[9px] text-slate-500 uppercase">Net Investment</span>
                  <p className="text-sm font-bold text-white mt-1">{formatPrice(roiData.net_cost)}</p>
                </div>
              </div>

              {/* Stats highlights */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-550 block uppercase">Yearly Yield</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">{Math.round(roiData.units_generated_per_year)} kWh</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-550 block uppercase">Monthly Saving</span>
                  <span className="font-semibold text-emerald-400 mt-0.5 block">{formatPrice(roiData.monthly_savings_inr)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-550 block uppercase">CO2 Offset</span>
                  <span className="font-semibold text-sky-400 mt-0.5 block">{Math.round(roiData.co2_offset_kg_per_year)} kg/yr</span>
                </div>
              </div>
            </div>

            {/* Minimalist Break-Even Timeline Progress Track */}
            <div className="glass-card p-5 bg-slate-900/40 border border-slate-900/60 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Break-Even Timeline Track</h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                  Payback: {roiData.payback_years.toFixed(1)} Years
                </span>
              </div>
              
              <div className="relative pt-6 pb-2">
                {/* Horizontal Track line */}
                <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-900 overflow-hidden relative">
                  {/* Fill up to progress timeline projection */}
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-500"
                    style={{ width: `${Math.min(100, (100 / roiData.payback_years) * 3)}%` }} 
                  />
                </div>
                
                {/* Timeline node markers */}
                <div className="absolute top-0 inset-x-0 flex justify-between text-[10px] font-mono text-slate-500 select-none">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const year = index + 1;
                    const isPassed = year <= Math.ceil(roiData.payback_years);
                    return (
                      <div key={year} className="flex flex-col items-center relative">
                        <span className={year === Math.round(roiData.payback_years) ? 'text-emerald-400 font-bold' : isPassed ? 'text-slate-350' : 'text-slate-600'}>
                          Yr {year}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full border mt-1.5 ${
                          year < roiData.payback_years 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : year === Math.round(roiData.payback_years)
                            ? 'bg-amber-500 border-amber-500 animate-pulse'
                            : 'bg-slate-950 border-slate-800'
                        }`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 text-[10px] font-mono leading-relaxed text-slate-400 text-center">
                Your rooftop system completely pays for itself in <span className="text-emerald-400 font-bold">{roiData.payback_years.toFixed(1)} years</span>. Every year after that is <span className="text-emerald-400 font-bold">100% clean profit</span> of ₹{Math.round(roiData.annual_savings_inr).toLocaleString('en-IN')}/year.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clean installation roadmap */}
      <div className="glass-card p-6 bg-slate-900/40 border border-slate-900/60 space-y-4">
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Installation & Subsidy Roadmap</h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {steps.map((s, idx) => (
            <div key={idx} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-900 space-y-2 text-xs hover:border-emerald-500/20 transition-all duration-300">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black flex items-center justify-center font-mono text-[10px]">
                {s.num}
              </div>
              <h5 className="font-bold text-white mt-1">{s.title}</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PmSuryaGharRoi;
