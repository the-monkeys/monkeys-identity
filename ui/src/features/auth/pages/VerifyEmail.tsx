import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import client from '@/pkg/api/client';

type Status = 'loading' | 'success' | 'error';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided.');
            return;
        }

        const verify = async () => {
            try {
                const res = await client.post('/auth/verify-email', { token });
                const data = res.data;
                if (data.success) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Verification failed.');
                }
            } catch (err: any) {
                setStatus('error');
                const msg = err?.response?.data?.error || 'Invalid or expired verification token.';
                setMessage(msg);
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen bg-bg-main-dark flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-bg-card-dark border border-border-color-dark rounded-2xl p-8 text-center shadow-lg">
                {status === 'loading' && (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-text-main-dark mb-2">Verifying your email...</h2>
                        <p className="text-gray-400 text-sm">Please wait while we confirm your email address.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-main-dark mb-2">Email Verified!</h2>
                        <p className="text-gray-400 text-sm mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                        >
                            Continue to Login
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-10 w-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-main-dark mb-2">Verification Failed</h2>
                        <p className="text-gray-400 text-sm mb-6">{message}</p>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                            >
                                Go to Login
                            </button>
                            <button
                                onClick={() => navigate('/signup')}
                                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold rounded-lg transition-colors"
                            >
                                Create New Account
                            </button>
                        </div>
                    </>
                )}

                <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
                    <Mail size={14} />
                    <span>Monkeys Identity</span>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
