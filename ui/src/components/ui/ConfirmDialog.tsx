import { Modal } from './Modal';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from './utils';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmDialogProps) {
    const buttonColors = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    };

    const textColors = {
        danger: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
            <div className="flex flex-col space-y-4">
                <div className="flex items-start space-x-3">
                    <div className={cn("p-2 rounded-full bg-slate-800", textColors[variant])}>
                        {variant === 'info' ? <Info size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div className="text-gray-300 text-sm leading-relaxed mt-1">
                        {message}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-border-color-dark">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center cursor-pointer",
                            buttonColors[variant],
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
