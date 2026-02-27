import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ArrowLeft, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import client from '@/pkg/api/client';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Invalid or missing reset token. Please request a new password reset link.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await client.post('/auth/reset-password', { token, new_password: password });
            setDone(true);
        } catch (err: any) {
            setError(extractErrorMessage(err, 'Failed to reset password. The link may have expired. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white">
                <div className="max-w-3xl mx-auto bg-bg-card-dark border border-border-color-dark p-8 rounded shadow-sm w-full md:w-[450px] space-y-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-white">Invalid Reset Link</h1>
                    <p className="text-sm text-gray-400">No reset token found. Please request a new password reset link.</p>
                    <Link to="/forgot-password" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
                        Request a new link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white">
            <div className="max-w-3xl mx-auto bg-bg-card-dark border border-border-color-dark p-8 rounded shadow-sm w-full md:w-[450px] space-y-6">

                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold text-white">Set New Password</h1>
                    <p className="text-sm text-gray-400">Your new password must be at least 8 characters.</p>
                </div>

                {done ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-md bg-green-900/20 border border-green-800 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-green-300">
                                Your password has been reset successfully.
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded transition-all"
                        >
                            Sign In
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-red-900/20 border border-red-800 flex items-start gap-2 text-sm text-red-400">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-sm font-bold text-gray-200">New Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="Minimum 8 characters"
                                    className="w-full px-3 py-2 pr-10 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="confirm" className="block text-sm font-bold text-gray-200">Confirm Password</label>
                            <input
                                id="confirm"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter your password"
                                className="w-full px-3 py-2 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isLoading ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="pt-4 border-t border-border-color-dark text-center">
                    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
