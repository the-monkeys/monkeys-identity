import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, AlertCircle, AlertTriangle } from 'lucide-react';

import { steps } from '@/constants/signup';
import { validateSignupForm } from '@/utils/validateForm';
import { SignupFormData, SignupFormErrors } from '@/Types/interfaces';
import { authAPI } from '@/services/api';

const SignupPage = () => {
    const [step, setStep] = useState<number>(1);
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [formData, setFormData] = useState<SignupFormData>({
        email: '',
        organisation_id: '',
        first_name: '',
        last_name: '',
        password: '',
    });
    const [errors, setErrors] = useState<SignupFormErrors>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);
        const validationErrors = validateSignupForm(formData, confirmPassword);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length === 0) {
            try {
                await authAPI.createAdmin(formData);
                navigate('/login');
            } catch (error: any) {
                console.error("Signup failed:", error);
                setApiError(error.response?.data?.message || 'Failed to create account. Please try again.');
            }
        }
    };

    const handleNext = () => {
        setStep(step + 1);
    };

    const handlePrevious = () => {
        setStep(step - 1);
    };

    return (
        <div className="min-h-screen bg-bg-card-light dark:bg-bg-main-dark flex flex-col font-sans">
            {/* Top Header */}
            <div className="bg-bg-card-light dark:bg-bg-card-dark border-b border-border-color-light dark:border-border-color-dark px-8 py-4 flex justify-between items-center">
                <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => navigate('landing')}
                >
                    <Shield className="w-8 h-8 text-primary" />
                    <span className="text-xl font-bold tracking-tight text-text-main-light dark:text-text-main-dark">
                        Monkeys{' '}<span className="text-primary">IAM</span>
                    </span>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="text-sm font-bold text-black dark:text-white hover:underline cursor-pointer"
                >
                    Sign In
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center py-12 px-4">
                <div className="w-full max-w-[800px]">
                    {/* Progress Indicator */}
                    <div className="flex items-center mb-12">
                        {steps.map((s, i) => (
                            <React.Fragment key={i}>
                                <div className="flex flex-col items-center relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step > i + 1 ? 'bg-primary border-primary text-white' :
                                        step === i + 1 ? 'border-primary text-primary' : 'border-gray-300 text-gray-300'
                                        }`}>
                                        {step > i + 1 ? <Check className="w-5 h-5" /> : s.icon}
                                    </div>
                                    <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${step >= i + 1 ? 'text-primary' : 'text-gray-400'
                                        }`}>
                                        {s.title}
                                    </span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="bg-bg-card-light dark:bg-bg-card-dark border border-border-color-light dark:border-border-color-dark rounded p-10 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="md:col-span-2">
                            <h2 className="text-2xl font-semibold mb-6 flex items-center">
                                Step {step}: {steps[step - 1].title}
                                {step === 3 && (
                                    <div className="relative group ml-2">
                                        <AlertCircle className="w-5 h-5 text-gray-500 cursor-help" />
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 p-3 bg-gray-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-gray-900"></div>
                                            Password must be 8 characters long, Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$&lt;&gt;!)
                                        </div>
                                    </div>
                                )}
                            </h2>

                            {apiError && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    <span className="text-sm">{apiError}</span>
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                {step === 1 && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Root user email address</label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Used for account recovery and some administrative tasks.</p>
                                            <input
                                                type="email"
                                                required
                                                className={`w-full px-3 py-2 text-gray-700 dark:text-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all`}
                                                placeholder="admin@example.com"
                                                value={formData.email}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, email: e.target.value });
                                                    if (errors.email) setErrors({ ...errors, email: undefined });
                                                }}
                                            />
                                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Organization Id</label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Choose a name for your account. You can change this name later.</p>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 text-gray-700 dark:text-gray-50 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                                placeholder="org_1234"
                                                value={formData.organisation_id}
                                                onChange={(e) => setFormData({ ...formData, organisation_id: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}

                                {step === 2 && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">This step usually requires phone verification and billing info in AWS. For our brand experience, we focus on identity.</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="block text-sm font-semibold text-black dark:text-white">First Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="John"
                                                    required
                                                    className="w-full px-3 py-2 text-gray-700 dark:text-gray-50 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                                    value={formData.first_name}
                                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-sm font-semibold text-black dark:text-white">Last Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Doe"
                                                    required
                                                    className="w-full px-3 py-2 text-gray-700 dark:text-gray-50 border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all"
                                                    value={formData.last_name}
                                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-semibold text-black dark:text-white">Root user password</label>
                                            <input
                                                type="password"
                                                required
                                                className={`w-full px-3 py-2 text-gray-700 dark:text-gray-50 border ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all`}
                                                value={formData.password}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, password: e.target.value });
                                                    if (errors.password) setErrors({ ...errors, password: undefined });
                                                }}
                                            />
                                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-semibold text-black dark:text-white">Confirm password</label>
                                            <input
                                                type="password"
                                                required
                                                className={`w-full px-3 py-2 text-gray-700 dark:text-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} dark:bg-slate-900 rounded focus:border-primary focus:border-2 focus:outline-none transition-all`}
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                                                }}
                                            />
                                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                                        </div>
                                    </>
                                )}

                                <div className="pt-6 flex justify-between">
                                    {step > 1 ? (
                                        <button
                                            type="button"
                                            onClick={handlePrevious}
                                            className="px-6 py-2 text-black dark:text-white border border-gray-300 dark:border-slate-600 font-bold rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                    ) : <div></div>}
                                    {step === 3 ? (
                                        <button
                                            type="submit"
                                            className="px-8 py-2 bg-primary text-white font-bold rounded shadow-sm hover:bg-opacity-90 transition-all cursor-pointer"
                                        >
                                            Verify & Create Account
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="px-8 py-2 bg-primary text-white font-bold rounded shadow-sm hover:bg-opacity-90 transition-all cursor-pointer"
                                        >
                                            Continue
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="hidden md:block">
                            <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded border border-border-color-light dark:border-border-color-dark">
                                <h3 className="text-sm font-bold mb-4 flex items-center space-x-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <span className="text-black dark:text-white">Monkeys Security</span>
                                </h3>
                                <ul className="text-xs space-y-3 text-gray-600 dark:text-gray-400 list-disc pl-4">
                                    <li>Your root user has unrestricted access to your Monkeys resources.</li>
                                    <li>We strongly recommend enabling Multi-Factor Authentication (MFA).</li>
                                    <li>Monkeys IAM follows the principle of least privilege.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
