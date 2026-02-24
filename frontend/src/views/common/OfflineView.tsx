import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineViewProps {
    onRetry?: () => void;
}

export const OfflineView: React.FC<OfflineViewProps> = ({ onRetry }) => {
    return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/5">
                <WifiOff className="w-12 h-12 text-indigo-500 animate-pulse" />
            </div>

            <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Hors ligne</h1>
            <p className="text-slate-400 text-sm max-w-[280px] mb-8 leading-relaxed">
                Il semble que vous soyez déconnecté. Vérifiez votre connexion internet pour continuer à utiliser Vork.
            </p>

            <button
                onClick={() => onRetry ? onRetry() : window.location.reload()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
            >
                <RefreshCw className="w-4 h-4" />
                Réessayer
            </button>

            <div className="mt-12 pt-12 border-t border-white/5 w-full max-w-[200px]">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    Vork PWA • Mode Hors-ligne
                </p>
            </div>
        </div>
    );
};
