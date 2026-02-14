
import React from 'react';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Props {
    email: string;
    onBack: () => void;
    onLogout?: () => void;
}

export const VerifyEmailView: React.FC<Props> = ({ email, onBack, onLogout }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0c] text-center">
            <div className="size-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center mb-8 border border-indigo-500/30">
                <Mail className="size-10 text-indigo-400" />
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight mb-4 uppercase">Vérifiez votre email</h1>
            <p className="text-slate-400 text-sm max-w-xs mb-8">
                Nous avons envoyé un lien de confirmation à <span className="text-indigo-400 font-bold">{email}</span>.
                Veuillez cliquer sur ce lien pour activer votre compte.
            </p>

            <div className="w-full max-w-xs space-y-4">
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-indigo-600 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                >
                    J'ai vérifié mon email <CheckCircle2 size={16} />
                </button>

                <div className="flex gap-4">
                    <button
                        onClick={onBack}
                        className="flex-1 py-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Retour
                    </button>

                    <button
                        onClick={onLogout}
                        className="flex-1 py-4 text-red-500/50 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                        Déconnexion
                    </button>
                </div>
            </div>
        </div>
    );
};
