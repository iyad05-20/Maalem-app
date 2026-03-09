import React from 'react';
import { generateColorFromName } from '../../utils';

interface UserAvatarProps {
    name: string;
    className?: string;
    textClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
    name,
    className = "size-full",
    textClassName = "text-white font-black uppercase"
}) => {
    const bgColor = generateColorFromName(name);
    const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

    return (
        <div className={`${bgColor} rounded-full flex items-center justify-center shadow-lg border border-white/10 ${className}`}>
            <span className={textClassName}>{initial}</span>
        </div>
    );
};
