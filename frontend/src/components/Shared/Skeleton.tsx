
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
    const baseClasses = "animate-pulse bg-white/[0.05] relative overflow-hidden";
    const variantClasses = {
        rect: "rounded-2xl",
        circle: "rounded-full",
        text: "rounded-md h-4"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"></div>
        </div>
    );
};
