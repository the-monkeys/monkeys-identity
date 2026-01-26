import { useState } from 'react';
import { AlertTriangle, Pause } from 'lucide-react';
import { userAPI } from '../api/user';
import { User } from '../types/user';

interface SuspendConfirmDialogProps {
    user: User;
    onClose: () => void;
    onConfirm: () => void;
}

const SuspendConfirmDialog = ({ user, onClose, onConfirm }: SuspendConfirmDialogProps) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSuspend = async () => {
        if (!reason.trim()) {
            setError('Suspension reason is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call the dedicated suspend endpoint with a reason
            await userAPI.suspend(user.id, reason);
            onConfirm();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to suspend user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-yellow-500/30 rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-color-dark">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <AlertTriangle size={24} className="text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Suspend User</h2>
                            <p className="text-sm text-gray-400 mt-1">Temporarily disable user access</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="p-4 bg-slate-900/50 border border-border-color-dark rounded-lg">
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-500">Username:</span>
                                <p className="text-text-main-dark font-semibold">{user.username}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Email:</span>
                                <p className="text-text-main-dark">{user.email}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Current Status:</span>
                                <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${user.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                                    'bg-gray-100/10 border-gray-500/30 text-gray-500'
                                    }`}>
                                    {user.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-400">
                            <strong>Note:</strong> Suspending this user will prevent them from logging in.
                            You can reactivate the account later.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Suspension Reason <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-yellow-500 transition-all"
                            placeholder="Enter the reason for suspending this user..."
                            rows={3}
                            required
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-color-dark flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSuspend}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || !reason.trim()}
                    >
                        <Pause size={16} />
                        <span>{loading ? 'Suspending...' : 'Suspend User'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuspendConfirmDialog;
