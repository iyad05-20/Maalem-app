import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface Window {
        deferredPrompt?: BeforeInstallPromptEvent;
    }
}

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        console.log('PWA: Component mounted, checking for captured prompt...');

        // 1. Check if the prompt was already captured in index.html
        if (window.deferredPrompt) {
            console.log('PWA: Prompt found on window object!');
            setDeferredPrompt(window.deferredPrompt);
            setShowInstallButton(true);
        }

        // 2. Also listen in case it fires later
        const handler = (e: Event) => {
            console.log('PWA: beforeinstallprompt event captured in component!', e);
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            window.deferredPrompt = promptEvent;
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // 3. Status check
        console.log('PWA: Checking if already installed...');
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('PWA: App is already installed (standalone mode)');
            setShowInstallButton(false);
            return;
        }

        // 4. Local Preview Hack (Force show on localhost so user can see it's NOT a CSS issue)
        if (IS_DEV && !window.matchMedia('(display-mode: standalone)').matches) {
            console.log('PWA: Local dev mode, forcing banner visibility for UI testing.');
            setShowInstallButton(true);
        }

        return () => {
            console.log('PWA: Component unmounting');
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        console.log('PWA: Install button clicked.');

        if (!deferredPrompt) {
            if (IS_DEV) {
                alert("INFO DEV : Le prompt système n'est pas encore prêt.\n\nEn local, attendez 10-15s en scrollant ou interagissez avec la page.\n\nLe bandeau est ici forcé pour tester le design.");
            } else {
                console.warn('PWA: No prompt available.');
            }
            return;
        }

        try {
            console.log('PWA: Triggering system prompt...');
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA: Outcome: ${outcome}`);

            if (outcome === 'accepted') {
                setShowInstallButton(false);
                window.deferredPrompt = undefined;
            }
        } catch (err) {
            console.error('PWA: Install error:', err);
        }
    };

    if (!showInstallButton) return null;

    return (
        <div className="fixed bottom-[100px] sm:bottom-24 left-0 right-0 z-[9999] px-4 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-md mx-auto bg-indigo-600 text-white rounded-2xl p-4 shadow-[0_20px_50px_rgba(99,102,241,0.4)] border border-white/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/10">
                        📱
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm tracking-tight text-white truncate">Installer Vork</p>
                        <p className="text-[10px] text-indigo-100 font-medium leading-tight opacity-90">
                            {IS_DEV && !deferredPrompt
                                ? "Mode test : En attente du système..."
                                : "Accès rapide depuis votre écran d'accueil."}
                        </p>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="flex-shrink-0 bg-white text-indigo-700 hover:bg-indigo-50 active:scale-95 transition-all px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider shadow-md"
                    >
                        Installer
                    </button>
                    <button
                        onClick={() => setShowInstallButton(false)}
                        className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
