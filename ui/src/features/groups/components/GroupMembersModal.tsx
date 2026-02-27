import { useState } from 'react';
import { X, Users, UserPlus, Trash2, Search } from 'lucide-react';
import { useGroupMembers, useAddGroupMember, useRemoveGroupMember } from '../api/useGroups';
import { Group, AddGroupMemberRequest } from '../types/group';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

interface GroupMembersModalProps {
    group: Group;
    onClose: () => void;
}

const GroupMembersModal = ({ group, onClose }: GroupMembersModalProps) => {
    const {
        data: members,
        isLoading,
    } = useGroupMembers(group.id);

    const addMemberMutation = useAddGroupMember();
    const removeMemberMutation = useRemoveGroupMember();

    const [showAddMember, setShowAddMember] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{ id: string; type: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [newMember, setNewMember] = useState<AddGroupMemberRequest>({
        principal_id: '',
        principal_type: 'user',
        role_in_group: 'member',
    });

    const handleAddMember = (e: React.FormEvent) => {
        e.preventDefault();
        addMemberMutation.mutate(
            { groupId: group.id, data: newMember },
            {
                onSuccess: () => {
                    setShowAddMember(false);
                    setNewMember({
                        principal_id: '',
                        principal_type: 'user',
                        role_in_group: 'member',
                    });
                }
            }
        );
    };

    const handleRemoveMember = () => {
        if (!selectedMember) return;
        removeMemberMutation.mutate(
            {
                groupId: group.id,
                principalId: selectedMember.id,
                principalType: selectedMember.type
            },
            {
                onSuccess: () => {
                    setShowRemoveDialog(false);
                    setSelectedMember(null);
                }
            }
        );
    };

    const filteredMembers = (members || []).filter((member: any) =>
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Users size={20} className="text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Group Members</h2>
                            <p className="text-sm text-gray-400 mt-1">{group.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-text-main-dark"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-border-color-dark space-y-4">
                    {/* Search and Add Button */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm w-full"
                            />
                        </div>
                        <button
                            onClick={() => setShowAddMember(!showAddMember)}
                            className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all"
                        >
                            <UserPlus size={16} />
                            <span>Add Member</span>
                        </button>
                    </div>

                    {/* Add Member Form */}
                    {showAddMember && (
                        <form onSubmit={handleAddMember} className="p-4 bg-slate-900 rounded-lg border border-border-color-dark space-y-3">
                            {addMemberMutation.isError && (
                                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                                    {extractErrorMessage(addMemberMutation.error, 'Failed to add member')}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Principal ID *</label>
                                    <input
                                        type="text"
                                        value={newMember.principal_id}
                                        onChange={(e) => setNewMember({ ...newMember, principal_id: e.target.value })}
                                        className="w-full px-3 py-1.5 bg-slate-800 border border-border-color-dark rounded text-xs font-mono"
                                        placeholder="User or Service Account ID"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1">Type *</label>
                                    <select
                                        value={newMember.principal_type}
                                        onChange={(e) => setNewMember({ ...newMember, principal_type: e.target.value as 'user' | 'service_account' })}
                                        className="w-full px-3 py-1.5 bg-slate-800 border border-border-color-dark rounded text-xs"
                                    >
                                        <option value="user">User</option>
                                        <option value="service_account">Service Account</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1">Role in Group *</label>
                                <select
                                    value={newMember.role_in_group}
                                    onChange={(e) => setNewMember({ ...newMember, role_in_group: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-slate-800 border border-border-color-dark rounded text-xs"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    <option value="owner">Owner</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMember(false)}
                                    className="px-3 py-1.5 bg-slate-700 text-white rounded text-xs font-semibold hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/90"
                                    disabled={addMemberMutation.isPending}
                                >
                                    {addMemberMutation.isPending ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (!filteredMembers || filteredMembers.length === 0) ? (
                        <div className="text-center py-12 text-gray-400">
                            <Users size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No members found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredMembers?.map((member: any) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-border-color-dark hover:border-primary/30 transition-all"
                                >
                                    <div className="flex items-center space-x-3 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-bold text-sm">
                                                {member.name?.charAt(0).toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-200">{member.name}</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100/10 border border-blue-500/30 text-blue-500">
                                                    {member.type}
                                                </span>
                                            </div>
                                            {member.email && (
                                                <span className="text-xs text-gray-500">{member.email}</span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Role: <span className="text-gray-200 font-semibold">{member.role_in_group}</span></div>
                                            <div className="text-xs text-gray-500">Joined: {formatDate(member.joined_at)}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedMember({ id: member.principal_id, type: member.type });
                                            setShowRemoveDialog(true);
                                        }}
                                        className="ml-3 p-2 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                                        title="Remove Member"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border-color-dark flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                        {filteredMembers?.length || 0} member{(filteredMembers?.length || 0) !== 1 ? 's' : ''} / {group.max_members} max
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showRemoveDialog}
                onClose={() => setShowRemoveDialog(false)}
                onConfirm={handleRemoveMember}
                title="Remove Member"
                message="Are you sure you want to remove this member from the group?"
                variant="danger"
                confirmText="Remove"
                isLoading={removeMemberMutation.isPending}
            />
        </div>
    );
};

export default GroupMembersModal;
