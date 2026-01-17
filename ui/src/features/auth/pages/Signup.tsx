import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle } from 'lucide-react';

import { authAPI } from '../api/auth';
import { SignupFormData, SignupFormErrors } from '../types/auth';
import { validateSignupForm } from '@/utils/validateSignupForm';

const SignupPage = () => {
    const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setApiError(null);

        const formDataObj = new FormData(e.currentTarget);

        const password = formDataObj.get('password') as string;
        const confirmPassword = formDataObj.get('confirmPassword') as string;

        const data: SignupFormData = {
            email: formDataObj.get('email') as string,
            organisation_id: formDataObj.get('organisation_id') as string,
            first_name: formDataObj.get('first_name') as string,
            last_name: formDataObj.get('last_name') as string,
            password: password,
        };

        const validationErrors = validateSignupForm(data, confirmPassword);
        setFormErrors(validationErrors);

        if (Object.keys(validationErrors).length === 0) {
            try {
                await authAPI.createAdmin(data);
                navigate('/login');
            } catch (error: any) {
                console.error("Signup failed:", error);
                setApiError(error.response?.data?.message || 'Failed to create account. Please try again.');
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="max-w-3xl w-full flex-1 flex flex-col items-center py-24 px-4 mx-auto">
                <div className="mb-12 text-center text-sm text-gray-400">
                    <p>We strongly recommend enabling Multi-Factor Authentication (MFA). Monkeys IAM follows the principle of least privilege.</p>
                </div>
                <div className="bg-bg-card-dark border border-border-color-dark rounded p-10 shadow-sm">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center text-text-main-dark">
                        Create admin account
                    </h2>

                    {apiError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            <span className="text-sm">{apiError}</span>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        {/* Organisation & Email */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="email" className="block text-sm font-bold text-gray-200">Email address</label>
                                <p className="text-xs text-gray-400 mb-2">Used for recovery and administrative tasks.</p>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className={`w-full px-3 py-2 text-gray-50 border ${formErrors.email ? 'border-red-500' : 'border-slate-600'} bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all`}
                                    placeholder="admin@example.com"
                                    defaultValue=""
                                    onChange={() => {
                                        if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                                    }}
                                />
                                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="username" className="block text-sm font-bold text-gray-200">Username</label>
                                <p className="text-xs text-gray-400 mb-2">Choose a name for your account. You can change this name later.</p>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 text-gray-50 border border-slate-600 bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                    placeholder="org_1234"
                                    defaultValue=""
                                />
                            </div>
                        </div>

                        {/* Names */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="first_name" className="block text-sm font-semibold text-white">First Name</label>
                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    placeholder="John"
                                    required
                                    className="w-full px-3 py-2 text-gray-50 border border-slate-600 bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                    defaultValue=""
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="last_name" className="block text-sm font-semibold text-white">Last Name</label>
                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    placeholder="Doe"
                                    required
                                    className="w-full px-3 py-2 text-gray-50 border border-slate-600 bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                    defaultValue=""
                                />
                            </div>
                        </div>

                        {/* Password Section */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="password" className="text-sm font-semibold text-white flex items-center">
                                    Root user password
                                    <div className="relative group ml-2">
                                        <AlertCircle className="w-4 h-4 text-gray-500 cursor-help" />
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 p-3 bg-gray-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-gray-900"></div>
                                            Password must be 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$&lt;&gt;!)
                                        </div>
                                    </div>
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className={`w-full px-3 py-2 text-gray-50 border ${formErrors.password ? 'border-red-500' : 'border-slate-600'} bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all`}
                                    defaultValue=""
                                    onChange={() => {
                                        if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                                    }}
                                />
                                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white">Confirm password</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className={`w-full px-3 py-2 text-gray-50 border ${formErrors.confirmPassword ? 'border-red-500' : 'border-slate-600'} bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all`}
                                    defaultValue=""
                                    onChange={() => {
                                        if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: undefined });
                                    }}
                                />
                                {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                className="w-full px-8 py-3 bg-primary text-white font-bold rounded shadow-sm hover:bg-opacity-90 transition-all cursor-pointer"
                            >
                                Verify & Create Admin Account
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
