
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, MapPin, Phone, LogOut, Edit2, Check, Camera, ShieldCheck, Heart, Clock, X, Settings, Trash2, Loader2, CheckCircle2, ChevronRight, Lock, AlertCircle, Send } from 'lucide-react';
import { getInitials, isImageUrl } from '../../utils';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { uploadToSupabase, deleteFromSupabase, extractPathFromUrl } from '../../services/supabase.config';
import { db } from '../../services/firebase.config';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  avatar: string;
  role?: string;
}

interface Props {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
  onLogout: () => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
  onOpenSettings?: () => void;
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  onUpdateEmail?: () => void;
}

export const ProfileView: React.FC<Props> = ({ user, setUser, onLogout, favoritesCount = 0, onOpenFavorites, onOpenSettings, isDarkMode, setIsDarkMode, onUpdateEmail }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState(user);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleSave = async () => {
    let finalAvatarUrl = formData.avatar;
    setIsUploading(true);

    try {
      if (pendingFile) {
        const bucketName = 'vork-profilepic-bucket';
        const oldPath = extractPathFromUrl(user.avatar);
        if (oldPath) {
          await deleteFromSupabase(bucketName, oldPath);
        }
        const extension = pendingFile.name.split('.').pop() || 'png';

        // Isolation logic: Determine folder based on role
        const roleFolder = user.role === 'artisan' ? 'artisan' : 'user';
        const dynamicPath = `avatars/${roleFolder}/${user.id}_profile_${Date.now()}.${extension}`;

        const publicUrl = await uploadToSupabase(bucketName, dynamicPath, pendingFile);
        finalAvatarUrl = publicUrl;
      }

      // 1. Update local state
      setUser({ ...formData, avatar: finalAvatarUrl });

      // 2. Update Firestore
      const collectionName = user.role === 'artisan' ? 'artisans' : 'users';

      if (user.id) {
        const updates: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          avatar: finalAvatarUrl,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, collectionName, user.id), updates);
      }

      if (previewUrl) {
        setTimeout(() => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, 100);
      }

      setPendingFile(null);
      setPreviewUrl(null);
      setIsEditing(false);
      setActiveField(null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      // Revert local change if needed, though simple alert might suffice
      alert("Erreur lors de la mise à jour du profil.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFormData(user);
    setPendingFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
    setActiveField(null);
  };

  const handleStartEdit = (fieldId: string) => {
    setIsEditing(true);
    setActiveField(fieldId);
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    } else {
      setIsEditing(true);
      setActiveField(null);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFormData({ ...formData, avatar: '' });
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const newPreview = URL.createObjectURL(file);
      setPendingFile(file);
      setPreviewUrl(newPreview);
      setFormData({ ...formData, avatar: newPreview });
    }
  };

  const hasCustomImage = isImageUrl(formData.avatar);

  return (
    <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-40">
      {/* Profile Header Section */}
      <div className="flex flex-col items-center mb-10 relative">
        <div className="relative group">
          <div
            onClick={handleAvatarClick}
            className={`size-32 bg-[#121214] rounded-[2.8rem] border border-white/5 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group ${isEditing ? 'cursor-pointer hover:border-indigo-500/30' : 'cursor-pointer'} transition-all`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 group-hover:opacity-100 transition-opacity"></div>

            <SmartAvatar
              src={formData.avatar}
              name={formData.name}
              className="w-full h-full relative z-10"
              initialsClassName="text-3xl font-black text-slate-700 relative z-10 group-hover:scale-110 transition-transform duration-500"
              timeout={2000}
            />

            {isUploading && (
              <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                <Loader2 className="animate-spin text-white size-8 drop-shadow-lg" />
              </div>
            )}

            {isEditing && !isUploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 gap-2">
                <Camera className="text-white drop-shadow-lg" size={28} />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Changer</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {isEditing && hasCustomImage && !isUploading && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 size-10 bg-red-600 rounded-2xl border-4 border-[#0a0a0c] flex items-center justify-center shadow-lg text-white animate-in zoom-in duration-300 z-40 active:scale-90"
              title="Supprimer la photo"
            >
              <Trash2 size={16} />
            </button>
          )}

          <div className="absolute bottom-6 -right-2 size-8 bg-emerald-500 rounded-xl border-4 border-[#0a0a0c] flex items-center justify-center shadow-lg z-30">
            <ShieldCheck size={14} className="text-white" />
          </div>
        </div>

        {isEditing && activeField === null ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-3xl font-black text-white text-center bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus:outline-none focus:border-indigo-500 w-full max-w-[260px]"
              autoFocus
              placeholder="Votre nom"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg">Valider</button>
              <button onClick={handleCancel} className="px-6 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">{user.name || 'Utilisateur'}</h2>
            <button onClick={() => setIsEditing(true)} className="p-2 bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
              <Edit2 size={14} />
            </button>
          </div>
        )}
        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.25em] mt-2">Dakar • Sénégal</p>

        <div className="flex gap-2 mt-6">
          {!isEditing && (
            <button
              onClick={onOpenSettings}
              className="px-10 py-3 rounded-[1.5rem] bg-[#1a1a20] border border-white/5 text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl hover:bg-indigo-600/10 hover:border-indigo-500/20 transition-all active:scale-95"
            >
              <Settings size={14} className="text-indigo-400" />
              Paramètres
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <button
          onClick={onOpenFavorites}
          className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group text-left transition-all active:scale-95"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
          <Heart size={16} className="text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black text-white tracking-tighter">{favoritesCount}</h3>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Favoris</p>
        </button>
        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl"></div>
          <Clock size={16} className="text-blue-500 mb-2" />
          <h3 className="text-2xl font-black text-white tracking-tighter">VORK</h3>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Pro</p>
        </div>
      </div>

      {/* Main Info Fields */}
      <div className="space-y-4 mb-8">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 mb-4">Informations</h3>

        <ProfileField
          icon={<Mail size={18} />}
          label="Email"
          value={isEditing && activeField === 'email' ? formData.email : user.email}
          isEditing={isEditing && activeField === 'email'}
          onClick={() => onUpdateEmail?.()} // Delegate to UpdateEmailView if needed
          onChange={(v) => setFormData({ ...formData, email: v })}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isUploading && activeField === 'email'}
          placeholder="votre@email.com"
          finishEdit={() => { setIsEditing(false); setActiveField(null); }}
        />
        <ProfileField
          icon={<Phone size={18} />}
          label="Téléphone"
          value={isEditing && activeField === 'phone' ? formData.phone : user.phone}
          isEditing={isEditing && activeField === 'phone'}
          onClick={() => handleStartEdit('phone')}
          onChange={(v) => setFormData({ ...formData, phone: v })}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isUploading && activeField === 'phone'}
          placeholder="77 123 45 67"
          type="tel"
          isPhoneField={true}
          finishEdit={() => { setIsEditing(false); setActiveField(null); }}
        />
      </div>

      {/* Logout Button */}
      {!isEditing && (
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-600/5 border border-red-600/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-[0.98]"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      )}
    </div>
  );
};

const ProfileField = ({ icon, label, value, isEditing, onChange, onClick, onSave, onCancel, placeholder, type = "text", isSaving, isPhoneField, finishEdit }: {
  icon: React.ReactNode,
  label: string,
  value: string,
  isEditing: boolean,
  onChange: (v: string) => void,
  onClick?: () => void,
  onSave: () => void,
  onCancel: () => void,
  placeholder?: string,
  type?: string,
  isSaving?: boolean,
  isPhoneField?: boolean,
  finishEdit?: () => void
}) => {
  const isEmpty = !value || value.trim() === '';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleValidateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave();
    finishEdit?.();
  };

  return (
    <div
      className={`flex flex-col gap-2 bg-white/[0.03] border rounded-[2rem] p-5 transition-all group ${isEditing ? 'border-indigo-500 bg-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.3)]' : 'border-white/5'} ${isEmpty && !isEditing ? 'border-orange-500/20 bg-orange-500/[0.02]' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`size-10 rounded-2xl flex items-center justify-center transition-colors ${isEditing ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500 group-hover:text-indigo-400'}`}>
          {isEditing ? <Edit2 size={16} /> : icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-0.5">{label}</p>
          <div className="flex items-center justify-between">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  ref={inputRef}
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full bg-transparent text-white font-bold text-base focus:outline-none"
                  placeholder={placeholder}
                  disabled={isSaving}
                />
              </div>
            ) : (
              <p className={`font-bold text-sm truncate tracking-tight transition-all ${isEmpty ? 'text-indigo-400 italic' : 'text-white'}`}>
                {isEmpty ? 'Cliquer pour ajouter' : value}
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={onClick}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
          >
            Modifier <ChevronRight size={10} />
          </button>
        )}
      </div>

      {isEditing && (
        <div className="flex gap-2 mt-4 animate-in slide-in-from-top-2 duration-300">
          <button
            onClick={handleValidateClick}
            disabled={isSaving}
            className={`flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all`}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Enregistrer</>}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            className="px-6 bg-white/5 rounded-2xl text-slate-500 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all border border-white/5"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
