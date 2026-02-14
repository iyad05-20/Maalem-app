
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Diamond, AlertCircle, User, Briefcase } from 'lucide-react';
import { loginUser } from '../../services/auth.service';

interface Props {
    onLoginSuccess: (userData: any, role: 'user' | 'artisan') => void;
    onSwitchToSignup: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, onSwitchToSignup }) => {
    const [role, setRole] = useState<'user' | 'artisan'>('user');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Veuillez remplir tous les champs.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await loginUser(email, password, role);
            onLoginSuccess(result.data, role);
        } catch (err: any) {
            setError(err.message || "Erreur de connexion.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0c] relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-tr from-purple-900/20 via-transparent to-pink-900/10 blur-[120px] pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-8 z-10">
                <div className="size-16 bg-gradient-to-br from-[#a855f7] to-[#ec4899] rounded-[1.5rem] flex items-center justify-center mb-4 shadow-2xl">
                    <Diamond className="size-8 text-white" fill="white" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase">VORK</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Connexion</p>
            </div>

            <div className="w-full max-w-sm glass-card bg-[#121214]/60 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative z-20">
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setRole('user')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${role === 'user' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                        <User size={12} /> Client
                    </button>
                    <button onClick={() => setRole('artisan')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${role === 'artisan' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                        <Briefcase size={12} /> Artisan
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vork.sn" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-xs focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white text-xs focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-700" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-red-500 text-[9px] font-bold uppercase tracking-tight leading-tight">{error}</p>
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-[#a855f7] to-[#ec4899] py-5 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 group">
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <>Se connecter <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                </form>

                <button onClick={onSwitchToSignup} className="w-full mt-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                    Pas de compte ? S'inscrire
                </button>
            </div>
        </div>
    );
};
