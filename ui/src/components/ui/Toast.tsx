import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from './utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons: Record<ToastType, typeof AlertCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const styles: Record<ToastType, string> = {
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const Icon = icons[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 5000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);

    return (
        <div
            className={cn(
                'flex items-start gap-3 p-4 rounded-lg border shadow-xl backdrop-blur-sm',
                'animate-in slide-in-from-right-full duration-300',
                'min-w-[320px] max-w-[420px]',
                styles[toast.type],
                'bg-slate-900/95'
            )}
        >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-3">{toast.message}</p>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-0.5 hover:bg-white/10 rounded transition-colors shrink-0"
            >
                <X size={14} className="text-gray-500" />
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]); // max 5 toasts
    }, []);

    const value: ToastContextType = {
        toast: addToast,
        success: useCallback((title: string, message?: string) => addToast('success', title, message), [addToast]),
        error: useCallback((title: string, message?: string) => addToast('error', title, message, 8000), [addToast]),
        warning: useCallback((title: string, message?: string) => addToast('warning', title, message), [addToast]),
        info: useCallback((title: string, message?: string) => addToast('info', title, message), [addToast]),
        dismiss,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Toast container — fixed at top-right corner */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
