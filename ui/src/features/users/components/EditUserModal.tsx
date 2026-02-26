import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useUpdateUser } from '../api/useUsers';
import { User } from '../types/user';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSave: () => void;
}

const EditUserModal = ({ user, onClose, onSave }: EditUserModalProps) => {
    const updateUserMutation = useUpdateUser();

    const [formData, setFormData] = useState({
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url || '',
        status: user.status,
        email_verified: user.email_verified,
        mfa_enabled: user.mfa_enabled,
        organization_id: user.organization_id,
        attributes: user.attributes || '{}',
        preferences: user.preferences || '{}',
    });

    const [activeTab, setActiveTab] = useState<'basic' | 'account' | 'advanced'>('basic');

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate JSON fields - fail early before mutation
        try {
            if (formData.attributes) JSON.parse(formData.attributes);
            if (formData.preferences) JSON.parse(formData.preferences);
        } catch (e) {
            // Ideally set a local error state here, but mutation error catches it too if backend validates.
            // Since we are validating purely purely UI side, we need local state or just alert.
            alert("Invalid JSON in attributes or preferences");
            return;
        }

        updateUserMutation.mutate({ id: user.id, data: formData }, {
            onSuccess: () => {
                onSave();
            }
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-text-main-dark">Edit User Details</h2>
                        <p className="text-sm text-gray-400 mt-1">Comprehensive user account editor</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-text-main-dark"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 border-b border-border-color-dark">
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setActiveTab('basic')}
                            className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'basic'
                                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                                : 'text-gray-400 hover:text-text-main-dark hover:bg-slate-800'
                                }`}
                        >
                            Basic Information
                        </button>
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'account'
                                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                                : 'text-gray-400 hover:text-text-main-dark hover:bg-slate-800'
                                }`}
                        >
                            Account Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('advanced')}
                            className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-colors ${activeTab === 'advanced'
                                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                                : 'text-gray-400 hover:text-text-main-dark hover:bg-slate-800'
                                }`}
                        >
                            Advanced
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
                    {updateUserMutation.isError && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {extractErrorMessage(updateUserMutation.error, 'Failed to update user')}
                        </div>
                    )}

                    {/* Basic Information Tab */}
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleChange('username', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => handleChange('display_name', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Avatar URL</label>
                                <input
                                    type="url"
                                    value={formData.avatar_url}
                                    onChange={(e) => handleChange('avatar_url', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all"
                                    placeholder="https://example.com/avatar.jpg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Account Settings Tab */}
                    {activeTab === 'account' && (
                        <div className="space-y-4">
                            {/* <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all"
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div> */}

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Organization ID</label>
                                <input
                                    type="text"
                                    value={formData.organization_id}
                                    onChange={(e) => handleChange('organization_id', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all font-mono text-sm"
                                    disabled
                                />
                                <p className="text-xs text-gray-500 mt-1">Organization ID cannot be changed</p>
                            </div>

                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.email_verified}
                                        onChange={(e) => handleChange('email_verified', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-300">Email Verified</span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.mfa_enabled}
                                        onChange={(e) => handleChange('mfa_enabled', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-300">MFA Enabled</span>
                                </label>
                            </div>

                            {/* Read-only Account Security Info */}
                            <div className="mt-6 p-4 bg-slate-900/50 border border-border-color-dark rounded-lg">
                                <h3 className="text-sm font-bold text-gray-300 mb-3">Account Security (Read-only)</h3>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-500">Password Changed:</span>
                                        <p className="text-gray-300 mt-1">{formatDate(user.password_changed_at)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Last Login:</span>
                                        <p className="text-gray-300 mt-1">{formatDate(user.last_login)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Failed Login Attempts:</span>
                                        <p className="text-gray-300 mt-1">{user.failed_login_attempts}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Locked Until:</span>
                                        <p className="text-gray-300 mt-1">{formatDate(user.locked_until)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Tab */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Attributes (JSON)</label>
                                <textarea
                                    value={formData.attributes}
                                    onChange={(e) => handleChange('attributes', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all font-mono text-xs"
                                    rows={8}
                                    placeholder='{"key": "value"}'
                                />
                                <p className="text-xs text-gray-500 mt-1">Must be valid JSON</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Preferences (JSON)</label>
                                <textarea
                                    value={formData.preferences}
                                    onChange={(e) => handleChange('preferences', e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all font-mono text-xs"
                                    rows={8}
                                    placeholder='{"theme": "dark"}'
                                />
                                <p className="text-xs text-gray-500 mt-1">Must be valid JSON</p>
                            </div>

                            <div className="p-4 bg-slate-900/50 border border-border-color-dark rounded-lg">
                                <h3 className="text-sm font-bold text-gray-300 mb-2">Metadata</h3>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-500">User ID:</span>
                                        <p className="text-gray-300 mt-1 font-mono break-all">{user.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Created At:</span>
                                        <p className="text-gray-300 mt-1">{formatDate(user.created_at)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Updated At:</span>
                                        <p className="text-gray-300 mt-1">{formatDate(user.updated_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-color-dark flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                        disabled={updateUserMutation.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center space-x-2"
                        disabled={updateUserMutation.isPending}
                    >
                        <Save size={16} />
                        <span>{updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditUserModal;
