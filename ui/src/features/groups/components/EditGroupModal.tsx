import { useState } from 'react';
import { X, Edit } from 'lucide-react';
import { useUpdateGroup } from '../api/useGroups';
import { Group } from '../types/group';

interface EditGroupModalProps {
    group: Group;
    onClose: () => void;
    onSave: () => void;
}

const EditGroupModal = ({ group, onClose, onSave }: EditGroupModalProps) => {
    const updateGroupMutation = useUpdateGroup();

    const [formData, setFormData] = useState({
        name: group.name,
        description: group.description,
        group_type: group.group_type,
        max_members: group.max_members,
        parent_group_id: group.parent_group_id || '',
        status: group.status,
    });

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            max_members: Number(formData.max_members),
            parent_group_id: formData.parent_group_id || undefined,
        };

        updateGroupMutation.mutate(
            { id: group.id, data: submitData },
            {
                onSuccess: () => {
                    onSave();
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Edit size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Edit Group</h2>
                            <p className="text-sm text-gray-400 mt-1">Update group details</p>
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
                    {updateGroupMutation.isError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {(updateGroupMutation.error as any)?.response?.data?.message || 'Failed to update group'}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Group ID</label>
                        <input
                            type="text"
                            value={group.id}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg opacity-60 cursor-not-allowed text-xs font-mono"
                            disabled
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Group Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm resize-none"
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
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Status *</label>
                        <select
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm"
                            required
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="deleted">Deleted</option>
                        </select>
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

                    <div className="pt-4 border-t border-border-color-dark flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                            disabled={updateGroupMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center space-x-2"
                            disabled={updateGroupMutation.isPending}
                        >
                            <span>{updateGroupMutation.isPending ? 'Updating...' : 'Update Group'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditGroupModal;
