import { useState } from 'react';
import { X, Building, Info } from 'lucide-react';
import { useCreateOrganization } from '../api/useOrganizations';

interface AddOrganizationModalProps {
    onClose: () => void;
    onSave: () => void;
}

const AddOrganizationModal = ({ onClose, onSave }: AddOrganizationModalProps) => {
    const createMutation = useCreateOrganization();

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        billing_tier: 'free',
        max_users: 10,
        max_resources: 100
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Auto-slugify name if slug is untouched
        if (field === 'name' && !formData.slug) {
            const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData, {
            onSuccess: () => onSave()
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Add Organization</h2>
                            <p className="text-sm text-gray-400 mt-1">Create a new tenant</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
                    {createMutation.isError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {(createMutation.error as any)?.response?.data?.message || 'Failed to create organization'}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            placeholder="Acme Corp"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Slug *</label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => handleChange('slug', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm font-mono"
                            placeholder="acme-corp"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            rows={3}
                            placeholder="A brief description..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Max Users</label>
                            <input
                                type="number"
                                value={formData.max_users}
                                onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                                min={1}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border-color-dark flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Organization'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddOrganizationModal;
