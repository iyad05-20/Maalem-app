
import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, MapPin, Sparkles, Trash2, User } from 'lucide-react';
import { Category, View, Order, Artisan, Coordinates } from '../../types';
import { uploadToSupabase } from '../../services/supabase.config';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { getInitialArtisans } from '../../services/recommendation.service';
import { reverseGeocode, MARRAKECH_CENTER } from '../../services/location.service';
import { ChatbotModal } from '../../components/chatbot/ChatbotModal';

interface Props {
  category: Category;
  preSelectedArtisan?: Artisan;
  hideArtisanName?: boolean;
  onBack: () => void;
  onSubmit: (order: Order) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  userLocation?: Coordinates | null;
}

import { useFilePreviews } from '../../hooks/useFilePreview';

export const CreateOrderView: React.FC<Props> = ({ category, preSelectedArtisan, hideArtisanName, onBack, onSubmit, showToast, userLocation }) => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previews = useFilePreviews(images);

  // Use real location if available, otherwise fallback to Marrakech Center
  const effectiveLocation = userLocation || MARRAKECH_CENTER;
  const isUsingRealGPS = !!userLocation;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setImages(prev => [...prev, ...Array.from(files)].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // No longer using internal submitting state here, 
  // as the ChatbotModal handles the flow from now on.

  const handleStartChat = () => {
    if (!description.trim()) return;
    setChatbotOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col animate-in slide-in-from-bottom duration-500 pb-10">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <button
          onClick={onBack}
          className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Demande {category.name}</h1>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Nouvelle Publication</p>
        </div>
      </header>

      <div className="px-6 py-8 space-y-8 flex-1">
        {/* Reservation Banner if targeted */}
        {preSelectedArtisan && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-3xl flex items-center gap-4 shadow-lg">
            <div className="size-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 overflow-hidden">
              <SmartAvatar src={preSelectedArtisan.image} name={preSelectedArtisan.name} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Réservation directe</h3>
              <p className="text-[10px] text-indigo-400 font-medium">{hideArtisanName ? 'Expert Vork' : `Pour ${preSelectedArtisan.name}`}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="text-xl font-bold text-white tracking-tight">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre problème en détail..."
            className="w-full h-40 bg-[#121214] border border-white/5 rounded-[1.5rem] p-6 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none shadow-xl"
          />
        </div>

        <div className="space-y-4">
          <label className="text-xl font-bold text-white tracking-tight">Photos <span className="text-slate-500 font-medium text-sm">(max 4)</span></label>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {/* Add Image Button - Hide if 4 images reached */}
            {images.length < 4 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="size-24 shrink-0 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 group hover:border-purple-500/50 transition-all"
              >
                <Camera size={20} className="text-slate-500 group-hover:text-purple-400" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-purple-400 uppercase tracking-widest">Ajouter</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
            {images.map((file, idx) => (
              <div key={idx} className="size-24 shrink-0 rounded-2xl relative overflow-hidden border border-white/10 group">
                <img src={previews[idx]} className="w-full h-full object-cover" alt="Preview" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 size-6 bg-red-600 rounded-full flex items-center justify-center text-white"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xl font-bold text-white tracking-tight">Ville</label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <MapPin className="size-5 text-pink-500 fill-pink-500/20" />
            </div>
            <input
              type="text"
              readOnly
              value={isUsingRealGPS ? "Localisation GPS Active" : "Marrakech, Localisation Actuelle"}
              className="w-full bg-[#121214] border border-white/5 rounded-2xl py-5 pl-14 pr-16 text-white font-medium shadow-xl"
            />
            <button className="absolute right-6 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">
              Auto
            </button>
          </div>
        </div>

        <div className="pt-4 mt-auto">
          <button
            onClick={handleStartChat}
            disabled={!description.trim()}
            className="w-full py-6 rounded-[1.8rem] bg-gradient-to-r from-purple-800 to-purple-500 text-white/90 font-black text-base transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-purple-900/40 relative overflow-hidden group"
          >
            <div className="flex items-center justify-center gap-3">
              <Sparkles size={20} className="text-white animate-pulse" />
              <span className="uppercase tracking-[0.1em]">Valider avec Vork AI</span>
            </div>

            <div className="absolute inset-0 bg-white/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none"></div>
          </button>
        </div>
      </div>

      <ChatbotModal
        isOpen={chatbotOpen}
        initialDescription={description}
        category={category}
        preSelectedArtisan={preSelectedArtisan}
        userLocation={userLocation}
        onSubmit={onSubmit}
        showToast={showToast}
        onClose={() => setChatbotOpen(false)}
      />
    </div>
  );
};
