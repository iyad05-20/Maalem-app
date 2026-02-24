import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        // Already installed as standalone — don't show button
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // In dev mode, show the button anyway so we can test the UI
        if (IS_DEV) {
            setShowInstallButton(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) {
            // Dev mode: no real prompt available, just hide
            setShowInstallButton(false);
            return;
        }
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
            <div className="max-w-md mx-auto bg-blue-600 text-white rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-2xl">
                        📱
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">Installer l'application</p>
                        <p className="text-xs text-blue-100">
                            {IS_DEV && !deferredPrompt ? '⚙️ Dev preview — build requis' : 'Accès rapide depuis votre écran'}
                        </p>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold text-sm"
                    >
                        Installer
                    </button>
                </div>
            </div>
        </div>
    );
}
