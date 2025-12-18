import React, { useState, useEffect } from 'react';
import { groupAPI } from '../services/groupAPI';
import '../styles/Groups.css';

const Groups = ({ organizationId }) => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await groupAPI.list();
            setGroups(response.data.data.items || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = () => {
        setShowCreateModal(true);
    };

    const handleEditGroup = (group) => {
        setSelectedGroup(group);
        setShowEditModal(true);
    };

    const handleViewMembers = (group) => {
        setSelectedGroup(group);
        setShowMembersModal(true);
    };

    const handleViewPermissions = (group) => {
        setSelectedGroup(group);
        setShowPermissionsModal(true);
    };

    const handleDeleteGroup = async (group) => {
        if (!window.confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
            return;
        }

        try {
            await groupAPI.delete(group.id);
            loadGroups();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete group');
        }
    };

    if (loading) {
        return (
            <div className="groups-container">
                <div className="loading">Loading groups...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="groups-container">
                <div className="error-message">{error}</div>
                <button onClick={loadGroups} className="btn-retry">Retry</button>
            </div>
        );
    }

    return (
        <div className="groups-container">
            <div className="groups-header">
                <h2>Group Management</h2>
                <button onClick={handleCreateGroup} className="btn-primary">
                    + Create Group
                </button>
            </div>

            <div className="groups-grid">
                {groups.length === 0 ? (
                    <div className="no-groups">
                        <p>No groups found</p>
                        <button onClick={handleCreateGroup} className="btn-primary">
                            Create your first group
                        </button>
                    </div>
                ) : (
                    groups.map((group) => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            onEdit={() => handleEditGroup(group)}
                            onDelete={() => handleDeleteGroup(group)}
                            onViewMembers={() => handleViewMembers(group)}
                            onViewPermissions={() => handleViewPermissions(group)}
                        />
                    ))
                )}
            </div>

            {showCreateModal && (
                <CreateGroupModal
                    organizationId={organizationId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadGroups();
                    }}
                />
            )}

            {showEditModal && selectedGroup && (
                <EditGroupModal
                    group={selectedGroup}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedGroup(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedGroup(null);
                        loadGroups();
                    }}
                />
            )}

            {showMembersModal && selectedGroup && (
                <GroupMembersModal
                    group={selectedGroup}
                    onClose={() => {
                        setShowMembersModal(false);
                        setSelectedGroup(null);
                    }}
                />
            )}

            {showPermissionsModal && selectedGroup && (
                <GroupPermissionsModal
                    group={selectedGroup}
                    onClose={() => {
                        setShowPermissionsModal(false);
                        setSelectedGroup(null);
                    }}
                />
            )}
        </div>
    );
};

const GroupCard = ({ group, onEdit, onDelete, onViewMembers, onViewPermissions }) => {
    return (
        <div className="group-card">
            <div className="group-card-header">
                <h3>{group.name}</h3>
                <span className={`status-badge status-${group.status}`}>
                    {group.status}
                </span>
            </div>
            <div className="group-card-body">
                <p className="group-description">{group.description || 'No description'}</p>
                <div className="group-info">
                    <div className="info-item">
                        <span className="info-label">Type:</span>
                        <span className="info-value">{group.group_type}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Max Members:</span>
                        <span className="info-value">{group.max_members}</span>
                    </div>
                </div>
            </div>
            <div className="group-card-actions">
                <button onClick={onViewMembers} className="btn-secondary btn-sm">
                    Members
                </button>
                <button onClick={onViewPermissions} className="btn-secondary btn-sm">
                    Permissions
                </button>
                <button onClick={onEdit} className="btn-primary btn-sm">
                    Edit
                </button>
                <button onClick={onDelete} className="btn-danger btn-sm">
                    Delete
                </button>
            </div>
        </div>
    );
};

