
import React from 'react';
import { Star, MapPin, Heart, ChevronRight } from 'lucide-react';

interface PriceRange {
    min: number;
    max: number;
}

interface ArtisanCardProps {
    id: string;
    name: string;
    photo: string;
    category: string;
    rating: number;
    reviewCount: number;
    distance: number;
    level: number;
    priceRange: PriceRange;
    isFavorite?: boolean;
    onFavoriteToggle?: (id: string) => void;
    onRequest?: (id: string) => void;
}

export const ArtisanCard: React.FC<ArtisanCardProps> = ({
    id,
    name,
    photo,
    category,
    rating,
    reviewCount,
    distance,
    level,
    priceRange,
    isFavorite = false,
    onFavoriteToggle,
    onRequest
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                    <img
                        src={photo || 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100'}
                        className="w-12 h-12 rounded-full object-cover"
                        alt={name}
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                                Niveau {level}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-500 font-medium">{rating} ({reviewCount} avis)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-400 mb-3 ml-12">
                <MapPin size={12} />
                <span>{distance} km • Guéliz</span>
            </div>

            <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {category}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                    {priceRange.min}-{priceRange.max} DH
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onFavoriteToggle?.(id)}
                    className={`p-2 rounded-xl border border-gray-100 transition-colors ${isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:bg-gray-50'}`}
                >
                    <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                    onClick={() => onRequest?.(id)}
                    className="flex-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    Demander <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};
