
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-6 text-center">
                    <div className="size-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/20">
                        <AlertTriangle className="size-10 text-red-500" />
                    </div>

                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                        Oups ! Quelque chose a mal tourné
                    </h2>

                    <p className="text-slate-400 text-sm max-w-xs mb-8 font-medium">
                        L'application a rencontré une erreur inattendue. Ne vous inquiétez pas, vos données sont en sécurité.
                    </p>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 w-full max-w-sm overflow-hidden">
                        <p className="text-[10px] text-red-400 font-mono break-all line-clamp-2">
                            {this.state.error?.message || 'Erreur inconnue'}
                        </p>
                    </div>

                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        <RefreshCw className="size-5" />
                        Recharger l'application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
