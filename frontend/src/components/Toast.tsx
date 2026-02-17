import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    error: 'border-danger-500/30 bg-danger-500/10 text-danger-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    info: 'border-primary-500/30 bg-primary-500/10 text-primary-300',
};

export default function ToastContainer() {
    const toasts = useUIStore((s) => s.toasts);
    const removeToast = useUIStore((s) => s.removeToast);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    id={toast.id}
                    type={toast.type}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
}

function ToastItem({
    id,
    type,
    message,
    duration = 4000,
    onClose,
}: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}) {
    const Icon = icons[type];

    useEffect(() => {
        const timer = setTimeout(() => onClose(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg animate-slide-in ${colors[type]}`}
        >
            <Icon size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    );
}
