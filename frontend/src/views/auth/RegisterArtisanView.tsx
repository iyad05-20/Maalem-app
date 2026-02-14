
import React, { useState, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Briefcase, AlertCircle, Phone, Camera } from 'lucide-react';
import { registerUser } from '../../services/auth.service';
import { uploadToSupabase } from '../../services/supabase.config';

interface Props {
    onRegisterSuccess: (userData: any, role: 'artisan') => void;
    onSwitchToLogin: () => void;
}

export const RegisterArtisanView: React.FC<Props> = ({ onRegisterSuccess, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [specialty, setSpecialty] = useState('Plomberie');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !name) {
            setError("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let avatarUrl = '';
            if (avatarFile) {
                const path = `avatars/artisan/${Date.now()}_profile.jpg`;
                avatarUrl = await uploadToSupabase('vork-profilepic-bucket', path, avatarFile);
            }

            const additionalData = {
                name,
                phone,
                category: specialty,
                avatar: avatarUrl,
                image: avatarUrl,
                available: true,
                rating: 5,
                experience: 0,
                jobsDone: 0,
                about: "Nouvel expert Vork prêt à intervenir.",
                services: [specialty],
                portfolio: [],
                reviews: [],
                city: 'Dakar',
                location: 'Dakar'
            };

            const result = await registerUser(email, password, 'artisan', additionalData);
            onRegisterSuccess(result.data, 'artisan');
        } catch (err: any) {
            setError(err.message || "Erreur d'inscription.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0c] relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-tr from-purple-900/20 via-transparent to-pink-900/10 blur-[120px] pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-8 z-10">
                <div className="size-16 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-2xl">
                    <Briefcase className="size-8 text-white" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase">VORK PRO</h1>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Inscription Artisan</p>
            </div>

            <div className="w-full max-w-sm glass-card bg-[#121214]/60 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative z-20">
                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex justify-center mb-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="size-20 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-emerald-500 overflow-hidden relative"
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <Camera size={24} className="text-slate-600" />
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom Complet</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Spécialité</label>
                        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-[10px] focus:outline-none focus:border-emerald-500/50 appearance-none">
                            {['Plomberie', 'Électricité', 'Climatisation', 'Peinture', 'Menuiserie', 'Maçonnerie', 'Nettoyage'].map(s => <option key={s} value={s} className="bg-[#121214]">{s}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 ..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vork.sn" className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white text-xs focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700" />
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

                    <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-600 to-indigo-600 py-4 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : <>S'inscrire <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                </form>

                <button onClick={onSwitchToLogin} className="w-full mt-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                    Déjà un compte ? Se connecter
                </button>
            </div>
        </div>
    );
};
