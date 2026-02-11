import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    ShieldCheck, ShieldOff, KeyRound, CheckCircle2,
    AlertTriangle, Copy, Loader2, Eye, EyeOff
} from 'lucide-react';
import { authAPI } from '@/features/auth/api/auth';

type Step = 'idle' | 'scan' | 'verify' | 'backup-codes' | 'disabling';

interface MfaSetupProps {
    isEnabled?: boolean;
}

const MfaSetup: React.FC<MfaSetupProps> = ({ isEnabled = false }) => {
    const [step, setStep] = useState<Step>('idle');
    const [mfaEnabled, setMfaEnabled] = useState(isEnabled);
    const [provisionUri, setProvisionUri] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showSecret, setShowSecret] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleStartSetup = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await authAPI.setupMFA();
            setProvisionUri(res.data.data.provision_url);
            setSecret(res.data.data.secret);
            setStep('scan');
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to start MFA setup. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) {
            setError('Please enter the 6-digit code from your authenticator app.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await authAPI.verifyMFA(code);
            setBackupCodes(res.data.data.backup_codes || []);
            setMfaEnabled(true);
            setStep('backup-codes');
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable = async () => {
        if (code.length !== 6) {
            setError('Please enter the 6-digit code from your authenticator app to confirm.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authAPI.disableMFA(code);
            setMfaEnabled(false);
            setStep('idle');
            setCode('');
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-bg-card-dark border border-border-color-dark rounded-lg p-6 max-w-2xl">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    {mfaEnabled
                        ? <ShieldCheck className="h-5 w-5 text-green-400" />
                        : <KeyRound className="h-5 w-5 text-primary" />}
                    Two-Factor Authentication
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    {mfaEnabled
                        ? 'Your account is protected with two-factor authentication.'
                        : 'Add an extra layer of security to your account using an authenticator app.'}
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-md text-sm flex items-center gap-2 bg-red-900/30 text-red-400 border border-red-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* ──────────── IDLE (not enabled) ──────────── */}
            {step === 'idle' && !mfaEnabled && (
                <button
                    onClick={handleStartSetup}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-primary text-bg-main-dark px-5 py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {isLoading ? 'Starting setup…' : 'Enable Two-Factor Authentication'}
                </button>
            )}

            {/* ──────────── ENABLED state ──────────── */}
            {step === 'idle' && mfaEnabled && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        MFA is active on your account
                    </div>
                    <button
                        onClick={() => { setStep('disabling'); setError(null); setCode(''); }}
                        className="flex items-center gap-2 border border-red-700 text-red-400 px-5 py-2.5 rounded-md text-sm font-medium hover:bg-red-900/20 transition-colors"
                    >
                        <ShieldOff className="h-4 w-4" />
                        Disable MFA
                    </button>
                </div>
            )}

            {/* ──────────── SCAN QR ──────────── */}
            {step === 'scan' && (
                <div className="space-y-5">
                    <p className="text-sm text-gray-300">
                        <span className="font-medium text-white">Step 1:</span> Scan the QR code below using an authenticator app like Google Authenticator or Authy.
                    </p>
                    <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-xl">
                            <QRCodeSVG value={provisionUri} size={180} includeMargin />
                        </div>
                    </div>

                    <div className="bg-bg-main-dark border border-border-color-dark rounded-md p-3">
                        <p className="text-xs text-gray-500 mb-1">Manual entry key</p>
                        <div className="flex items-center gap-2">
                            <code className="text-sm text-gray-300 font-mono flex-1 break-all">
                                {showSecret ? secret : '•'.repeat(Math.min(secret.length, 32))}
                            </code>
                            <button onClick={() => setShowSecret(v => !v)} className="text-gray-500 hover:text-gray-300">
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => { setStep('verify'); setError(null); }}
                        className="w-full bg-primary text-bg-main-dark py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
                    >
                        I've scanned the QR code →
                    </button>
                </div>
            )}

            {/* ──────────── VERIFY CODE ──────────── */}
            {step === 'verify' && (
                <div className="space-y-5">
                    <p className="text-sm text-gray-300">
                        <span className="font-medium text-white">Step 2:</span> Enter the 6-digit code from your authenticator app to complete setup.
                    </p>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-bg-main-dark border border-border-color-dark text-white text-center text-2xl font-mono tracking-widest rounded-md px-4 py-3 focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setStep('scan'); setError(null); setCode(''); }}
                            className="flex-1 border border-border-color-dark text-gray-300 py-2.5 rounded-md font-medium hover:bg-bg-main-dark transition-colors"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleVerify}
                            disabled={isLoading || code.length !== 6}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-bg-main-dark py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {isLoading ? 'Verifying…' : 'Verify & Enable'}
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────── BACKUP CODES ──────────── */}
            {step === 'backup-codes' && (
                <div className="space-y-5">
                    <div className="bg-yellow-900/20 border border-yellow-800/50 p-4 rounded-md">
                        <h4 className="flex items-center gap-2 font-medium text-yellow-400 mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            Save your recovery codes now!
                        </h4>
                        <p className="text-sm text-yellow-200/80">
                            These are one-time codes to access your account if you lose your device. They will not be shown again.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm text-gray-300 bg-bg-main-dark p-4 rounded-md border border-border-color-dark text-center">
                        {backupCodes.map((c, i) => (
                            <div key={i} className="bg-bg-card-dark px-3 py-2 rounded border border-border-color-dark">{c}</div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCopyCodes}
                            className="flex-1 flex items-center justify-center gap-2 border border-border-color-dark text-gray-300 py-2.5 rounded-md font-medium hover:bg-bg-main-dark transition-colors"
                        >
                            <Copy className="h-4 w-4" />
                            {copied ? 'Copied!' : 'Copy Codes'}
                        </button>
                        <button
                            onClick={() => setStep('idle')}
                            className="flex-1 bg-primary text-bg-main-dark py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────── DISABLE ──────────── */}
            {step === 'disabling' && (
                <div className="space-y-5">
                    <p className="text-sm text-gray-300">
                        Enter the 6-digit code from your authenticator app to confirm disabling MFA.
                    </p>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-bg-main-dark border border-border-color-dark text-white text-center text-2xl font-mono tracking-widest rounded-md px-4 py-3 focus:outline-none focus:border-red-500"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setStep('idle'); setError(null); setCode(''); }}
                            className="flex-1 border border-border-color-dark text-gray-300 py-2.5 rounded-md font-medium hover:bg-bg-main-dark transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDisable}
                            disabled={isLoading || code.length !== 6}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-700 text-white py-2.5 rounded-md font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                            {isLoading ? 'Disabling…' : 'Confirm Disable'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MfaSetup;
