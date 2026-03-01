import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const config = {
        success: {
            icon: <CheckCircle2 className="size-5 text-emerald-400" />,
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400'
        },
        error: {
            icon: <AlertCircle className="size-5 text-red-400" />,
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            text: 'text-red-400'
        },
        info: {
            icon: <Info className="size-5 text-indigo-400" />,
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            text: 'text-indigo-400'
        }
    };

    const { icon, bg, border, text } = config[type];

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-3rem)] max-w-sm animate-in slide-in-from-bottom-5 duration-300">
            <div className={`glass-card p-4 rounded-2xl ${bg} border ${border} flex items-center justify-between gap-4 shadow-2xl backdrop-blur-xl`}>
                <div className="flex items-center gap-3">
                    {icon}
                    <p className={`text-xs font-black uppercase tracking-widest ${text}`}>{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/5 rounded-full transition-colors active:scale-90"
                >
                    <X className="size-4 text-slate-500" />
                </button>
            </div>
        </div>
    );
};
