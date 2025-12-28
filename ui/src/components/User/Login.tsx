import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import Navbar from '@/components/navbar/Navbar';

type LoginType = 'admin' | 'user';

const LoginPage = () => {
    const [loginType, setLoginType] = useState<LoginType>('admin');
    const [formStep, setFormStep] = useState<number>(1);
    const [email, setEmail] = useState<string>('');
    const [accountId, setAccountId] = useState<string>('');
    const [iamUsername, setIamUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFormStep(2);
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await login(email, password);

            if (result.success) {
                navigate('/dashboard');
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
        <div className="min-h-screen relative flex items-center justify-center p-4 bg-bg-card-light dark:bg-bg-main-dark transition-colors font-sans">
            <Navbar />

            <div className="w-full max-w-[440px]">

                <div className="bg-bg-card-light dark:bg-bg-card-dark border border-border-color-light dark:border-border-color-dark p-8 rounded shadow-sm">
                    <h1 className="text-2xl font-semibold mb-6 text-black dark:text-white">Sign In</h1>

                    {error && (
                        <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                                    There was a problem
                                </h3>
                                <div className="mt-1 text-sm text-red-700 dark:text-red-400">
                                    {error}
                                </div>
                            </div>
                        </div>
                    )}

                    {formStep === 1 ? (
                        <form onSubmit={handleNext} className="space-y-6">
                            <div className="space-y-4">
                                <label className="flex items-start space-x-3 cursor-pointer group">
                                    <div className="mt-1">
                                        <input
                                            type="radio"
                                            name="loginType"
                                            checked={loginType === 'admin'}
                                            onChange={() => setLoginType('admin')}
                                            className="w-4 h-4 text-primary border-border-color-light dark:border-border-color-dark focus:ring-primary focus:ring-offset-0 focus:ring-2"
                                        />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">Org Admin</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">Account owner that performs tasks requiring unrestricted access.</span>
                                    </div>
                                </label>

                                <label className="flex items-start space-x-3 cursor-pointer group">
                                    <div className="mt-1">
                                        <input
                                            type="radio"
                                            name="loginType"
                                            checked={loginType === 'user'}
                                            onChange={() => setLoginType('user')}
                                            className="w-4 h-4 text-primary border-border-color-light dark:border-border-color-dark focus:ring-primary focus:ring-offset-0 focus:ring-2"
                                        />
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-gray-700 dark:text-gray-200">Org User</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">User within an account that has specific permissions.</span>
                                    </div>
                                </label>
                            </div>

                            {/* Dynamic Input */}
                            <div className="space-y-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                                    {loginType === 'admin' ? 'Org Admin email address' : 'Account ID (12 digits) or account alias'}
                                </label>
                                <input
                                    type={loginType === 'admin' ? 'email' : 'text'}
                                    required
                                    value={loginType === 'admin' ? email : accountId}
                                    onChange={(e) => loginType === 'admin' ? setEmail(e.target.value) : setAccountId(e.target.value)}
                                    className="w-full px-3 py-2 text-white border border-border-color-light dark:border-border-color-dark dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-400"
                                    placeholder={loginType === 'admin' ? 'example@email.com' : '1234-5678-9012'}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-2 rounded transition-all shadow-sm"
                            >
                                Next
                            </button>

                            <div className="pt-4 border-t border-border-color-light dark:border-border-color-dark">
                                <button
                                    type="button"
                                    onClick={() => navigate('/signup')}
                                    className="w-full text-black dark:text-white text-sm font-bold text-center hover:underline cursor-pointer"
                                >
                                    Create a new IAM account
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSignIn} className="space-y-6">
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded text-sm mb-4 border border-border-color-light dark:border-border-color-dark flex justify-between items-center">
                                <div>
                                    <span className="text-gray-500 block text-[10px] font-bold uppercase tracking-wider">
                                        {loginType === 'admin' ? 'Org Admin' : 'Org User'}
                                    </span>
                                    <span className="font-mono text-gray-800 dark:text-gray-200">
                                        {loginType === 'admin' ? email : accountId}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormStep(1)}
                                    className="text-black dark:text-white text-xs font-bold hover:underline cursor-pointer"
                                >
                                    Edit
                                </button>
                            </div>

                            {loginType === 'user' && (
                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">IAM user name</label>
                                    <input
                                        type="text"
                                        required
                                        value={iamUsername}
                                        onChange={(e) => setIamUsername(e.target.value)}
                                        className="w-full px-3 py-2 border border-border-color-light dark:border-border-color-dark dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Password</label>
                                    <a href="#" className="text-xs text-black dark:text-white font-bold hover:underline">Forgot password?</a>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-border-color-light dark:border-border-color-dark dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                />
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

                            <div className="flex items-center justify-center space-x-4 pt-4">
                                <button type="button"
                                    onClick={() => setFormStep(1)}
                                    disabled={isLoading}
                                    className="text-gray-500 hover:text-text-main-light text-xs font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    <span>Back to login options</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Links */}
                <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-gray-500 font-bold uppercase tracking-wider opacity-60">
                    <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                    <a href="#" className="hover:text-primary transition-colors">Terms</a>
                    <a href="#" className="hover:text-primary transition-colors">Cookie Preferences</a>
                    <span>© 2025 Monkeys IAM</span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
