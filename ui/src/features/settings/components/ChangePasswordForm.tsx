
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileAPI } from '../api/profile';
import { Lock, Loader2, CheckCircle } from 'lucide-react';

const ChangePasswordForm = () => {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }

        try {
            setIsSubmitting(true);
            await profileAPI.changePassword(user.id, {
                current_password: currentPassword,
                new_password: newPassword,
            });
            setMessage({ type: 'success', text: 'Password changed successfully.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            const errorMsg = error?.response?.data?.error || 'Failed to change password.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-bg-card-dark border border-border-color-dark rounded-lg p-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-400" />
                Change Password
            </h2>

            {message && (
                <div className={`mb-6 p-4 rounded-md text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                    {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-bg-main-dark border border-border-color-dark rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Enter current password"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-bg-main-dark border border-border-color-dark rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Minimum 8 characters"
                        required
                        minLength={8}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-bg-main-dark border rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary ${confirmPassword && confirmPassword !== newPassword
                                ? 'border-red-500'
                                : 'border-border-color-dark'
                            }`}
                        placeholder="Re-enter new password"
                        required
                    />
                    {confirmPassword && confirmPassword !== newPassword && (
                        <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting || !currentPassword || !newPassword || newPassword !== confirmPassword}
                        className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-md font-medium hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Changing...
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4" />
                                Change Password
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChangePasswordForm;
