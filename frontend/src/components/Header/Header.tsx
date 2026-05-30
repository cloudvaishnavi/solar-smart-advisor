import React from 'react';
import { Sun, Battery, Server, Shield, Menu, Settings, LogOut } from 'lucide-react';

interface HeaderProps {
  priorityMode: string;
  dbMode: string;
  isSimulating: boolean;
  user: { name: string; email: string; bhk_size: string; city: string } | null;
  onLogout: () => void;
  onMenuClick: () => void;
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  priorityMode, 
  dbMode, 
  isSimulating,
  user,
  onLogout,
  onMenuClick,
  onSettingsClick
}) => {
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'cost_save':
        return { label: 'Cost-Save Mode', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
      case 'backup_priority':
        return { label: 'Backup Priority', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'carbon_first':
        return { label: 'Carbon-First Mode', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      default:
        return { label: 'Balanced Mode', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
    }
  };

  const modeInfo = getModeLabel(priorityMode);

  return (
    <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
      
      {/* Mobile Drawer Trigger & Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            Energy Control Center
            {isSimulating && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-ping"></span>
                Optimizing
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-500 font-mono hidden md:block">PM Surya Ghar smart rooftop solar and storage advisory engine</p>
        </div>
      </div>

      {/* User Welcome, Indicators, & Settings Toggle */}
      <div className="flex items-center gap-4">
        
        {/* Welcome message with avatar */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-[10px]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left leading-none">
              <span className="text-[10px] text-slate-500 font-mono block">Welcome back,</span>
              <span className="text-xs font-bold text-slate-200">{user.name}</span>
            </div>
          </div>
        )}

        {/* Priority mode tag */}
        <div className={`hidden md:block px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase border ${modeInfo.color}`}>
          {modeInfo.label}
        </div>

        {/* Database indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-slate-500 bg-slate-900/40 border border-slate-800/80">
          <Server className="h-3 w-3 text-sky-400" />
          <span>{dbMode === 'local_json' ? 'JSON local' : 'MongoDB'}</span>
        </div>

        {/* Settings toggle for mobile */}
        <button
          onClick={onSettingsClick}
          className="xl:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Open Settings Drawer"
        >
          <Settings className="h-5 w-5" />
        </button>

      </div>
      
    </header>
  );
};

export default Header;
