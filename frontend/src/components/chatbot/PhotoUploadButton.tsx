import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

interface Props {
    onPhotoSelected: (file: File) => void;
    disabled?: boolean;
}

export const PhotoUploadButton: React.FC<Props> = ({ onPhotoSelected, disabled }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onPhotoSelected(file);
            // Reset input so same file can be re-selected if needed
            e.target.value = '';
        }
    };

    return (
        <>
            <button
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-all disabled:opacity-40 active:scale-95"
            >
                <Camera className="size-4" />
                Ajouter une photo
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleChange}
            />
        </>
    );
};
