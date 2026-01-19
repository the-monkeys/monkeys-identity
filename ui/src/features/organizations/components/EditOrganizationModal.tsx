import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useUpdateOrganization } from '../api/useOrganizations';
import { Organization } from '../types/organization';

interface EditOrganizationModalProps {
    organization: Organization;
    onClose: () => void;
    onSave: () => void;
}

const EditOrganizationModal = ({ organization, onClose, onSave }: EditOrganizationModalProps) => {
    const updateMutation = useUpdateOrganization();

    const [formData, setFormData] = useState({
        name: organization.name,
        description: organization.description || '',
        billing_tier: organization.billing_tier,
        max_users: organization.max_users,
        max_resources: organization.max_resources,
        status: organization.status,
        metadata: organization.metadata || '{}',
        settings: organization.settings || '{}',
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (formData.metadata) JSON.parse(formData.metadata);
            if (formData.settings) JSON.parse(formData.settings);
        } catch (e) {
            alert('Invalid JSON in metadata or settings');
            return;
        }

        updateMutation.mutate({ id: organization.id, data: formData }, {
            onSuccess: () => onSave()
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-text-main-dark">Edit Organization</h2>
                        <p className="text-sm text-gray-400 mt-1">{organization.slug}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                    {updateMutation.isError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {(updateMutation.error as any)?.response?.data?.message || 'Failed to update organization'}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                                required
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Billing Tier</label>
                            <select
                                value={formData.billing_tier}
                                onChange={(e) => handleChange('billing_tier', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            >
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Max Users</label>
                            <input
                                type="number"
                                value={formData.max_users}
                                onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Max Resources</label>
                            <input
                                type="number"
                                value={formData.max_resources}
                                onChange={(e) => handleChange('max_resources', parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Metadata (JSON)</label>
                            <textarea
                                value={formData.metadata}
                                onChange={(e) => handleChange('metadata', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-xs font-mono"
                                rows={3}
                                placeholder="{}"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Settings (JSON)</label>
                            <textarea
                                value={formData.settings}
                                onChange={(e) => handleChange('settings', e.target.value)}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-xs font-mono"
                                rows={3}
                                placeholder="{}"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border-color-dark flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all flex items-center space-x-2"
                            disabled={updateMutation.isPending}
                        >
                            <Save size={16} />
                            <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditOrganizationModal;
