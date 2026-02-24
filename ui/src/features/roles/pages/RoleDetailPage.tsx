import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Clock, Lock, Users, Edit3, Trash2, AlertCircle, CheckCircle2, Plus, Search, X } from 'lucide-react';
import { useRole, useRolePolicies, useRoleAssignments, useDeleteRole, useAttachPolicy, useDetachPolicy, useAssignRole, useUnassignRole } from '../api/useRoles';
import { usePolicies } from '../../policies/api/usePolicies';
import { useUsers } from '../../users/api/useUsers';
import { cn } from '@/components/ui/utils';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';

const RoleDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showAttachPolicyModal, setShowAttachPolicyModal] = useState(false);
    const [showAssignUserModal, setShowAssignUserModal] = useState(false);
    const [policySearch, setPolicySearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const { data: role, isLoading, error } = useRole(id || null);
    const { data: policies = [], isLoading: isLoadingPolicies } = useRolePolicies(id || null);
    const { data: assignments = [], isLoading: isLoadingAssignments } = useRoleAssignments(id || null);
    const { data: allPolicies = [] } = usePolicies();
    const { data: allUsers = [] } = useUsers();

    const deleteRoleMutation = useDeleteRole();
    const attachPolicyMutation = useAttachPolicy();
    const detachPolicyMutation = useDetachPolicy();
    const assignRoleMutation = useAssignRole();
    const unassignRoleMutation = useUnassignRole();

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return '—';
        return new Date(dateString).toLocaleString();
    };

    const handleDeleteConfirm = () => {
        if (!id) return;
        deleteRoleMutation.mutate(id, {
            onSuccess: () => navigate('/roles'),
        });
    };

    const handleAttachPolicy = (policyId: string) => {
        if (!id) return;
        attachPolicyMutation.mutate({ roleId: id, policyId }, {
            onSuccess: () => setShowAttachPolicyModal(false),
        });
    };

    const handleDetachPolicy = (policyId: string) => {
        if (!id) return;
        detachPolicyMutation.mutate({ roleId: id, policyId });
    };

    const handleAssignUser = (userId: string) => {
        if (!id) return;
        assignRoleMutation.mutate({ roleId: id, userId }, {
            onSuccess: () => setShowAssignUserModal(false),
        });
    };

    const handleUnassignUser = (userId: string) => {
        if (!id) return;
        unassignRoleMutation.mutate({ roleId: id, userId });
    };

    const filteredAvailablePolicies = allPolicies.filter(p =>
        !policies.find(attached => attached.id === p.id) &&
        (p.name.toLowerCase().includes(policySearch.toLowerCase()) ||
            p.description.toLowerCase().includes(policySearch.toLowerCase()))
    );

    const filteredAvailableUsers = allUsers.filter(u =>
        !assignments.find(a => a.principal_id === u.id) &&
        (u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.display_name.toLowerCase().includes(userSearch.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !role) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Role Not Found</h2>
                    <p className="text-gray-400">The role you're looking for doesn't exist or has been deleted.</p>
                </div>
                <button
                    onClick={() => navigate('/roles')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Back to Roles
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Breadcrumbs & Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/roles')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Roles</span>
                </button>

                <div className="flex items-center gap-3">
                    <button
                        className="p-2.5 bg-slate-800 text-gray-400 hover:text-blue-400 rounded-lg border border-border-color-dark transition-all"
                        title="Edit Role"
                    >
                        <Edit3 size={18} />
                    </button>
                    {!role.is_system_role && (
                        <button
                            onClick={() => setShowDeleteDialog(true)}
                            className="p-2.5 bg-slate-800 text-gray-400 hover:text-red-400 rounded-lg border border-border-color-dark transition-all"
                            title="Delete Role"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Header Content */}
            <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark overflow-hidden shadow-xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                    <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                        <Shield size={48} className="text-indigo-400" />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-white tracking-tight">{role.name}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                role.is_system_role
                                    ? 'bg-purple-100/10 border-purple-500/30 text-purple-400'
                                    : 'bg-blue-100/10 border-blue-500/30 text-blue-400'
                            )}>
                                {role.is_system_role ? 'System Managed' : 'Custom Role'}
                            </span>
                        </div>

                        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
                            {role.description || 'No description provided for this role.'}
                        </p>

                        <div className="flex flex-wrap gap-6 pt-2">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Clock size={16} />
                                <span className="text-sm">Created {formatDate(role.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                                <Clock size={16} />
                                <span className="text-sm">Last updated {formatDate(role.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs/Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Policies Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Lock size={18} className="text-primary" />
                            Attached Policies
                        </h3>
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-gray-400 font-mono">
                            {policies.length} Total
                        </span>
                        <button
                            onClick={() => setShowAttachPolicyModal(true)}
                            className="p-1 px-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary hover:text-white transition-all"
                        >
                            <Plus size={12} />
                            Attach
                        </button>
                    </div>

                    <div className="bg-bg-card-dark rounded-xl border border-border-color-dark divide-y divide-slate-800 overflow-hidden shadow-lg">
                        {isLoadingPolicies ? (
                            <div className="p-8 text-center text-gray-500 italic">Loading policies...</div>
                        ) : policies.length > 0 ? (
                            policies.map((policy: any) => (
                                <div key={policy.id} className="p-4 hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-200 group-hover:text-primary transition-colors">{policy.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{policy.description || 'No description'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-emerald-500/50" />
                                            <button
                                                onClick={() => handleDetachPolicy(policy.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Detach Policy"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 italic">No policies attached to this role.</div>
                        )}
                    </div>
                </div>

                {/* Assignments Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users size={18} className="text-primary" />
                            Assigned Principals
                        </h3>
                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-gray-400 font-mono">
                            {assignments.length} Total
                        </span>
                        <button
                            onClick={() => setShowAssignUserModal(true)}
                            className="p-1 px-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary hover:text-white transition-all"
                        >
                            <Plus size={12} />
                            Assign
                        </button>
                    </div>

                    <div className="bg-bg-card-dark rounded-xl border border-border-color-dark divide-y divide-slate-800 overflow-hidden shadow-lg">
                        {isLoadingAssignments ? (
                            <div className="p-8 text-center text-gray-500 italic">Loading assignments...</div>
                        ) : assignments.length > 0 ? (
                            assignments.map((assignment: any) => (
                                <div key={assignment.id} className="p-4 hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase">
                                            {(assignment.principal_id || '?').substring(0, 2)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{assignment.principal_id}</p>
                                            <p className="text-xs text-gray-500 uppercase tracking-tighter font-medium">{assignment.principal_type}</p>
                                        </div>
                                        <button
                                            onClick={() => handleUnassignUser(assignment.principal_id)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Unassign User"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 italic">No users or groups assigned to this role.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-center pt-8 border-t border-border-color-dark">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                    <AlertCircle size={12} />
                    System policies are protected and cannot be modified or deleted directly.
                </p>
            </div>

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Role"
                message={`Are you sure you want to delete the "${role.name}" role? This action cannot be undone and will affect all assigned users.`}
                variant="danger"
                isLoading={deleteRoleMutation.isPending}
            />

            {/* Attach Policy Modal */}
            <Modal
                isOpen={showAttachPolicyModal}
                onClose={() => setShowAttachPolicyModal(false)}
                title="Attach Policy to Role"
            >
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search policies..."
                            value={policySearch}
                            onChange={(e) => setPolicySearch(e.target.value)}
                            className="w-full bg-slate-900 border border-border-color-dark rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar divide-y divide-slate-800">
                        {filteredAvailablePolicies.length > 0 ? (
                            filteredAvailablePolicies.map((p) => (
                                <div key={p.id} className="py-3 flex items-center justify-between group">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{p.description || 'No description'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAttachPolicy(p.id)}
                                        disabled={attachPolicyMutation.isPending}
                                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        Attach
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-gray-500 italic text-sm">
                                {allPolicies.length === 0 ? 'Loading policies...' : 'No available policies found matching your search.'}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Assign User Modal */}
            <Modal
                isOpen={showAssignUserModal}
                onClose={() => setShowAssignUserModal(false)}
                title="Assign User to Role"
            >
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-border-color-dark rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar divide-y divide-slate-800">
                        {filteredAvailableUsers.length > 0 ? (
                            filteredAvailableUsers.map((u) => (
                                <div key={u.id} className="py-3 flex items-center justify-between group">
                                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                            {u.display_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{u.display_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAssignUser(u.id)}
                                        disabled={assignRoleMutation.isPending}
                                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        Assign
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-gray-500 italic text-sm">
                                {allUsers.length === 0 ? 'Loading users...' : 'No available users found matching your search.'}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default RoleDetailPage;
