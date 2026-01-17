import { useState } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { userAPI } from '../api/user';
import { useAuth } from '@/context/AuthContext';

interface AddUserModalProps {
    onClose: () => void;
    onSave: () => void;
}

const AddUserModal = ({ onClose, onSave }: AddUserModalProps) => {
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        display_name: '',
        password_hash: '', // Using password_hash field as per backend CreateUser body parser
        organization_id: currentUser?.organization_id || '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.organization_id) {
                throw new Error('Organization ID is required');
            }

            await userAPI.create(formData);
            onSave();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <UserPlus size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Add New User</h2>
                            <p className="text-sm text-gray-400 mt-1">Create a new account</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-text-main-dark"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Username *</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleChange('username', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            placeholder="johndoe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Display Name</label>
                        <input
                            type="text"
                            value={formData.display_name}
                            onChange={(e) => handleChange('display_name', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Password *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password_hash}
                                onChange={(e) => handleChange('password_hash', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                                placeholder="Min 8 characters"
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Organization ID</label>
                        <input
                            type="text"
                            value={formData.organization_id}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg opacity-60 cursor-not-allowed text-xs font-mono"
                            disabled
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Automatically assigned to your organization</p>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-color-dark flex items-center justify-end space-x-3 bg-slate-900/10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center space-x-2"
                        disabled={loading}
                    >
                        <span>{loading ? 'Creating...' : 'Create User'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
