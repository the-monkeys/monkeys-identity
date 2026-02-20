import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LoginType } from '../types/auth';

const LoginPage = () => {
    const [loginType, setLoginType] = useState<LoginType>('admin');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loginType === 'root') {
            setError('Root Admin login is currently unavailable.');
            return;
        }

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
        <div className="min-h-screen relative flex flex-col items-center justify-center p-4 font-sans text-white bg-[#0B1222]">
            <div className="w-full max-w-[800px] mx-auto bg-[#17212F] p-10 rounded-lg shadow-2xl border border-white/5">
                <h1 className="text-3xl font-bold mb-8 text-white">Sign In</h1>

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
                    <div className="grid grid-cols-2 gap-8 mb-4">
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="loginType"
                                    checked={loginType === 'root'}
                                    onChange={() => setLoginType('root')}
                                    className="w-5 h-5 text-primary border-slate-600 focus:ring-primary focus:ring-offset-0 focus:ring-2 bg-slate-900"
                                />
                            </div>
                            <div>
                                <span className={`block text-md font-bold ${loginType === 'root' ? 'text-white' : 'text-gray-300'}`}>Org Admin</span>
                                <span className="block text-sm text-gray-400 mt-1 leading-tight">Organization owner that performs tasks requiring unrestricted access.</span>
                            </div>
                        </label>

                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="loginType"
                                    checked={loginType === 'admin'}
                                    onChange={() => setLoginType('admin')}
                                    className="w-5 h-5 text-primary border-slate-600 focus:ring-primary focus:ring-offset-0 focus:ring-2 bg-slate-900"
                                />
                            </div>
                            <div>
                                <span className={`block text-md font-bold ${loginType === 'admin' ? 'text-white' : 'text-gray-300'}`}>Root Admin</span>
                                <span className="block text-sm text-gray-400 mt-1 leading-tight">Root Admin that performs tasks requiring unrestricted access.</span>
                            </div>
                        </label>
                    </div>

                    <div className="mb-8">
                        <label className="flex items-start space-x-3 cursor-pointer group w-1/2">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    name="loginType"
                                    checked={loginType === 'user'}
                                    onChange={() => setLoginType('user')}
                                    className="w-5 h-5 text-primary border-slate-600 focus:ring-primary focus:ring-offset-0 focus:ring-2 bg-slate-900"
                                />
                            </div>
                            <div>
                                <span className={`block text-md font-bold ${loginType === 'user' ? 'text-white' : 'text-gray-300'}`}>Org User</span>
                                <span className="block text-sm text-gray-400 mt-1 leading-tight">User within an account that has specific permissions.</span>
                            </div>
                        </label>
                    </div>

                    {/* Dynamic Inputs */}
                    <div className="space-y-6">
                        {loginType === 'user' ? (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="accountId" className="block text-sm font-bold text-gray-200">
                                        Account ID (12 digits) or account alias
                                    </label>
                                    <input
                                        id="accountId"
                                        name="accountId"
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 text-white border border-slate-700 bg-[#E8F0FE] rounded-md focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-500 text-black"
                                        placeholder="1234-5678-9012"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="orgUsername" className="block text-sm font-bold text-gray-200">
                                        Org user name
                                    </label>
                                    <input
                                        id="orgUsername"
                                        name="orgUsername"
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 text-white border border-slate-700 bg-[#E8F0FE] rounded-md focus:border-primary focus:border-2 focus:outline-none transition-all placeholder:text-gray-500 text-black"
                                        placeholder="username"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-bold text-gray-200">
                                    {loginType === 'root' ? 'Root Admin email address' : 'Org Admin email address'}
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
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="block text-sm font-bold text-gray-200">Password</label>
                                <a href="#" className="text-sm text-white font-bold hover:underline">Forgot password?</a>
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
                        <button
                            type="button"
                            onClick={() => navigate('/signup?type=root')}
                            className="text-white text-md font-bold hover:underline cursor-pointer"
                        >
                            Create a new root Admin account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
