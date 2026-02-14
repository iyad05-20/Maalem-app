import React, { useState, useEffect, useRef } from 'react';

export const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
};

export const isImageUrl = (str: string | undefined | null) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('data:') || str.startsWith('http') || str.startsWith('blob:');
};

interface SmartAvatarProps {
    src?: string;
    name: string;
    className?: string;
    initialsClassName?: string;
    timeout?: number;
}

export const SmartAvatar: React.FC<SmartAvatarProps> = ({
    src,
    name,
    className = "w-full h-full",
    initialsClassName = "text-xl font-black text-white/90",
    timeout = 2000
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const validSrc = typeof src === 'string' ? src : '';

    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);

        let interval: any;
        const checkImage = () => {
            if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
                setIsLoaded(true);
                if (interval) clearInterval(interval);
            }
        };
        if (validSrc) {
            checkImage();
            interval = setInterval(checkImage, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [validSrc]);

    const initials = getInitials(name);

    return (
        <div className={`relative overflow-hidden flex items-center justify-center bg-slate-800 ${className}`}>
            <span className={`${initialsClassName} absolute z-0 select-none text-center px-1 transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}>
                {initials}
            </span>
            {validSrc && isImageUrl(validSrc) && !hasError && (
                <img
                    ref={imgRef}
                    src={validSrc}
                    alt={name}
                    className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                />
            )}
        </div>
    );
};
