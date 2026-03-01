import { useState, useEffect } from 'react';

export const useFilePreviews = (files: File[]) => {
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        if (!files || files.length === 0) {
            setPreviews([]);
            return;
        }

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);

        // Cleanup: Revoke all blob URLs when files change or component unmounts
        return () => {
            newPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [files]);

    return previews;
};
