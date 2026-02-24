import { useState, useEffect } from 'react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        // Listen for the install prompt event
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallButton(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowInstallButton(false);
        }

        setDeferredPrompt(null);
    };

    if (!showInstallButton) return null;

    return (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
            <div className="max-w-md mx-auto bg-blue-600 text-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Installer l'application</p>
                        <p className="text-xs text-blue-100">Accès rapide depuis votre écran d'accueil</p>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
                    >
                        Installer
                    </button>
                    <button
                        onClick={() => setShowInstallButton(false)}
                        className="text-white text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    );
}
