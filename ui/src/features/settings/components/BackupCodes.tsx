
import React, { useState } from 'react';
import { ShieldCheck, Copy, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { authAPI } from '@/features/auth/api/auth';

interface BackupCodesProps {
    initialCodes?: string[];
    onCodesGenerated?: (codes: string[]) => void;
}

export const BackupCodes: React.FC<BackupCodesProps> = ({ initialCodes, onCodesGenerated }) => {
    const [codes, setCodes] = useState<string[]>(initialCodes || []);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleGenerateCodes = async () => {
        try {
            setIsLoading(true);
            setMessage(null);
            const response = await authAPI.generateBackupCodes();
            const newCodes = response.data.data.backup_codes;
            setCodes(newCodes);
            if (onCodesGenerated) {
                onCodesGenerated(newCodes);
            }
            setMessage({ type: 'success', text: 'New backup codes generated successfully.' });
        } catch (error) {
            console.error('Failed to generate backup codes:', error);
            setMessage({ type: 'error', text: 'Failed to generate backup codes.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCodes = () => {
        if (codes.length === 0) return;
        navigator.clipboard.writeText(codes.join('\n'));
        setMessage({ type: 'success', text: 'Backup codes copied to clipboard.' });
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="bg-bg-card-dark border border-border-color-dark rounded-lg p-6 max-w-2xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Recovery Codes
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Generate backup codes to access your account if you lose your authentication device.
                </p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-md text-sm flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-red-900/30 text-red-400 border border-red-800'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {message.text}
                </div>
            )}

            <div className="space-y-4">
                {codes.length > 0 ? (
                    <div className="space-y-4">
                        <div className="bg-yellow-900/20 border border-yellow-800/50 p-4 rounded-md">
                            <h4 className="flex items-center gap-2 font-medium text-yellow-500 mb-1">
                                <AlertTriangle className="h-4 w-4" />
                                Save these codes!
                            </h4>
                            <p className="text-sm text-yellow-200/80">
                                Store these codes in a safe place. They are the only way to recover your account if you lose access to your MFA device.
                            </p>
                        </div>

                        <div className="bg-bg-main-dark p-4 rounded-md font-mono text-sm grid grid-cols-2 gap-2 text-center border border-border-color-dark">
                            {codes.map((code, index) => (
                                <div key={index} className="bg-bg-card-dark p-2 rounded border border-border-color-dark text-gray-300">
                                    {code}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyCodes}
                                className="flex-1 flex items-center justify-center gap-2 bg-bg-card-dark border border-border-color-dark text-white px-4 py-2 rounded-md hover:bg-bg-main-dark transition-colors"
                                type="button"
                            >
                                <Copy className="h-4 w-4" />
                                Copy Codes
                            </button>
                            <button
                                onClick={handleGenerateCodes}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-bg-card-dark border border-border-color-dark text-white px-4 py-2 rounded-md hover:bg-bg-main-dark transition-colors disabled:opacity-50"
                                type="button"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Regenerate
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4 border border-dashed border-border-color-dark rounded-md">
                        <div className="bg-bg-main-dark p-4 rounded-full">
                            <ShieldCheck className="h-8 w-8 text-gray-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-white">No recovery codes generated</p>
                            <p className="text-sm text-gray-500">
                                Generate recovery codes to ensure you don't get locked out.
                            </p>
                        </div>
                        <button
                            onClick={handleGenerateCodes}
                            disabled={isLoading}
                            className="bg-primary text-bg-main-dark px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            type="button"
                        >
                            {isLoading ? 'Generating...' : 'Generate Codes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackupCodes;
