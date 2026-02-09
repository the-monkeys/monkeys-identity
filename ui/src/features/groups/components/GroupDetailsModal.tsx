import { X, Info, Users, Shield, Calendar } from 'lucide-react';
import { useGroup, useGroupMembers } from '../api/useGroups';
import { Group } from '../types/group';

interface GroupDetailsModalProps {
    group: Group;
    onClose: () => void;
}

const GroupDetailsModal = ({ group, onClose }: GroupDetailsModalProps) => {
    const { data: groupDetails, isLoading: loadingDetails } = useGroup(group.id);
    const { data: members = [], isLoading: loadingMembers } = useGroupMembers(group.id);

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatJSON = (jsonString?: string) => {
        if (!jsonString) return '{}';
        try {
            const obj = JSON.parse(jsonString);
            return JSON.stringify(obj, null, 2);
        } catch {
            return jsonString;
        }
    };

    const displayGroup = groupDetails || group;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Info size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-main-dark">Group Details</h2>
                            <p className="text-sm text-gray-400 mt-1">{displayGroup.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-text-main-dark"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            {/* Basic Information */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Info size={18} className="text-primary" />
                                    <h3 className="text-lg font-semibold text-text-main-dark">Basic Information</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-slate-900 rounded-lg p-4 border border-border-color-dark">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Group ID</label>
                                        <p className="text-sm text-gray-200 font-mono mt-1">{displayGroup.id}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
                                        <p className="text-sm text-gray-200 font-semibold mt-1">{displayGroup.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Type</label>
                                        <p className="text-sm text-gray-200 mt-1">
                                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-100/10 border border-blue-500/30 text-blue-500">
                                                {displayGroup.group_type}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                                        <p className="text-sm text-gray-200 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${displayGroup.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                                                'bg-red-100/10 border-red-500/30 text-red-500'
                                                }`}>
                                                {displayGroup.status}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Description</label>
                                        <p className="text-sm text-gray-200 mt-1">{displayGroup.description || 'No description'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Organization ID</label>
                                        <p className="text-sm text-gray-200 font-mono mt-1">{displayGroup.organization_id}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Parent Group ID</label>
                                        <p className="text-sm text-gray-200 font-mono mt-1">{displayGroup.parent_group_id || 'None (Top-level)'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Max Members</label>
                                        <p className="text-sm text-gray-200 mt-1">{displayGroup.max_members}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Current Members</label>
                                        <p className="text-sm text-gray-200 mt-1">{members?.length || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar size={18} className="text-primary" />
                                    <h3 className="text-lg font-semibold text-text-main-dark">Timeline</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-slate-900 rounded-lg p-4 border border-border-color-dark">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Created At</label>
                                        <p className="text-sm text-gray-200 mt-1">{formatDate(displayGroup.created_at)}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase tracking-wide">Updated At</label>
                                        <p className="text-sm text-gray-200 mt-1">{formatDate(displayGroup.updated_at)}</p>
                                    </div>
                                    {displayGroup.deleted_at && (
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase tracking-wide">Deleted At</label>
                                            <p className="text-sm text-red-400 mt-1">{formatDate(displayGroup.deleted_at)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Members Summary */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Users size={18} className="text-primary" />
                                    <h3 className="text-lg font-semibold text-text-main-dark">Members ({members?.length || 0})</h3>
                                </div>
                                {loadingMembers ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    </div>
                                ) : (!members || members.length === 0) ? (
                                    <div className="bg-slate-900 rounded-lg p-8 border border-border-color-dark text-center">
                                        <Users size={32} className="mx-auto mb-2 text-gray-600" />
                                        <p className="text-gray-400 text-sm">No members in this group</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 rounded-lg border border-border-color-dark divide-y divide-border-color-dark max-h-64 overflow-y-auto">
                                        {members?.slice(0, 10).map((member: any) => (
                                            <div key={member.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-primary font-bold text-xs">
                                                            {member.name?.charAt(0).toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-200">{member.name}</p>
                                                        {member.email && (
                                                            <p className="text-xs text-gray-500">{member.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100/10 border border-purple-500/30 text-purple-500">
                                                        {member.role_in_group}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100/10 border border-blue-500/30 text-blue-500">
                                                        {member.type}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {members && members.length > 10 && (
                                            <div className="px-4 py-2 text-center text-xs text-gray-500">
                                                ... and {members.length - 10} more members
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Attributes */}
                            {displayGroup.attributes && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield size={18} className="text-primary" />
                                        <h3 className="text-lg font-semibold text-text-main-dark">Attributes</h3>
                                    </div>
                                    <div className="bg-slate-900 rounded-lg p-4 border border-border-color-dark">
                                        <pre className="text-xs text-gray-300 overflow-x-auto font-mono">
                                            {formatJSON(displayGroup.attributes)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-color-dark flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupDetailsModal;
