
import React, { useState } from 'react';
import { ChevronLeft, Mail, Lock, Loader2, ShieldCheck, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../services/firebase.config';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface Props {
  onBack: () => void;
  onSuccess: (newEmail: string) => void;
  userRole: 'user' | 'artisan';
}

export const UpdateEmailView: React.FC<Props> = ({ onBack, onSuccess, userRole }) => {
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Utilisateur non connecté");

      // 1. Re-authentication (Required for sensitive actions)
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // 2. Start Email Update with Verification
      // This sends a link to the NEW email address
      await verifyBeforeUpdateEmail(user, newEmail);

      // 3. Sync with Firestore (Optimistic update or handled after verification)
      // Note: Auth email only changes effectively after user clicks the link.
      // However, to keep Vork UI consistent, we update the profile doc too.
      const collectionName = userRole === 'artisan' ? 'artisans' : 'users';
      await updateDoc(doc(db, collectionName, user.uid), {
        email: newEmail,
        updatedAt: new Date().toISOString()
      });

      setStep('success');
    } catch (err: any) {
      console.error("Email update error:", err);
      let msg = "Une erreur est survenue.";
      if (err.code === 'auth/wrong-password') msg = "Mot de passe actuel incorrect.";
      if (err.code === 'auth/invalid-email') msg = "Format d'email invalide.";
      if (err.code === 'auth/email-already-in-use') msg = "Cet email est déjà utilisé.";
      if (err.code === 'auth/requires-recent-login') msg = "Session expirée. Reconnectez-vous.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-sm glass-card bg-[#121214]/60 rounded-[3rem] p-10 border border-white/10 shadow-2xl text-center">
          <div className="size-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mb-8 mx-auto border border-emerald-500/20">
            <Send className="size-10 text-emerald-400 animate-bounce" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Lien envoyé !</h2>
          <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
            Nous avons envoyé un lien de confirmation à <br />
            <span className="text-white font-bold">{newEmail}</span>.<br />
            Votre e-mail sera mis à jour dès que vous aurez validé ce lien.
          </p>
          <button
            onClick={() => onSuccess(newEmail)}
            className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
          >
            Retour au profil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col animate-in slide-in-from-right duration-500">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white active:scale-90 transition-transform">
          <ChevronLeft className="size-6" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">E-mail</h1>
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest text-left">Sécurité & Profil</p>
        </div>
      </header>

      <div className="px-6 pt-8 max-w-sm mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="size-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-4 mx-auto border border-indigo-500/20">
            <ShieldCheck className="size-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Changer d'adresse</h2>
          <p className="text-slate-500 text-xs font-medium">Pour votre sécurité, nous devons vérifier votre identité avant de modifier votre e-mail.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nouvel e-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-600" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouveau@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Mot de passe actuel</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in shake duration-300">
              <AlertCircle className="size-4 text-red-500 shrink-0" />
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
          >
            {isLoading ? <Loader2 className="size-5 animate-spin" /> : <>Mettre à jour <ChevronLeft className="size-4 rotate-180" /></>}
          </button>
        </form>
      </div>
    </div>
  );
};
