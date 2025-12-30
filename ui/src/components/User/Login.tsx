import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { LoginType } from '@/Types/types';

const LoginPage = () => {
    const [loginType, setLoginType] = useState<LoginType>('admin');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;

        let identifier = '';
        if (loginType === 'admin') {
            identifier = formData.get('email') as string;
        } else {
            const accountId = formData.get('accountId') as string;
            identifier = accountId;
        }

        try {
            const result = await login(identifier, password);

            if (result.success) {
                navigate('/home');
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 font-sans text-white">
            <div className="max-w-3xl mx-auto bg-bg-card-dark border border-border-color-dark p-8 rounded shadow-sm">
                <h1 className="text-2xl font-semibold mb-6 text-white">Sign In</h1>

                {error && (
                    <div className="mb-6 p-4 rounded-md bg-red-900/20 border border-red-800 flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-300">
                                There was a problem
                            </h3>
                            <div className="mt-1 text-sm text-red-400">
                                {error}
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-6">
                    <div className="space-y-4">
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="loginType"
                                    checked={loginType === 'admin'}
                                    onChange={() => setLoginType('admin')}
                                    className="w-4 h-4 text-primary border-border-color-dark focus:ring-primary focus:ring-offset-0 focus:ring-2 bg-slate-900"
                                />
                            </div>
                            <div>
                                <span className="block text-sm font-bold text-gray-200">Org Admin</span>
                                <span className="block text-xs text-gray-400">Account owner that performs tasks requiring unrestricted access.</span>
                            </div>
                        </label>

                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="loginType"
                                    checked={loginType === 'user'}
                                    onChange={() => setLoginType('user')}
                                    className="w-4 h-4 text-primary border-border-color-dark focus:ring-primary focus:ring-offset-0 focus:ring-2 bg-slate-900"
                                />
                            </div>
                            <div>
                                <span className="block text-sm font-bold text-gray-200">Org User</span>
                                <span className="block text-xs text-gray-400">User within an account that has specific permissions.</span>
                            </div>
                        </label>
                    </div>

                    {/* Dynamic Inputs */}
                    <div className="space-y-4">
                        {loginType === 'admin' ? (
                            <div className="space-y-1">
                                <label htmlFor="email" className="block text-sm font-bold text-gray-200">
                                    Org Admin email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-400"
                                    placeholder="example@email.com"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="accountId" className="block text-sm font-bold text-gray-200">
                                        Account ID (12 digits) or account alias
                                    </label>
                                    <input
                                        id="accountId"
                                        name="accountId"
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-400"
                                        placeholder="1234-5678-9012"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="orgUsername" className="block text-sm font-bold text-gray-200">
                                        Org user name
                                    </label>
                                    <input
                                        id="orgUsername"
                                        name="orgUsername"
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-400"
                                        placeholder="username"
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="block text-sm font-bold text-gray-200">Password</label>
                                <a href="#" className="text-xs text-white font-bold hover:underline">Forgot password?</a>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-3 py-2 text-white border border-border-color-dark bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-2 rounded transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span>Sign In</span>
                        )}
                    </button>

                    <div className="pt-4 border-t border-border-color-dark">
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="w-full text-white text-sm font-bold text-center hover:underline cursor-pointer"
                        >
                            Create a new Admin account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
