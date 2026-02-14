import React from 'react';
import {
    Wind,
    Droplet,
    Lightbulb,
    Paintbrush,
    Wrench,
    Shield,
    Hammer,
    Sparkles,
    Home,
    Car,
    Leaf,
    Camera
} from 'lucide-react';

interface CategoryIconProps {
    name: string;
    className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className }) => {
    switch (name) {
        case 'Wind': return <Wind className={className} />;
        case 'Droplet': return <Droplet className={className} />;
        case 'Lightbulb': return <Lightbulb className={className} />;
        case 'Paintbrush': return <Paintbrush className={className} />;
        case 'Wrench': return <Wrench className={className} />;
        case 'Shield': return <Shield className={className} />;
        case 'Hammer': return <Hammer className={className} />;
        case 'Sparkles': return <Sparkles className={className} />;
        case 'Home': return <Home className={className} />;
        case 'Car': return <Car className={className} />;
        case 'Leaf': return <Leaf className={className} />;
        case 'Camera': return <Camera className={className} />;
        default: return <Hammer className={className} />;
    }
};
