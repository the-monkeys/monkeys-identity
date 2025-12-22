import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Pause, Lock, Eye, Key, User as UserIcon, Shield, Smartphone, Globe, Clock, LayoutGrid, List } from 'lucide-react';

export default function Users({ token, currentUser }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    // Auth State
    const isAdmin = currentUser?.role === 'admin';

    // Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'sessions'

    // Details State
    const [userProfile, setUserProfile] = useState(null);
    const [userSessions, setUserSessions] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        display_name: '',
        password: '',
        organization_id: '00000000-0000-4000-8000-000000000001'
    });

    // Profile Edit State
    const [profileData, setProfileData] = useState({
        display_name: '',
        avatar_url: '',
        preferences: '',
        attributes: ''
    });

    useEffect(() => {
        if (token) {
            fetchUsers();
        }
    }, [token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/v1/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async (id) => {
        try {
            const res = await fetch(`/api/v1/users/${id}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setUserProfile(data.data);
                setProfileData({
                    display_name: data.data.display_name || '',
                    avatar_url: data.data.avatar_url || '',
                    preferences: JSON.stringify(data.data.preferences || {}, null, 2),
                    attributes: JSON.stringify(data.data.attributes || {}, null, 2)
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUserSessions = async (id) => {
        try {
            const res = await fetch(`/api/v1/users/${id}/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setUserSessions(data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAction = async (endpoint, method, successMsg, body = null) => {
        try {
            setError(null);
            const options = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(endpoint, options);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Action failed');
            }

            setSuccess(successMsg);
            setTimeout(() => setSuccess(null), 3000);
            fetchUsers();

            // Refresh details if open
            if (selectedUser) {
                if (method === 'DELETE' && endpoint.includes('sessions')) {
                    fetchUserSessions(selectedUser.id);
                }
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSuspend = (id) => {
        const reason = prompt("Enter suspension reason:", "Admin action");
        if (reason) handleAction(`/api/v1/users/${id}/suspend`, 'POST', 'User suspended successfully', { reason });
    };

    const handleActivate = (id) => handleAction(`/api/v1/users/${id}/activate`, 'POST', 'User activated successfully');

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            handleAction(`/api/v1/users/${id}`, 'DELETE', 'User deleted successfully');
        }
    };

    const handleRevokeSessions = (id) => {
        if (confirm('Revoke all active sessions for this user?')) {
            handleAction(`/api/v1/users/${id}/sessions`, 'DELETE', 'Sessions revoked successfully');
        }
    };

    const openDetailsModal = (user) => {
        setSelectedUser(user);
        setShowDetailsModal(true);
        setActiveTab('profile');
        fetchUserProfile(user.id);
        fetchUserSessions(user.id);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const body = {
                display_name: profileData.display_name,
                avatar_url: profileData.avatar_url,
                preferences: profileData.preferences, // Logic to parse JSON if implementing real JSON editor
                attributes: profileData.attributes
            };

            const res = await fetch(`/api/v1/users/${selectedUser.id}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Failed to update profile');

            setSuccess('Profile updated successfully');
            setTimeout(() => setSuccess(null), 3000);
            fetchUserProfile(selectedUser.id);
            fetchUsers(); // Refresh main list too
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            password: '',
            organization_id: user.organization_id
        });
        setShowUserModal(true);
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedUser(null);
        setFormData({
            username: '',
            email: '',
            display_name: '',
            password: '',
            organization_id: '00000000-0000-4000-8000-000000000001'
        });
        setShowUserModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const url = modalMode === 'create' ? '/api/v1/users' : `/api/v1/users/${selectedUser.id}`;
            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const body = { ...formData };
            if (modalMode === 'edit' && !body.password) delete body.password;

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Operation failed');

            setSuccess(`User ${modalMode === 'create' ? 'created' : 'updated'} successfully`);
            setShowUserModal(false);
            fetchUsers();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Users</h2>
                    <p className="text-muted">Manage system access and profiles</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-[var(--bg-panel)] rounded-lg p-1 border border-[var(--border)]">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-[var(--bg-hover)]' : ''}`}><List size={16} /></button>
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[var(--bg-hover)]' : ''}`}><LayoutGrid size={16} /></button>
                    </div>
                    {isAdmin && (
                        <button className="btn btn-primary flex items-center gap-2" onClick={openCreateModal}>
                            <Plus size={16} /> Add User
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="p-4 mb-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md">{error}</div>}
            {success && <div className="p-4 mb-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md">{success}</div>}

            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {users.map(user => (
                    <div key={user.id} className={`card p-4 hover:border-light transition-all ${user.status === 'suspended' ? 'opacity-70' : ''} ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg">
                                {user.display_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h3 className="font-bold flex items-center gap-2">
                                    {user.display_name}
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '0.1rem 0.5rem',
                                        borderRadius: '99px',
                                        background: user.status === 'active' ? 'var(--success-bg)' : 'var(--error-bg)',
                                        color: user.status === 'active' ? 'var(--success)' : 'var(--error)'
                                    }}>{user.status.toUpperCase()}</span>
                                </h3>
                                <p className="text-sm text-muted">{user.email}</p>
                            </div>
                        </div>

                        <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mt-4 justify-end border-t border-[var(--border)] pt-4' : ''}`}>
                            <button onClick={() => openDetailsModal(user)} className="btn text-xs px-2 py-1" title="View Details"><Eye size={14} /> View</button>
                            {isAdmin && (
                                <>
                                    <button onClick={() => openEditModal(user)} className="btn text-xs px-2 py-1" title="Edit"><Edit size={14} /></button>
                                    {user.status === 'active' ? (
                                        <button onClick={() => handleSuspend(user.id)} className="btn text-xs px-2 py-1 text-yellow-500" title="Suspend"><Pause size={14} /></button>
                                    ) : (
                                        <button onClick={() => handleActivate(user.id)} className="btn text-xs px-2 py-1 text-green-500" title="Activate"><Play size={14} /></button>
                                    )}
                                    <button onClick={() => handleDelete(user.id)} className="btn text-xs px-2 py-1 text-red-500" title="Delete"><Trash2 size={14} /></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card p-6 w-full max-w-lg animate-fade-in">
                        <h3 className="text-xl font-bold mb-4">{modalMode === 'create' ? 'Create New User' : 'Edit User'}</h3>
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1 text-sm text-muted">Username <input required className="input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} /></label>
                                <label className="flex flex-col gap-1 text-sm text-muted">Display Name <input required className="input" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} /></label>
                            </div>
                            <label className="flex flex-col gap-1 text-sm text-muted">Email <input required type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></label>
                            {modalMode === 'create' && <label className="flex flex-col gap-1 text-sm text-muted">Password <input required minLength={8} type="password" className="input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /></label>}
                            <label className="flex flex-col gap-1 text-sm text-muted">Org ID <input required className="input" value={formData.organization_id} onChange={e => setFormData({ ...formData, organization_id: e.target.value })} /></label>

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" className="btn" onClick={() => setShowUserModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{modalMode === 'create' ? 'Create' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Details & Profile Modal */}
            {showDetailsModal && selectedUser && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card w-full max-w-3xl animate-fade-in flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-panel)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                                    {selectedUser.display_name?.[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedUser.display_name}</h2>
                                    <p className="text-sm text-muted">{selectedUser.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} className="btn">Close</button>
                        </div>

                        <div className="flex border-b border-[var(--border)] bg-[var(--bg-panel)]">
                            <button onClick={() => setActiveTab('profile')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted hover:text-white'}`}>Profile & Overview</button>
                            <button onClick={() => setActiveTab('sessions')} className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-muted hover:text-white'}`}>Active Sessions</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {activeTab === 'profile' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                                        <h3 className="font-bold flex items-center gap-2"><UserIcon size={16} /> Edit Profile</h3>
                                        <label className="flex flex-col gap-1 text-sm text-muted">Display Name <input className="input" value={profileData.display_name} onChange={e => setProfileData({ ...profileData, display_name: e.target.value })} /></label>
                                        <label className="flex flex-col gap-1 text-sm text-muted">Avatar URL <input className="input" value={profileData.avatar_url} onChange={e => setProfileData({ ...profileData, avatar_url: e.target.value })} /></label>
                                        <label className="flex flex-col gap-1 text-sm text-muted">Preferences (JSON) <textarea className="input h-20 font-mono text-xs" value={profileData.preferences} onChange={e => setProfileData({ ...profileData, preferences: e.target.value })} /></label>
                                        <label className="flex flex-col gap-1 text-sm text-muted">Attributes (JSON) <textarea className="input h-20 font-mono text-xs" value={profileData.attributes} onChange={e => setProfileData({ ...profileData, attributes: e.target.value })} /></label>
                                        <button type="submit" className="btn btn-primary w-full">Update Profile</button>
                                    </form>

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-bold mb-3 flex items-center gap-2"><Shield size={16} /> Account Information</h3>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between p-2 rounded bg-[var(--bg-input)]"><span>ID</span> <span className="font-mono text-muted">{selectedUser.id}</span></div>
                                                <div className="flex justify-between p-2 rounded bg-[var(--bg-input)]"><span>Username</span> <span className="font-mono text-muted">{selectedUser.username}</span></div>
                                                <div className="flex justify-between p-2 rounded bg-[var(--bg-input)]"><span>Role</span> <span className="text-[var(--primary)]">{selectedUser.role || 'user'}</span></div>
                                                <div className="flex justify-between p-2 rounded bg-[var(--bg-input)]"><span>Created</span> <span className="text-muted">{new Date(selectedUser.created_at).toLocaleDateString()}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold">Active Sessions ({userSessions.length})</h3>
                                        <button onClick={() => handleRevokeSessions(selectedUser.id)} className="btn text-red-500 border-red-500/20 hover:bg-red-500/10"><Lock size={16} /> Revoke All</button>
                                    </div>

                                    {userSessions.length === 0 ? (
                                        <p className="text-muted text-center py-8">No active sessions found.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {userSessions.map((session, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 rounded bg-[var(--bg-panel)]"><Smartphone className="text-muted" /></div>
                                                        <div>
                                                            <p className="font-bold">{session.device_info || 'Unknown Device'}</p>
                                                            <p className="text-xs text-muted flex items-center gap-2">
                                                                <Globe size={12} /> {session.ip_address}
                                                                <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                                                <Clock size={12} /> {new Date(session.created_at * 1000).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-green-500 text-xs font-bold px-2 py-1 rounded bg-green-500/10">ACTIVE</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
