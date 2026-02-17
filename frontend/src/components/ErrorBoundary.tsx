import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-surface-900 border border-surface-800 rounded-2xl p-8 text-center shadow-xl">
                        <div className="w-16 h-16 mx-auto mb-4 bg-danger-500/10 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-danger-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-surface-100 mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-surface-400 text-sm mb-6">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