const CreateGroupModal = ({ organizationId, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        organization_id: organizationId,
        group_type: 'standard',
        max_members: 100,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await groupAPI.create(formData);
            onSuccess();
        } catch (err) {
            if (err.response?.status === 409) {
                setError('A group with this name already exists in the organization');
            } else {
                setError(err.response?.data?.message || 'Failed to create group');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Group</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="name">Group Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Enter group name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter group description"
                                rows="3"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="group_type">Group Type</label>
                            <select
                                id="group_type"
                                value={formData.group_type}
                                onChange={(e) => setFormData({ ...formData, group_type: e.target.value })}
                            >
                                <option value="standard">Standard</option>
                                <option value="department">Department</option>
                                <option value="security">Security</option>
                                <option value="project">Project</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="max_members">Max Members</label>
                            <input
                                type="number"
                                id="max_members"
                                value={formData.max_members}
                                onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
                                min="1"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditGroupModal = ({ group, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: group.name,
        description: group.description || '',
        max_members: group.max_members,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await groupAPI.update(group.id, formData);
            onSuccess();
        } catch (err) {
            if (err.response?.status === 409) {
                setError('A group with this name already exists in the organization');
            } else {
                setError(err.response?.data?.message || 'Failed to update group');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Group</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="name">Group Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="max_members">Max Members</label>
                            <input
                                type="number"
                                id="max_members"
                                value={formData.max_members}
                                onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
                                min="1"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const GroupMembersModal = ({ group, onClose }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddMember, setShowAddMember] = useState(false);

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const response = await groupAPI.getMembers(group.id);
            setMembers(response.data.data.members || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (member) => {
        if (!window.confirm(`Remove ${member.principal_id} from this group?`)) {
            return;
        }

        try {
            await groupAPI.removeMember(group.id, member.principal_id);
            loadMembers();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Group Members - {group.name}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="members-header">
                        <button onClick={() => setShowAddMember(true)} className="btn-primary btn-sm">
                            + Add Member
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">Loading members...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : members.length === 0 ? (
                        <div className="no-data">No members in this group</div>
                    ) : (
                        <table className="members-table">
                            <thead>
                                <tr>
                                    <th>Principal ID</th>
                                    <th>Type</th>
                                    <th>Role</th>
                                    <th>Joined At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id}>
                                        <td>{member.principal_id}</td>
                                        <td>{member.principal_type}</td>
                                        <td>{member.role_in_group}</td>
                                        <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                                        <td>
                                            <button
                                                onClick={() => handleRemoveMember(member)}
                                                className="btn-danger btn-sm"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {showAddMember && (
                        <AddMemberForm
                            groupId={group.id}
                            onClose={() => setShowAddMember(false)}
                            onSuccess={() => {
                                setShowAddMember(false);
                                loadMembers();
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const AddMemberForm = ({ groupId, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        principal_id: '',
        principal_type: 'user',
        role_in_group: 'member',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await groupAPI.addMember(groupId, formData);
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-member-form">
            <h3>Add Member</h3>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Principal ID (User/Service Account ID)</label>
                    <input
                        type="text"
                        value={formData.principal_id}
                        onChange={(e) => setFormData({ ...formData, principal_id: e.target.value })}
                        required
                        placeholder="Enter user or service account ID"
                    />
                </div>
                <div className="form-group">
                    <label>Principal Type</label>
                    <select
                        value={formData.principal_type}
                        onChange={(e) => setFormData({ ...formData, principal_type: e.target.value })}
                    >
                        <option value="user">User</option>
                        <option value="service_account">Service Account</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Role in Group</label>
                    <select
                        value={formData.role_in_group}
                        onChange={(e) => setFormData({ ...formData, role_in_group: e.target.value })}
                    >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Member'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const GroupPermissionsModal = ({ group, onClose }) => {
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            const response = await groupAPI.getPermissions(group.id);
            // Parse the permissions string if it's a JSON string
            const permData = response.data.data.permissions;
            const parsed = typeof permData === 'string' ? JSON.parse(permData) : permData;
            setPermissions(parsed);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load permissions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Group Permissions - {group.name}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div className="loading">Loading permissions...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <div className="permissions-view">
                            <pre className="json-display">
                                {JSON.stringify(permissions, null, 2)}
                            </pre>
                            {permissions?.summary && (
                                <div className="permissions-summary">
                                    <h4>Summary</h4>
                                    <p>Allow Count: {permissions.summary.allow_count || 0}</p>
                                    <p>Deny Count: {permissions.summary.deny_count || 0}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Groups;
