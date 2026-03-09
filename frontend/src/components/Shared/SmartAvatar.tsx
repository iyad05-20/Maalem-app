import React, { useState, useEffect, useRef } from 'react';
import { generateColorFromName, getInitials, isImageUrl, migrateUrl } from '../../utils';

interface SmartAvatarProps {
    src?: string;
    name: string;
    className?: string;
    initialsClassName?: string;
}

export const SmartAvatar: React.FC<SmartAvatarProps> = ({
    src,
    name,
    className = "w-full h-full",
    initialsClassName = "text-xl font-black text-white/90"
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Automatically migrate/fix the URL if provided
    const validSrc = src ? migrateUrl(src) : '';

    // Vibrant dynamic background from name
    const bgColor = generateColorFromName(name);

    useEffect(() => {
        if (!validSrc || !isImageUrl(validSrc)) {
            setIsLoaded(false);
            setHasError(false);
            return;
        }

        // Reset state for new SRC
        setIsLoaded(false);
        setHasError(false);

        // Preload check for cached images
        const img = new Image();
        img.src = validSrc;
        if (img.complete) {
            setIsLoaded(true);
        }
    }, [validSrc]);

    const initials = getInitials(name);

    return (
        <div className={`relative overflow-hidden flex items-center justify-center ${bgColor} ${className}`}>
            <span className={`${initialsClassName} absolute z-0 select-none text-center px-1 transition-all duration-500 transform ${isLoaded ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                {initials}
            </span>
            {validSrc && isImageUrl(validSrc) && !hasError && (
                <img
                    ref={imgRef}
                    src={validSrc}
                    alt={name}
                    className={`absolute inset-0 w-full h-full object-cover z-10 transition-all duration-700 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
};
