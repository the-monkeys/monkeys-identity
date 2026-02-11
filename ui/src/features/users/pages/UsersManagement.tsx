import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Pause, Trash2, Search, Filter, AlertCircle } from 'lucide-react';
import { useUsers, useDeleteUser, useActivateUser } from '../api/useUsers';
import { User } from '../types/user';
import EditUserModal from '../components/EditUserModal';
import AddUserModal from '../components/AddUserModal';
import SuspendConfirmDialog from '../components/SuspendConfirmDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from '../api/useUsers';
import { cn } from '@/components/ui/utils';

const UsersManagement = () => {
    const navigate = useNavigate();
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Modals State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSuspendDialog, setShowSuspendDialog] = useState(false);
    const [showActivateDialog, setShowActivateDialog] = useState(false);

    // Queries & Mutations
    const { data: users = [], isLoading, error } = useUsers();
    const deleteUserMutation = useDeleteUser();
    const activateUserMutation = useActivateUser();
    const queryClient = useQueryClient();

    // Filters
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const lowerQuery = searchQuery.toLowerCase();
        return users.filter((user: User) =>
            user.username?.toLowerCase().includes(lowerQuery) ||
            user.email?.toLowerCase().includes(lowerQuery) ||
            user.display_name?.toLowerCase().includes(lowerQuery)
        );
    }, [users, searchQuery]);

    // Handlers
    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user);
        setShowDeleteDialog(true);
    };

    const handleSuspendClick = (user: User) => {
        setSelectedUser(user);
        if (user.status === 'suspended') {
            setShowActivateDialog(true);
        } else {
            setShowSuspendDialog(true);
        }
    };

    const handleDeleteConfirm = () => {
        if (!selectedUser) return;
        deleteUserMutation.mutate(selectedUser.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleSuspendConfirm = () => {
        setShowSuspendDialog(false);
        queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    };

    const handleActivateConfirm = () => {
        if (!selectedUser) return;
        activateUserMutation.mutate(selectedUser.id, {
            onSuccess: () => {
                setShowActivateDialog(false);
                queryClient.invalidateQueries({ queryKey: userKeys.lists() });
            },
        });
    };

    // Formatters
    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'Never';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Columns Definition
    const columns: Column<User>[] = [
        {
            header: 'ID',
            cell: (user) => <span className="font-mono text-[11px] text-gray-500" title={user.id}>{user.id.substring(0, 8)}...</span>,
            className: 'w-24'
        },
        {
            header: 'User',
            cell: (user) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-200">{user.username}</span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                </div>
            )
        },
        {
            header: 'Display Name',
            accessorKey: 'display_name',
            className: 'hidden md:table-cell'
        },
        {
            header: 'Status',
            cell: (user) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    user.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                        user.status === 'suspended' ? 'bg-yellow-100/10 border-yellow-500/30 text-yellow-500' :
                            'bg-gray-100/10 border-gray-500/30 text-gray-500'
                )}>
                    {user.status}
                </span>
            )
        },
        {
            header: 'MFA',
            cell: (user) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold",
                    user.mfa_enabled ? 'bg-green-100/10 text-green-500' : 'bg-gray-100/10 text-gray-500'
                )}>
                    {user.mfa_enabled ? 'ON' : 'OFF'}
                </span>
            ),
            className: 'hidden sm:table-cell'
        },
        {
            header: 'Last Login',
            cell: (user) => <span className="text-xs text-gray-500">{formatDate(user.last_login)}</span>,
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (user) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(user); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit User"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSuspendClick(user); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-yellow-400"
                        title={user.status === 'suspended' ? "Activate User" : "Suspend User"}
                        disabled={false} // We want to allow toggling maybe? Or just keep it for now.
                    >
                        {user.status === 'suspended' ? <Plus size={16} className="text-green-500" /> : <Pause size={16} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete User"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>{(error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load users'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">User Management</h1>
                    <p className="text-sm text-gray-400">Manage user accounts, roles, and permissions</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>Add new user</span>
                </button>
            </div>

            {/* Search & Filter Section */}
            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
                <div className="h-4 w-[1px] bg-border-color-dark mx-1"></div>
                <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 transition-colors">
                    <Filter size={16} />
                </button>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredUsers}
                keyExtractor={(user) => user.id}
                isLoading={isLoading}
                emptyMessage="No users found."
                onRowClick={(user) => navigate(`/users/${user.id}`)}
            />

            {/* Modals */}
            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onSave={() => setShowAddModal(false)}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => setShowEditModal(false)}
                />
            )}

            {/* Dialogs */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete User"
                message={`Are you sure you want to delete ${selectedUser?.username}? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteUserMutation.isPending}
            />

            {showSuspendDialog && selectedUser && (
                <SuspendConfirmDialog
                    user={selectedUser}
                    onClose={() => setShowSuspendDialog(false)}
                    onConfirm={handleSuspendConfirm}
                />
            )}

            <ConfirmDialog
                isOpen={showActivateDialog}
                onClose={() => setShowActivateDialog(false)}
                onConfirm={handleActivateConfirm}
                title="Activate User"
                message={`Are you sure you want to activate ${selectedUser?.username}? They will be able to login again.`}
                variant="info"
                confirmText="Activate"
                isLoading={activateUserMutation.isPending}
            />
        </div>
    );
};

export default UsersManagement;
