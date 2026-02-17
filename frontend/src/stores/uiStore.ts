import { create } from 'zustand';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

export interface ConfirmDialogState {
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
}

interface UIState {
    sidebarOpen: boolean;
    activeModal: string | null;
    selectedTaskId: string | null;
    toasts: Toast[];
    confirmDialog: ConfirmDialogState | null;
    toggleSidebar: () => void;
    openModal: (modal: string) => void;
    closeModal: () => void;
    selectTask: (taskId: string | null) => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    showConfirm: (dialog: ConfirmDialogState) => void;
    closeConfirmDialog: () => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: false,
    activeModal: null,
    selectedTaskId: null,
    toasts: [],
    confirmDialog: null,

    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null, selectedTaskId: null }),
    selectTask: (taskId) => set({ selectedTaskId: taskId }),

    addToast: (toast) =>
        set((s) => ({
            toasts: [...s.toasts, { ...toast, id: `toast-${++toastId}` }],
        })),
    removeToast: (id) =>
        set((s) => ({
            toasts: s.toasts.filter((t) => t.id !== id),
        })),

    showConfirm: (dialog) => set({ confirmDialog: dialog }),
    closeConfirmDialog: () => set({ confirmDialog: null }),
}));
