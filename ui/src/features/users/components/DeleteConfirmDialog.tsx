import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { userAPI } from '../api/user';
import { User } from '../types/user';

interface DeleteConfirmDialogProps {
    user: User;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteConfirmDialog = ({ user, onClose, onConfirm }: DeleteConfirmDialogProps) => {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (confirmText !== user.username) {
            setError('Username does not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await userAPI.delete(user.id);
            onConfirm();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-color-dark">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle size={24} className="text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Delete User</h2>
                            <p className="text-sm text-gray-400 mt-1">This action cannot be undone</p>
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
                                <span className="text-gray-500">Display Name:</span>
                                <p className="text-text-main-dark">{user.display_name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400">
                            <strong>Warning:</strong> Deleting this user will permanently remove all associated data.
                            This action is irreversible.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Type <span className="text-red-400 font-mono">{user.username}</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-red-500 transition-all"
                            placeholder="Enter username"
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
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || confirmText !== user.username}
                    >
                        <Trash2 size={16} />
                        <span>{loading ? 'Deleting...' : 'Delete User'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmDialog;
