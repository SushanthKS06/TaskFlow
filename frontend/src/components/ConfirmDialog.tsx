import { AlertTriangle } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

export default function ConfirmDialog() {
    const confirmDialog = useUIStore((s) => s.confirmDialog);
    const closeConfirmDialog = useUIStore((s) => s.closeConfirmDialog);

    if (!confirmDialog) return null;

    const handleConfirm = () => {
        confirmDialog.onConfirm();
        closeConfirmDialog();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-900 border border-surface-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-danger-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-danger-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-semibold text-surface-100 mb-1">
                            {confirmDialog.title}
                        </h3>
                        <p className="text-sm text-surface-400">
                            {confirmDialog.message}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 justify-end">
                    <button
                        onClick={closeConfirmDialog}
                        className="px-4 py-2 text-sm font-medium text-surface-300 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-500 rounded-lg transition-colors"
                    >
                        {confirmDialog.confirmText || 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
