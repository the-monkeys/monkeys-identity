import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from './utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={cn(
                    "bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-lg transform transition-all animate-in zoom-in-95 duration-200",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-border-color-dark">
                    <h3 className="text-lg font-semibold text-text-main-dark">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
