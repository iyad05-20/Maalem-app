
import React, { useState, useRef, useEffect } from 'react';
import { X, Zap, ShieldAlert, Clock, CheckCircle2, Search, Send, Sparkles, AlertTriangle, Camera, Image as ImageIcon, Trash2, Loader2, MapPin, Edit2, Mic, StopCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Order } from './types';
import { uploadToSupabase, base64ToBlob } from './supabase';
import { CATEGORIES } from './data';

interface Props {
  onClose: () => void;
  onAddOrder?: (order: Order) => void;
}

type Step = 'input' | 'analyzing' | 'proposal' | 'matching';

export const UrgentView: React.FC<Props> = ({ onClose, onAddOrder }) => {
  const [step, setStep] = useState<Step>('input');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Analysis State
  const [analysis, setAnalysis] = useState<{
    category: string;
    priority: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
    summary: string;
    advice: string;
    estimatedPriceRange?: string;
  } | null>(null);

  // Edit Mode State (if user disagrees with AI)
  const [isEditing, setIsEditing] = useState(false);
  const [editedCategory, setEditedCategory] = useState('');
  const [editedPriority, setEditedPriority] = useState('');

  // Location State simulation
  const [locationStatus, setLocationStatus] = useState<'locating' | 'locked'>('locating');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Simulate Geolocation Lock on mount
  useEffect(() => {
    const timer = setTimeout(() => setLocationStatus('locked'), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages(prev => [...prev, reader.result as string].slice(0, 4));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeProblem = async () => {
    const promptDescription = String(description).trim();
    if (!promptDescription && images.length === 0) return;

    setStep('analyzing');

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      console.log(import.meta.env.VITE_GEMINI_API_KEY)

      const parts: any[] = [
        {
          text: `Tu es un expert en bâtiment et urgences domestiques. Analyse ce problème. 
        Photos fournies: ${images.length}. 
        Description: "${promptDescription.substring(0, 1000)}".
        
        Tâche:
        1. Identifie la catégorie d'artisan (Plomberie, Électricité, Climatisation, Serrurerie, Vitrerie, etc.).
        2. Estime la priorité (Basse, Moyenne, Haute, Critique).
        3. Rédige un résumé technique court (1 phrase).
        4. Donne un conseil de sécurité immédiat (très important).
        5. Estime une fourchette de prix approximative en FCFA (ex: "15.000 - 30.000").
        
        Retourne un JSON.` }
      ];

      images.forEach(imgBase64 => {
        const fullString = String(imgBase64);
        const dataArr = fullString.split(',');
        if (dataArr.length < 2) return;

        const base64Data = dataArr[1];
        const mimeTypeArr = dataArr[0].split(';')[0].split(':');
        if (mimeTypeArr.length < 2) return;
        const mimeType = mimeTypeArr[1];

        if (base64Data && mimeType) {
          parts.push({
            inlineData: {
              data: String(base64Data),
              mimeType: String(mimeType)
            }
          });
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              category: { type: "string" },
              priority: { type: "string", enum: ["Basse", "Moyenne", "Haute", "Critique"] },
              summary: { type: "string" },
              advice: { type: "string" },
              estimatedPriceRange: { type: "string" }
            },
            required: ["category", "priority", "summary", "advice"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) throw new Error("Empty response from AI");

      const result = JSON.parse(textOutput);
      setAnalysis(result);
      setEditedCategory(result.category);
      setEditedPriority(result.priority);
      setStep('proposal');
    } catch (error) {
      console.error("AI Analysis failed:", error);
      // Fallback
      const fallback = {
        category: "Multi-services",
        priority: "Haute" as const,
        summary: description || "Problème technique urgent",
        advice: "Coupez les arrivées (eau/élec) et ne touchez à rien en attendant le pro.",
        estimatedPriceRange: "Sur devis"
      };
      setAnalysis(fallback);
      setEditedCategory(fallback.category);
      setEditedPriority(fallback.priority);
      setStep('proposal');
    }
  };

  const startMatching = async () => {
    setStep('matching');

    const orderId = `urgent-${Date.now()}`;
    const imageUrls: string[] = [];

    try {
      for (const [index, base64] of images.entries()) {
        const blob = base64ToBlob(base64);
        const fileName = `orders/${orderId}/urgent_${index}_${Date.now()}.jpg`;
        const url = await uploadToSupabase('vork-profilepic-bucket', fileName, blob);
        imageUrls.push(url);
      }
    } catch (err) {
      console.error("Upload to Supabase failed:", err);
    }

    const finalCategory = isEditing ? editedCategory : (analysis?.category || 'Urgence');
    const finalPriority = isEditing ? editedPriority : (analysis?.priority || 'Haute');

    // Numeric Date Format
    const numericDate = new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newUrgentOrder: any = {
      id: orderId,
      category: finalCategory,
      status: "EN ATTENTE D'EXPERT",
      date: numericDate, // Accurate numeric date
      description: (analysis?.summary || description) + (analysis?.estimatedPriceRange ? ` (Budget est.: ${analysis.estimatedPriceRange} FCFA)` : ''),
      location: 'Dakar, Localisation GPS',
      city: 'Dakar',
      isUrgent: true,
      priority: finalPriority,
      responses: {
        userId: ''
      },
      images: imageUrls,
      targetedArtisans: [],
      contactedArtisanIds: [],
      currentRadius: 1,
      createdAt: new Date().toISOString()
    };

    // Simulate Network Delay and Radar Scanning
    setTimeout(() => {
      if (onAddOrder) {
        onAddOrder(newUrgentOrder);
      } else {
        onClose();
      }
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex flex-col animate-in fade-in duration-300 overflow-y-auto no-scrollbar pb-10 font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-red-600/20 via-transparent to-transparent blur-[100px] pointer-events-none"></div>

      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-red-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            <Zap className="size-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none">URGENCE VORK</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                {step === 'matching' ? 'Recherche active...' : 'Mode Assistance'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
      </header>

      {/* Safety Banner */}
      <div className="bg-orange-500/10 border-y border-orange-500/20 px-6 py-2 flex items-center gap-3">
        <ShieldAlert size={16} className="text-orange-500 shrink-0" />
        <p className="text-[10px] text-orange-200 font-medium leading-tight">
          Conseil sécurité : En cas de danger (feu, gaz), évacuez immédiatement avant d'utiliser l'app.
        </p>
      </div>

      <div className="px-6 pt-6 flex-1 flex flex-col">

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1">

            {/* Location Status */}
            <div className="flex items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/5 self-start">
              <div className={`size-8 rounded-xl flex items-center justify-center ${locationStatus === 'locked' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-slate-400'}`}>
                <MapPin size={16} className={locationStatus === 'locating' ? 'animate-bounce' : ''} />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Localisation</p>
                <p className={`text-xs font-bold ${locationStatus === 'locked' ? 'text-white' : 'text-slate-400'}`}>
                  {locationStatus === 'locked' ? 'Précision: 5 mètres' : 'Recherche GPS...'}
                </p>
              </div>
            </div>

            <div className="relative group">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Que se passe-t-il ?</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Une canalisation a éclaté dans la cuisine..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-[2rem] p-6 text-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-all resize-none shadow-inner"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                {/* Mock Voice Input - Just visuals */}
                <button className="size-10 bg-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-all">
                  <Mic size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Preuves (IA)</h3>
                <span className="text-[9px] text-red-500/50 font-bold uppercase">{images.length}/4</span>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="size-24 shrink-0 rounded-[1.8rem] bg-red-600/10 border-2 border-dashed border-red-600/30 flex flex-col items-center justify-center gap-2 group hover:bg-red-600 hover:border-red-600 transition-all active:scale-95"
                >
                  <Camera size={24} className="text-red-500 group-hover:text-white" />
                  <span className="text-[8px] font-black text-red-500 group-hover:text-white uppercase tracking-widest">Photo</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="size-24 shrink-0 rounded-[1.8rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 group hover:border-purple-500/30 transition-all active:scale-95"
                >
                  <ImageIcon size={20} className="text-slate-500 group-hover:text-purple-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Galerie</span>
                </button>

                {images.map((img, idx) => (
                  <div key={idx} className="relative size-24 shrink-0 rounded-[1.8rem] overflow-hidden border border-white/10 group bg-[#121214]">
                    <img src={img} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Urgency preview" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={20} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>

              <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </div>

            <div className="mt-auto pb-6">
              <button
                onClick={analyzeProblem}
                disabled={(!description.trim() && images.length === 0)}
                className="w-full py-6 rounded-[2.5rem] bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">Lancer l'alerte <Zap size={18} className="fill-current" /></span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING */}
        {step === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
            <div className="relative">
              <div className="size-40 rounded-full border-4 border-red-600/20 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-t-4 border-red-600 animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-4 border-red-600/10"></div>
                <Sparkles size={48} className="text-red-500 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Analyse IA en cours...</h3>
              <p className="text-slate-500 text-sm animate-pulse font-medium">Diagnostic des images et de la description</p>
            </div>
          </div>
        )}

        {/* STEP 3: PROPOSAL / VALIDATION */}
        {step === 'proposal' && analysis && (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500 pb-20">
            {/* AI Result Card */}
            <div className="glass-card p-8 rounded-[3rem] bg-gradient-to-br from-[#1a1a20] to-[#121214] border border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute -top-20 -right-20 size-64 bg-red-600/10 blur-[80px]"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Diagnostic IA</span>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
                  >
                    <Edit2 size={12} /> {isEditing ? 'Fermer' : 'Modifier'}
                  </button>
                </div>

                <div className="mb-6 space-y-4">
                  {/* Priority */}
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center ${(isEditing ? editedPriority : analysis.priority) === 'Critique' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-orange-500/20 text-orange-500'
                      }`}>
                      <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Priorité</p>
                      {isEditing ? (
                        <select
                          value={editedPriority}
                          onChange={(e) => setEditedPriority(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white font-bold text-sm mt-1 focus:outline-none focus:border-red-500"
                        >
                          {['Basse', 'Moyenne', 'Haute', 'Critique'].map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
                        </select>
                      ) : (
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{analysis.priority}</h3>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                      <Zap size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Expert Requis</p>
                      {isEditing ? (
                        <select
                          value={editedCategory}
                          onChange={(e) => setEditedCategory(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white font-bold text-sm mt-1 focus:outline-none focus:border-indigo-500"
                        >
                          {CATEGORIES.map(c => <option key={c.name} value={c.name} className="bg-black">{c.name}</option>)}
                        </select>
                      ) : (
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{analysis.category}</h3>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <p className="text-slate-300 text-sm font-medium leading-relaxed">
                    "{analysis.summary}"
                  </p>
                </div>

                {/* Safety Advice */}
                <div className="mt-4 flex items-start gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                  <ShieldAlert size={18} className="text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-200/80 font-medium italic">"{analysis.advice}"</p>
                </div>
              </div>
            </div>

            {/* Estimated Price */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/5 rounded-3xl">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Budget Estimé</span>
              <span className="text-white font-black text-sm tracking-tight">{analysis.estimatedPriceRange || 'Sur devis'} FCFA</span>
            </div>

            <button
              onClick={startMatching}
              className="w-full py-6 rounded-[2.5rem] bg-white text-black font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 hover:bg-slate-200"
            >
              Confirmer et Chercher <Search size={18} />
            </button>
          </div>
        )}

        {/* STEP 4: MATCHING (Radar Animation) */}
        {step === 'matching' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-in zoom-in-95 duration-500">
            {/* Radar UI */}
            <div className="relative size-80 flex items-center justify-center">
              {/* Expanding Rings */}
              <div className="absolute inset-0 bg-red-600/5 rounded-full animate-ping [animation-duration:2s]"></div>
              <div className="absolute inset-10 bg-red-600/10 rounded-full animate-ping [animation-duration:2s] [animation-delay:0.5s]"></div>
              <div className="absolute inset-20 bg-red-600/20 rounded-full animate-ping [animation-duration:2s] [animation-delay:1s]"></div>

              {/* Radar Scanner Line */}
              <div className="absolute inset-0 rounded-full border border-red-600/30 overflow-hidden">
                <div className="w-full h-1/2 bg-gradient-to-b from-red-600/20 to-transparent origin-bottom animate-[spin_2s_linear_infinite]"></div>
              </div>

              {/* Center Point */}
              <div className="relative size-24 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.6)] z-10 border-4 border-[#0a0a0c]">
                <Search className="size-10 text-white animate-bounce" />
              </div>

              {/* Mock Artisan Dots appearing */}
              <div className="absolute top-10 right-20 size-3 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="absolute bottom-20 left-10 size-3 bg-white rounded-full animate-bounce [animation-delay:0.8s]"></div>
              <div className="absolute bottom-10 right-10 size-3 bg-white rounded-full animate-bounce [animation-delay:1.5s]"></div>
            </div>

            <div className="text-center space-y-6 max-w-xs mx-auto">
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Recherche...</h3>
                <p className="text-slate-500 text-sm font-medium">Nous contactons les experts <span className="text-white font-bold">{isEditing ? editedCategory : analysis?.category}</span> à proximité.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/5 animate-in slide-in-from-bottom duration-500">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold text-white">Analyse terminée</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/5 animate-in slide-in-from-bottom duration-500 delay-300">
                  <Loader2 size={16} className="text-indigo-500 animate-spin" />
                  <span className="text-xs font-bold text-white">3 Experts notifiés...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
