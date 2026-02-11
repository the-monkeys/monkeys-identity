import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Loader2 } from 'lucide-react';
import client from '@/pkg/api/client';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        setError('');
        try {
            await client.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err: any) {
            // Always show success to prevent email enumeration
            setSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white">
            <div className="max-w-3xl mx-auto bg-bg-card-dark border border-border-color-dark p-8 rounded shadow-sm w-full md:w-[450px] space-y-6">

                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold text-white">Forgot Password?</h1>
                    <p className="text-sm text-gray-400">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                {submitted ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-md bg-green-900/20 border border-green-800 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                            <div className="text-sm text-green-300">
                                If an account with <strong>{email}</strong> exists, a password reset link has been sent. Check your inbox — and your spam folder.
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-500">
                            You can view test emails at{' '}
                            <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="text-primary underline">
                                localhost:8025
                            </a>
                        </p>
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
                            <label htmlFor="email" className="block text-sm font-bold text-gray-200">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                placeholder="you@example.com"
                                className="w-full px-3 py-2 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isLoading ? 'Sending…' : 'Send Reset Link'}
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

export default ForgotPasswordPage;
