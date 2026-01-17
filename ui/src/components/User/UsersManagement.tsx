import { useState, useEffect } from 'react';
import { Search, Filter, Edit, Info, Pause, Trash2, Plus, AlertCircle } from 'lucide-react';
import { userAPI } from '@/services/api';
import { User } from '@/Types/interfaces';
import EditUserModal from './EditUserModal';
import AddUserModal from './AddUserModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import SuspendConfirmDialog from './SuspendConfirmDialog';

const UsersManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSuspendDialog, setShowSuspendDialog] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [quickEditValues, setQuickEditValues] = useState<Partial<User>>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await userAPI.list();
            setUsers(response.data.data || []);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch users');
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickEdit = (user: User) => {
        setEditingUserId(user.id);
        setQuickEditValues({
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            status: user.status,
        });
    };

    const handleQuickEditSave = async (userId: string) => {
        try {
            await userAPI.update(userId, quickEditValues);
            await fetchUsers();
            setEditingUserId(null);
            setQuickEditValues({});
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update user');
        }
    };

    const handleQuickEditCancel = () => {
        setEditingUserId(null);
        setQuickEditValues({});
    };

    const handleMoreDetails = (user: User) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleSuspend = (user: User) => {
        setSelectedUser(user);
        setShowSuspendDialog(true);
    };

    const handleDelete = (user: User) => {
        setSelectedUser(user);
        setShowDeleteDialog(true);
    };

    const handleEditComplete = async () => {
        setShowEditModal(false);
        setSelectedUser(null);
        await fetchUsers();
    };

    const handleAddComplete = async () => {
        setShowAddModal(false);
        await fetchUsers();
    };

    const handleSuspendComplete = async () => {
        setShowSuspendDialog(false);
        setSelectedUser(null);
        await fetchUsers();
    };

    const handleDeleteComplete = async () => {
        setShowDeleteDialog(false);
        setSelectedUser(null);
        await fetchUsers();
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const truncateId = (id: string) => {
        return id.substring(0, 8) + '...';
    };

    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading users...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto">
            <div className="w-full flex flex-row justify-between items-center mb-8 gap-4">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-2xl font-bold text-text-main-dark">User Management</h1>
                    <p className="text-sm text-gray-300">Comprehensive user account management</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-md text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all cursor-pointer"
                >
                    <Plus size={16} /> <span>Add User</span>
                </button>
            </div>

            <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border-color-dark flex flex-col md:flex-row justify-between gap-4">
                    <h2 className="font-bold flex items-center space-x-2">
                        <span>All Users</span>
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full font-mono text-gray-500">{filteredUsers.length}</span>
                    </h2>
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg text-sm focus:outline-none focus:border-primary transition-all w-full md:w-64"
                            />
                        </div>
                        <button className="p-2 border border-border-color-dark rounded-lg hover:bg-slate-800 text-gray-500 transition-colors">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-border-color-dark">
                            <tr>
                                <th className="px-4 py-4">ID</th>
                                <th className="px-4 py-4">Username</th>
                                <th className="px-4 py-4">Email</th>
                                <th className="px-4 py-4">Display Name</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">MFA</th>
                                <th className="px-4 py-4">Last Login</th>
                                <th className="px-4 py-4">Created At</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color-dark">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-4 py-4 font-mono text-[11px] text-gray-400" title={user.id}>
                                        {truncateId(user.id)}
                                    </td>
                                    <td className="px-4 py-4">
                                        {editingUserId === user.id ? (
                                            <input
                                                type="text"
                                                value={quickEditValues.username || ''}
                                                onChange={(e) => setQuickEditValues({ ...quickEditValues, username: e.target.value })}
                                                className="px-2 py-1 bg-slate-900 border border-primary rounded text-sm w-full"
                                            />
                                        ) : (
                                            <span className="font-semibold">{user.username}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {editingUserId === user.id ? (
                                            <input
                                                type="email"
                                                value={quickEditValues.email || ''}
                                                onChange={(e) => setQuickEditValues({ ...quickEditValues, email: e.target.value })}
                                                className="px-2 py-1 bg-slate-900 border border-primary rounded text-sm w-full"
                                            />
                                        ) : (
                                            <span>{user.email}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {editingUserId === user.id ? (
                                            <input
                                                type="text"
                                                value={quickEditValues.display_name || ''}
                                                onChange={(e) => setQuickEditValues({ ...quickEditValues, display_name: e.target.value })}
                                                className="px-2 py-1 bg-slate-900 border border-primary rounded text-sm w-full"
                                            />
                                        ) : (
                                            <span>{user.display_name}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {editingUserId === user.id ? (
                                            <select
                                                value={quickEditValues.status || user.status}
                                                onChange={(e) => setQuickEditValues({ ...quickEditValues, status: e.target.value as any })}
                                                className="px-2 py-1 bg-slate-900 border border-primary rounded text-sm"
                                            >
                                                <option value="active">Active</option>
                                                <option value="suspended">Suspended</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${user.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                                                user.status === 'suspended' ? 'bg-yellow-100/10 border-yellow-500/30 text-yellow-500' :
                                                    'bg-gray-100/10 border-gray-500/30 text-gray-500'
                                                }`}>
                                                {user.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${user.mfa_enabled ? 'bg-green-100/10 text-green-500' : 'bg-gray-100/10 text-gray-500'
                                            }`}>
                                            {user.mfa_enabled ? '✓ Enabled' : '✗ Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-gray-500 text-xs">
                                        {formatDate(user.last_login)}
                                    </td>
                                    <td className="px-4 py-4 text-gray-500 text-xs">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        {editingUserId === user.id ? (
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleQuickEditSave(user.id)}
                                                    className="px-3 py-1 bg-primary text-white rounded text-xs font-semibold hover:bg-primary/90"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleQuickEditCancel}
                                                    className="px-3 py-1 bg-gray-700 text-white rounded text-xs font-semibold hover:bg-gray-600"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end space-x-1">
                                                <button
                                                    onClick={() => handleQuickEdit(user)}
                                                    className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-primary"
                                                    title="Quick Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoreDetails(user)}
                                                    className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                                                    title="More Details"
                                                >
                                                    <Info size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleSuspend(user)}
                                                    className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-yellow-400"
                                                    title="Suspend User"
                                                    disabled={user.status === 'suspended'}
                                                >
                                                    <Pause size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 italic">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditComplete}
                />
            )}

            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddComplete}
                />
            )}

            {showDeleteDialog && selectedUser && (
                <DeleteConfirmDialog
                    user={selectedUser}
                    onClose={() => setShowDeleteDialog(false)}
                    onConfirm={handleDeleteComplete}
                />
            )}

            {showSuspendDialog && selectedUser && (
                <SuspendConfirmDialog
                    user={selectedUser}
                    onClose={() => setShowSuspendDialog(false)}
                    onConfirm={handleSuspendComplete}
                />
            )}
        </div>
    );
};

export default UsersManagement;
