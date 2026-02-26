import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setIsLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const result = await login(email, password);

            if (result.success) {
                const queryParams = new URLSearchParams(window.location.search);
                const returnTo = queryParams.get('return_to');
                if (returnTo) {
                    window.location.href = returnTo;
                } else {
                    navigate('/home');
                }
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
            <div className="max-w-3xl mx-auto bg-bg-card-dark border border-border-color-dark p-8 rounded shadow-sm w-full md:w-[450px]">
                <h1 className="text-2xl font-semibold mb-6 text-white text-center">Sign In</h1>

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

                <form onSubmit={handleSignIn} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-bold text-gray-200">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-3 border border-slate-700 bg-[#E8F0FE] rounded-md focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-500 text-black font-medium"
                                placeholder="example@email.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="block text-sm font-bold text-gray-200">Password</label>
                                <Link to="/forgot-password" className="text-xs text-white font-bold hover:underline">Forgot password?</Link>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-3 border border-slate-700 bg-[#E8F0FE] rounded-md focus:border-primary focus:border-2 focus:outline-none transition-all text-black"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#FF5542] hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-md transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer mt-4 text-lg"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span>Sign In</span>
                        )}
                    </button>

                    <div className="pt-8 flex flex-col items-center space-y-3 border-t border-slate-700/50">
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="text-white text-md font-bold hover:underline cursor-pointer"
                        >
                            Create a new Org Admin account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
