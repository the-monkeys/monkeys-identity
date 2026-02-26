import { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Shield, AlertCircle, Users, FileText, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoles, useCreateRole, useDeleteRole, useUpdateRole, Role } from '../api/useRoles';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';
import { useAuth } from '@/context/AuthContext';

const RolesManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const { user: currentUser, isAdmin } = useAuth();
    const [newRole, setNewRole] = useState({ name: '', description: '', organization_id: currentUser?.organization_id || '' });
    const [editRoleData, setEditRoleData] = useState({ name: '', description: '' });
    const navigate = useNavigate();

    const { data: rawRoles = [], isLoading, error } = useRoles();
    const roles = Array.isArray(rawRoles) ? rawRoles : (rawRoles as any)?.items || [];
    const createRoleMutation = useCreateRole();
    const deleteRoleMutation = useDeleteRole();
    const updateRoleMutation = useUpdateRole();

    const filteredRoles = useMemo(() => {
        if (!searchQuery) return roles;
        const lowerQuery = searchQuery.toLowerCase();
        return roles.filter((role: Role) =>
            role.name?.toLowerCase().includes(lowerQuery) ||
            role.description?.toLowerCase().includes(lowerQuery)
        );
    }, [roles, searchQuery]);

    const handleDeleteClick = (role: Role) => {
        setSelectedRole(role);
        setShowDeleteDialog(true);
    };

    const handleEditClick = (role: Role) => {
        setSelectedRole(role);
        setEditRoleData({ name: role.name, description: role.description });
        setShowEditModal(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedRole) return;
        deleteRoleMutation.mutate(selectedRole.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createRoleMutation.mutate(newRole, {
            onSuccess: () => {
                setShowCreateModal(false);
                setNewRole({ name: '', description: '', organization_id: currentUser?.organization_id || '' });
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;
        updateRoleMutation.mutate({ id: selectedRole.id, data: editRoleData }, {
            onSuccess: () => {
                setShowEditModal(false);
                setSelectedRole(null);
            },
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return '—';
        return new Date(dateString).toLocaleDateString();
    };

    const columns: Column<Role>[] = [
        {
            header: 'Role',
            cell: (role) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <Shield size={16} className="text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-200">{role.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{role.description}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Type',
            cell: (role) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    role.is_system_role
                        ? 'bg-purple-100/10 border-purple-500/30 text-purple-400'
                        : 'bg-blue-100/10 border-blue-500/30 text-blue-400'
                )}>
                    {role.is_system_role ? 'System' : 'Custom'}
                </span>
            ),
        },
        {
            header: 'Priority',
            cell: (role) => (
                <span className="text-xs text-gray-400 font-mono">{role.priority || '—'}</span>
            ),
            className: 'hidden md:table-cell'
        },
        {
            header: 'Created',
            cell: (role) => <span className="text-xs text-gray-500">{formatDate(role.created_at)}</span>,
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (role) => isAdmin() ? (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(role); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit Role"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(role); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete Role"
                        disabled={role.is_system_role}
                    >
                        <Trash2 size={16} className={role.is_system_role ? 'opacity-30' : ''} />
                    </button>
                </div>
            ) : null
        }
    ];

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>Failed to load roles</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Role-Based Access Control</h1>
                    <p className="text-sm text-gray-400">Define roles and assign policies to control user permissions across your ecosystem</p>
                </div>
                {isAdmin() && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} /> <span>Create Role</span>
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-indigo-500/10"><Shield size={20} className="text-indigo-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{roles.length}</p>
                        <p className="text-xs text-gray-400">Total Roles</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10"><Users size={20} className="text-purple-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{roles.filter((r: Role) => r.is_system_role).length}</p>
                        <p className="text-xs text-gray-400">System Roles</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10"><FileText size={20} className="text-blue-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{roles.filter((r: Role) => !r.is_system_role).length}</p>
                        <p className="text-xs text-gray-400">Custom Roles</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search roles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredRoles}
                keyExtractor={(role) => role.id}
                isLoading={isLoading}
                emptyMessage="No roles found. Create your first role to get started."
                onRowClick={(role) => navigate(`/roles/${role.id}`)}
            />

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Create New Role</h2>
                            <p className="text-sm text-gray-400 mt-1">Define a new role for your organization</p>
                        </div>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Role Name</label>
                                    <input
                                        type="text"
                                        value={newRole.name}
                                        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. editor, viewer, billing-admin"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        value={newRole.description}
                                        onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                                        placeholder="Describe what this role allows..."
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createRoleMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Role</h2>
                            <p className="text-sm text-gray-400 mt-1">Update role details and description</p>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Role Name</label>
                                    <input
                                        type="text"
                                        value={editRoleData.name}
                                        onChange={(e) => setEditRoleData({ ...editRoleData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. editor, viewer, billing-admin"
                                        required
                                        disabled={selectedRole?.is_system_role}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        value={editRoleData.description}
                                        onChange={(e) => setEditRoleData({ ...editRoleData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                                        placeholder="Describe what this role allows..."
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateRoleMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Role"
                message={`Are you sure you want to delete the "${selectedRole?.name}" role? Users assigned to this role will lose associated permissions.`}
                variant="danger"
                isLoading={deleteRoleMutation.isPending}
            />
        </div>
    );
};

export default RolesManagement;
