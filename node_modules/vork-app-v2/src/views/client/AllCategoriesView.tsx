
import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../../data/mockData';
import { CategoryIcon } from '../../components/Shared/CategoryIcon';
import { Category, View } from '../../types';

interface Props {
    onBack: () => void;
    onSelectCategory: (c: Category) => void;
}

export const AllCategoriesView: React.FC<Props> = ({ onBack, onSelectCategory }) => {
    return (
        <div className="min-h-screen bg-[#0a0a0c] pt-12 pb-32 px-6">
            <header className="flex items-center gap-4 mb-10">
                <button
                    onClick={onBack}
                    className="size-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Toutes les catégories</h1>
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">Explorez nos services</p>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => onSelectCategory(cat)}
                        className="group flex flex-col items-center gap-4 p-8 glass-card rounded-[2.5rem] bg-[#121214]/60 border border-white/5 hover:border-indigo-500/30 transition-all active:scale-95"
                    >
                        <div className={`size-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 ${cat.color.split(' ')[0]}`}>
                            <CategoryIcon name={cat.icon} className={`size-8 ${cat.color.split(' ')[1]}`} />
                        </div>
                        <div className="text-center">
                            <span className="text-xs font-black text-white uppercase tracking-tight block">{cat.name}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">Explorer</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
