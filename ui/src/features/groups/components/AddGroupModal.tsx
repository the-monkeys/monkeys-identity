import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { useCreateGroup } from '../api/useGroups';
import { useAuth } from '@/context/AuthContext';

interface AddGroupModalProps {
    onClose: () => void;
    onSave: () => void;
}

const AddGroupModal = ({ onClose, onSave }: AddGroupModalProps) => {
    const { user: currentUser } = useAuth();
    const createGroupMutation = useCreateGroup();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        organization_id: currentUser?.organization_id || '',
        group_type: 'standard',
        max_members: 100,
        parent_group_id: '',
    });

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.organization_id) {
            return;
        }

        const submitData = {
            ...formData,
            max_members: Number(formData.max_members),
            parent_group_id: formData.parent_group_id || undefined,
        };

        createGroupMutation.mutate(submitData, {
            onSuccess: () => {
                onSave();
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Add New Group</h2>
                            <p className="text-sm text-gray-400 mt-1">Create a new group</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-text-main-dark"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
                    {createGroupMutation.isError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {(createGroupMutation.error as any)?.response?.data?.message || 'Failed to create group'}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Group Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            placeholder="Engineering Team"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm resize-none"
                            placeholder="Group description..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Group Type *</label>
                        <select
                            value={formData.group_type}
                            onChange={(e) => handleChange('group_type', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            required
                        >
                            <option value="standard">Standard</option>
                            <option value="department">Department</option>
                            <option value="team">Team</option>
                            <option value="project">Project</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Max Members</label>
                        <input
                            type="number"
                            value={formData.max_members}
                            onChange={(e) => handleChange('max_members', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            min="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Parent Group ID (Optional)</label>
                        <input
                            type="text"
                            value={formData.parent_group_id}
                            onChange={(e) => handleChange('parent_group_id', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm font-mono"
                            placeholder="Leave empty for top-level group"
                        />
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

                    <div className="pt-4 border-t border-border-color-dark flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                            disabled={createGroupMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center space-x-2"
                            disabled={createGroupMutation.isPending}
                        >
                            <span>{createGroupMutation.isPending ? 'Creating...' : 'Create Group'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddGroupModal;
