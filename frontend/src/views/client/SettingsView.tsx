
import React from 'react';
import { ChevronLeft, Bell, Lock, Globe, Moon, Shield, Info, ChevronRight, CreditCard, Trash2 } from 'lucide-react';

interface Props {
  onBack: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const SettingsView: React.FC<Props> = ({ onBack, isDarkMode, setIsDarkMode }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 pb-32 overflow-y-auto no-scrollbar">
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5 flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Paramètres</h1>
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Configuration App</p>
        </div>
      </header>

      <div className="px-6 mt-8 space-y-10">
        {/* Section: Compte */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Compte & Sécurité</h3>
          <div className="space-y-2">
            <SettingsItem icon={<Lock size={18} />} label="Changer le mot de passe" />
            <SettingsItem icon={<CreditCard size={18} />} label="Méthodes de Paiement" />
            <SettingsItem icon={<Shield size={18} />} label="Confidentialité des données" />
          </div>
        </section>

        {/* Section: Notifications */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Préférences</h3>
          <div className="space-y-2">
            <SettingsItem icon={<Bell size={18} />} label="Notifications Push" toggle active />
            <SettingsItem 
              icon={<Moon size={18} />} 
              label="Mode Sombre" 
              toggle 
              active={isDarkMode} 
              onToggle={() => setIsDarkMode(!isDarkMode)} 
            />
            <SettingsItem icon={<Globe size={18} />} label="Langue" value="Français" />
          </div>
        </section>

        {/* Section: Support */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Support & Info</h3>
          <div className="space-y-2">
            <SettingsItem icon={<Info size={18} />} label="Centre d'aide" />
            <SettingsItem icon={<Shield size={18} />} label="Conditions d'utilisation" />
            <SettingsItem icon={<Info size={18} />} label="À propos de Vork" value="v2.1.0" />
          </div>
        </section>

        {/* Section: Danger Zone */}
        <section className="space-y-4 pt-4">
          <button className="w-full flex items-center gap-4 bg-red-500/5 border border-red-500/10 rounded-3xl p-5 hover:bg-red-500/10 transition-all group">
            <div className="size-10 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
              <Trash2 size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-red-500 uppercase tracking-tight">Supprimer le compte</p>
              <p className="text-[8px] text-red-500/40 font-bold uppercase tracking-widest mt-0.5">Cette action est irréversible</p>
            </div>
          </button>
        </section>
      </div>
    </div>
  );
};

const SettingsItem = ({ icon, label, value, toggle, active, onToggle }: { 
  icon: React.ReactNode, 
  label: string, 
  value?: string, 
  toggle?: boolean,
  active?: boolean,
  onToggle?: () => void
}) => (
  <button 
    onClick={() => !toggle && console.log('Click settings item')} 
    className="w-full flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.06] transition-all group"
  >
    <div className="size-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p className="text-sm font-bold text-white tracking-tight">{label}</p>
    </div>
    {value && (
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">{value}</span>
    )}
    {toggle ? (
      <div 
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        className={`w-10 h-6 rounded-full relative transition-all duration-300 p-1 cursor-pointer ${active ? 'bg-indigo-600' : 'bg-slate-800'}`}
      >
        <div className={`size-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${active ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
    ) : (
      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
    )}
  </button>
);
