import React, { useEffect, useState } from 'react';
import { Landmark, TrendingUp, Calendar, ShieldCheck, Info } from 'lucide-react';
import { api } from '../../services/api';
import { SubsidyInfo } from '../../types';

interface PaybackTrackerProps {
  solarCapacityKw: number;
  installationCost: number;
}

export const PaybackTracker: React.FC<PaybackTrackerProps> = ({
  solarCapacityKw,
  installationCost,
}) => {
  const [info, setInfo] = useState<SubsidyInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLocalFallback, setIsLocalFallback] = useState<boolean>(false);

  useEffect(() => {
    const fetchSubsidyData = async () => {
      try {
        setLoading(true);
        setIsLocalFallback(false);
        const data = await api.getSubsidyInfo(solarCapacityKw, installationCost);
        setInfo(data);
      } catch (err) {
        console.warn('Backend offline – computing subsidy locally.', err);
        setIsLocalFallback(true);
        // ── Local fallback: PM Surya Ghar Muft Bijli Yojana rules ──────────
        // ₹30,000/kW for first 2 kW + ₹18,000/kW for the 3rd kW; max ₹78,000
        const kw = solarCapacityKw;
        const subsidyFirst2Kw     = Math.min(kw, 2) * 30000;
        const subsidyExtra        = kw > 2 ? Math.min(kw - 2, 1) * 18000 : 0;
        const subsidyAmount       = Math.min(subsidyFirst2Kw + subsidyExtra, 78000);
        const netCost             = installationCost - subsidyAmount;

        // Generation estimate: ~4.5 peak sun-hours/day (India average)
        const unitsPerYear        = kw * 4.5 * 365;
        // Average residential tariff ₹7/unit
        const annualSavingsInr    = unitsPerYear * 7;
        const monthlySavingsInr   = annualSavingsInr / 12;
        // Grid emission factor 0.82 kg CO₂/kWh (CEA India average)
        const co2OffsetKgPerYear  = unitsPerYear * 0.82;
        const paybackYears        = netCost > 0 ? netCost / annualSavingsInr : 0;

        setInfo({
          solar_capacity_kw:        kw,
          subsidy_amount:           subsidyAmount,
          installation_cost:        installationCost,
          net_cost:                 netCost,
          annual_savings_inr:       annualSavingsInr,
          monthly_savings_inr:      monthlySavingsInr,
          co2_offset_kg_per_year:   co2OffsetKgPerYear,
          units_generated_per_year: unitsPerYear,
          payback_years:            paybackYears,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubsidyData();
  }, [solarCapacityKw, installationCost]);

  if (loading || !info) {
    return (
      <div className="glass-card p-5 bg-slate-900/40 border border-slate-800/80 h-full animate-pulse flex flex-col justify-center items-center gap-3">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-500 font-mono">Calculating GoI Subsidy ROI...</span>
      </div>
    );
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val).replace('INR', '₹');
  };

  // Compute percentage of cost covered by GoI subsidy
  const subsidyPercent = Math.min(Math.round((info.subsidy_amount / info.installation_cost) * 100), 100);

  return (
    <div className="glass-card p-5 bg-slate-900/40 border border-slate-800/80 h-full flex flex-col justify-between space-y-5">
      <div>
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Landmark className="h-4.5 w-4.5 text-emerald-450" />
            <h3 className="text-sm font-bold text-white">PM Surya Ghar Subsidy</h3>
          </div>
          {isLocalFallback ? (
            <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20">
              Local Calc
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              GoI Approved
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-3 leading-relaxed">
          Rooftop solar financial metrics modeled under official Government of India subsidies (up to 3kWp max subsidy of ₹78,000).
        </p>

        {/* Cost comparison cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <p className="text-[9px] text-slate-550 font-mono uppercase tracking-wider">Gross Installation</p>
            <p className="text-sm font-bold text-white mt-1 font-mono">{formatPrice(info.installation_cost)}</p>
          </div>
          
          <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/15">
            <p className="text-[9px] text-emerald-450 font-mono uppercase tracking-wider">Scheme Subsidy</p>
            <p className="text-sm font-extrabold text-emerald-400 mt-1 font-mono">-{formatPrice(info.subsidy_amount)}</p>
          </div>
        </div>

        {/* Progress bar visual for subsidy coverage */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-500">Government Subsidy Aid</span>
            <span className="text-emerald-400 font-bold">{subsidyPercent}% Cost Offloaded</span>
          </div>
          
          <div className="h-2 w-full bg-slate-950 rounded-full border border-slate-800 p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${subsidyPercent}%` }}
            />
          </div>
        </div>

        {/* ROI Breakdown */}
        <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Net Investment</p>
            <p className="text-lg font-black text-white mt-0.5 font-mono">{formatPrice(info.net_cost)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Estimated Payback</p>
            <p className="text-lg font-black text-amber-500 mt-0.5 font-mono">
              {info.payback_years.toFixed(1)} <span className="text-xs font-semibold text-slate-400">Years</span>
            </p>
          </div>
        </div>
      </div>

      {/* Monthly/Annual Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 text-xs">
        <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
          <span className="text-[9px] text-slate-500 font-mono uppercase flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" /> Annual
          </span>
          <span className="font-bold text-white mt-1 font-mono">{formatPrice(info.annual_savings_inr)}</span>
        </div>
        
        <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
          <span className="text-[9px] text-slate-500 font-mono uppercase flex items-center gap-1">
            <Calendar className="h-3 w-3 text-sky-400" /> Monthly
          </span>
          <span className="font-bold text-slate-200 mt-1 font-mono">{formatPrice(info.monthly_savings_inr)}</span>
        </div>
        
        <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
          <span className="text-[9px] text-slate-500 font-mono uppercase flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Carbon
          </span>
          <span className="font-bold text-emerald-450 mt-1 font-mono">
            {(info.co2_offset_kg_per_year / 1000).toFixed(1)} <span className="text-[9px] text-slate-500">T/yr</span>
          </span>
        </div>
      </div>
      
    </div>
  );
};

export default PaybackTracker;
