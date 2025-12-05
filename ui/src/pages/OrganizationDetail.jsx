import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizationAPI, userAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/OrganizationDetail.css';
import '../styles/OrganizationModal.css';

const SettingsEditTab = ({ orgId, currentSettings, onSave, onCancel }) => {
    const [settingsJson, setSettingsJson] = useState(JSON.stringify(currentSettings, null, 2));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const parsedSettings = JSON.parse(settingsJson);
            await organizationAPI.updateSettings(orgId, parsedSettings);
            setSuccess('Settings updated successfully');
            setTimeout(() => onSave(), 1500);
        } catch (err) {
            if (err instanceof SyntaxError) {
                setError('Invalid JSON format');
            } else {
                setError(err.response?.data?.message || 'Failed to update settings');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-edit-section">
            <div className="settings-header">
                <h3>Edit Organization Settings</h3>
            </div>
            <div className="form-group">
                <label htmlFor="settings-json">Settings (JSON)</label>
                <textarea
                    id="settings-json"
                    className="json-input"
                    rows="15"
                    value={settingsJson}
                    onChange={(e) => setSettingsJson(e.target.value)}
                    placeholder='{"key": "value"}'
                />
                <p className="field-help">Provide a valid JSON object for organization settings.</p>
            </div>
            {error && <div className="save-error">{error}</div>}
            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            <div className="modal-actions">
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn-save"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
};

const UserDetailTab = ({ user, onUpdate, onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        username: user.username || '',
        email: user.email || '',
        display_name: user.display_name || '',
        status: user.status || 'active',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleEdit = () => {
        setIsEditing(true);
        setEditForm({
            username: user.username || '',
            email: user.email || '',
            display_name: user.display_name || '',
            status: user.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({
            username: user.username || '',
            email: user.email || '',
            display_name: user.display_name || '',
            status: user.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await onUpdate(user.id, editForm);
            setSuccess('User updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="user-detail-section">
            <div className="section-header">
                <button className="btn-back" onClick={onBack}>
                    ← Back to Users
                </button>
                <h3>User Details: {user.username}</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={handleEdit}>
                        Edit User
                    </button>
                )}
            </div>

            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            {error && <div className="save-error">{error}</div>}

            <div className="user-info-grid">
                <div className="info-card">
                    <h4>Basic Information</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Username</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => handleFormChange('username', e.target.value)}
                                />
                            ) : (
                                <span>{user.username}</span>
                            )}
                        </div>
                        <div>
                            <strong>Email</strong>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => handleFormChange('email', e.target.value)}
                                />
                            ) : (
                                <span>{user.email}</span>
                            )}
                        </div>
                        <div>
                            <strong>Display Name</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.display_name}
                                    onChange={(e) => handleFormChange('display_name', e.target.value)}
                                />
                            ) : (
                                <span>{user.display_name || '—'}</span>
                            )}
                        </div>
                        <div>
                            <strong>Status</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            ) : (
                                <span className="badge">{user.status}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h4>Account Details</h4>
                    <div className="info-grid">
                        <div>
                            <strong>User ID</strong>
                            <span>{user.id}</span>
                        </div>
                        <div>
                            <strong>Organization ID</strong>
                            <span>{user.organization_id}</span>
                        </div>
                        <div>
                            <strong>Email Verified</strong>
                            <span className="badge">{user.email_verified ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                            <strong>MFA Enabled</strong>
                            <span className="badge">{user.mfa_enabled ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                            <strong>Created</strong>
                            <span>{new Date(user.created_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Updated</strong>
                            <span>{new Date(user.updated_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Last Login</strong>
                            <span>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span>
                        </div>
                        <div>
                            <strong>Failed Login Attempts</strong>
                            <span>{user.failed_login_attempts || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

const GroupDetailTab = ({ group, onUpdate, onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: group.name || '',
        description: group.description || '',
        group_type: group.group_type || 'user_group',
        status: group.status || 'active',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleEdit = () => {
        setIsEditing(true);
        setEditForm({
            name: group.name || '',
            description: group.description || '',
            group_type: group.group_type || 'user_group',
            status: group.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({
            name: group.name || '',
            description: group.description || '',
            group_type: group.group_type || 'user_group',
            status: group.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await onUpdate(group.id, editForm);
            setSuccess('Group updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update group');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="group-detail-section">
            <div className="section-header">
                <button className="btn-back" onClick={onBack}>
                    ← Back to Groups
                </button>
                <h3>Group Details: {group.name}</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={handleEdit}>
                        Edit Group
                    </button>
                )}
            </div>

            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            {error && <div className="save-error">{error}</div>}

            <div className="group-info-grid">
                <div className="info-card">
                    <h4>Basic Information</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Name</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                />
                            ) : (
                                <span>{group.name}</span>
                            )}
                        </div>
                        <div>
                            <strong>Description</strong>
                            {isEditing ? (
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    rows={3}
                                />
                            ) : (
                                <span>{group.description || '—'}</span>
                            )}
                        </div>
                        <div>
                            <strong>Type</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.group_type}
                                    onChange={(e) => handleFormChange('group_type', e.target.value)}
                                >
                                    <option value="user_group">User Group</option>
                                    <option value="system_group">System Group</option>
                                    <option value="admin_group">Admin Group</option>
                                </select>
                            ) : (
                                <span>{group.group_type}</span>
                            )}
                        </div>
                        <div>
                            <strong>Status</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            ) : (
                                <span className="badge">{group.status}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h4>Group Details</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Group ID</strong>
                            <span>{group.id}</span>
                        </div>
                        <div>
                            <strong>Organization ID</strong>
                            <span>{group.organization_id}</span>
                        </div>
                        <div>
                            <strong>Created</strong>
                            <span>{new Date(group.created_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Updated</strong>
                            <span>{new Date(group.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

const RoleDetailTab = ({ role, onUpdate, onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: role.name || '',
        description: role.description || '',
        role_type: role.role_type || 'organization_role',
        status: role.status || 'active',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleEdit = () => {
        setIsEditing(true);
        setEditForm({
            name: role.name || '',
            description: role.description || '',
            role_type: role.role_type || 'organization_role',
            status: role.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({
            name: role.name || '',
            description: role.description || '',
            role_type: role.role_type || 'organization_role',
            status: role.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await onUpdate(role.id, editForm);
            setSuccess('Role updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update role');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="role-detail-section">
            <div className="section-header">
                <button className="btn-back" onClick={onBack}>
                    ← Back to Roles
                </button>
                <h3>Role Details: {role.name}</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={handleEdit}>
                        Edit Role
                    </button>
                )}
            </div>

            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            {error && <div className="save-error">{error}</div>}

            <div className="role-info-grid">
                <div className="info-card">
                    <h4>Basic Information</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Name</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                />
                            ) : (
                                <span>{role.name}</span>
                            )}
                        </div>
                        <div>
                            <strong>Description</strong>
                            {isEditing ? (
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    rows={3}
                                />
                            ) : (
                                <span>{role.description || '—'}</span>
                            )}
                        </div>
                        <div>
                            <strong>Type</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.role_type}
                                    onChange={(e) => handleFormChange('role_type', e.target.value)}
                                >
                                    <option value="organization_role">Organization Role</option>
                                    <option value="system_role">System Role</option>
                                    <option value="admin_role">Admin Role</option>
                                </select>
                            ) : (
                                <span>{role.role_type}</span>
                            )}
                        </div>
                        <div>
                            <strong>Status</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            ) : (
                                <span className="badge">{role.status}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h4>Role Details</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Role ID</strong>
                            <span>{role.id}</span>
                        </div>
                        <div>
                            <strong>Organization ID</strong>
                            <span>{role.organization_id}</span>
                        </div>
                        <div>
                            <strong>Created</strong>
                            <span>{new Date(role.created_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Updated</strong>
                            <span>{new Date(role.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

const PolicyDetailTab = ({ policy, onUpdate, onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: policy.name || '',
        description: policy.description || '',
        policy_type: policy.policy_type || 'access_policy',
        effect: policy.effect || 'allow',
        status: policy.status || 'active',
        document: policy.document || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleEdit = () => {
        setIsEditing(true);
        setEditForm({
            name: policy.name || '',
            description: policy.description || '',
            policy_type: policy.policy_type || 'access_policy',
            effect: policy.effect || 'allow',
            status: policy.status || 'active',
            document: policy.document || '',
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({
            name: policy.name || '',
            description: policy.description || '',
            policy_type: policy.policy_type || 'access_policy',
            effect: policy.effect || 'allow',
            status: policy.status || 'active',
            document: policy.document || '',
        });
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await onUpdate(policy.id, editForm);
            setSuccess('Policy updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update policy');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="policy-detail-section">
            <div className="section-header">
                <button className="btn-back" onClick={onBack}>
                    ← Back to Policies
                </button>
                <h3>Policy Details: {policy.name}</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={handleEdit}>
                        Edit Policy
                    </button>
                )}
            </div>

            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            {error && <div className="save-error">{error}</div>}

            <div className="policy-info-grid">
                <div className="info-card">
                    <h4>Basic Information</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Name</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                />
                            ) : (
                                <span>{policy.name}</span>
                            )}
                        </div>
                        <div>
                            <strong>Description</strong>
                            {isEditing ? (
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    rows={3}
                                />
                            ) : (
                                <span>{policy.description || '—'}</span>
                            )}
                        </div>
                        <div>
                            <strong>Type</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.policy_type}
                                    onChange={(e) => handleFormChange('policy_type', e.target.value)}
                                >
                                    <option value="access_policy">Access Policy</option>
                                    <option value="security_policy">Security Policy</option>
                                    <option value="compliance_policy">Compliance Policy</option>
                                </select>
                            ) : (
                                <span>{policy.policy_type}</span>
                            )}
                        </div>
                        <div>
                            <strong>Effect</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.effect}
                                    onChange={(e) => handleFormChange('effect', e.target.value)}
                                >
                                    <option value="allow">Allow</option>
                                    <option value="deny">Deny</option>
                                </select>
                            ) : (
                                <span className="badge">{policy.effect}</span>
                            )}
                        </div>
                        <div>
                            <strong>Status</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            ) : (
                                <span className="badge">{policy.status}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h4>Policy Details</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Policy ID</strong>
                            <span>{policy.id}</span>
                        </div>
                        <div>
                            <strong>Organization ID</strong>
                            <span>{policy.organization_id}</span>
                        </div>
                        <div>
                            <strong>Created</strong>
                            <span>{new Date(policy.created_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Updated</strong>
                            <span>{new Date(policy.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="info-card">
                <h4>Policy Document</h4>
                {isEditing ? (
                    <textarea
                        className="json-input"
                        rows="15"
                        value={editForm.document}
                        onChange={(e) => handleFormChange('document', e.target.value)}
                        placeholder='{"Version": "2024-01-01", "Statement": [...]}'
                    />
                ) : (
                    <div className="json-preview">
                        {policy.document ? JSON.stringify(JSON.parse(policy.document), null, 2) : 'No document available'}
                    </div>
                )}
            </div>

            {isEditing && (
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

const ResourceDetailTab = ({ resource, onUpdate, onBack }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: resource.name || '',
        type: resource.type || '',
        arn: resource.arn || '',
        status: resource.status || 'active',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleEdit = () => {
        setIsEditing(true);
        setEditForm({
            name: resource.name || '',
            type: resource.type || '',
            arn: resource.arn || '',
            status: resource.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({
            name: resource.name || '',
            type: resource.type || '',
            arn: resource.arn || '',
            status: resource.status || 'active',
        });
        setError(null);
        setSuccess(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            await onUpdate(resource.id, editForm);
            setSuccess('Resource updated successfully');
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update resource');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="resource-detail-section">
            <div className="section-header">
                <button className="btn-back" onClick={onBack}>
                    ← Back to Resources
                </button>
                <h3>Resource Details: {resource.name}</h3>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={handleEdit}>
                        Edit Resource
                    </button>
                )}
            </div>

            {success && <div className="inline-alert inline-alert-success">{success}</div>}
            {error && <div className="save-error">{error}</div>}

            <div className="resource-info-grid">
                <div className="info-card">
                    <h4>Basic Information</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Name</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => handleFormChange('name', e.target.value)}
                                />
                            ) : (
                                <span>{resource.name}</span>
                            )}
                        </div>
                        <div>
                            <strong>Type</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.type}
                                    onChange={(e) => handleFormChange('type', e.target.value)}
                                />
                            ) : (
                                <span>{resource.type}</span>
                            )}
                        </div>
                        <div>
                            <strong>ARN</strong>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.arn}
                                    onChange={(e) => handleFormChange('arn', e.target.value)}
                                />
                            ) : (
                                <span>{resource.arn || '—'}</span>
                            )}
                        </div>
                        <div>
                            <strong>Status</strong>
                            {isEditing ? (
                                <select
                                    value={editForm.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            ) : (
                                <span className="badge">{resource.status}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h4>Resource Details</h4>
                    <div className="info-grid">
                        <div>
                            <strong>Resource ID</strong>
                            <span>{resource.id}</span>
                        </div>
                        <div>
                            <strong>Organization ID</strong>
                            <span>{resource.organization_id}</span>
                        </div>
                        <div>
                            <strong>Created</strong>
                            <span>{new Date(resource.created_at).toLocaleString()}</span>
                        </div>
                        <div>
                            <strong>Updated</strong>
                            <span>{new Date(resource.updated_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-save"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

const OrganizationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [organization, setOrganization] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roles, setRoles] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [resources, setResources] = useState([]);
    const [orgSettings, setOrgSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        slug: '',
        parent_id: '',
        description: '',
        billing_tier: '',
        status: '',
        max_users: '',
        max_resources: '',
        metadata: '',
        settings: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);

    // User management state
    const [selectedUser, setSelectedUser] = useState(null);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        display_name: '',
        password: '',
    });
    const [userFormErrors, setUserFormErrors] = useState({});
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [userCreateError, setUserCreateError] = useState(null);

    // Group management state
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [groupForm, setGroupForm] = useState({
        name: '',
        description: '',
        group_type: 'user_group',
    });
    const [groupFormErrors, setGroupFormErrors] = useState({});
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [groupCreateError, setGroupCreateError] = useState(null);

    // Role management state
    const [selectedRole, setSelectedRole] = useState(null);
    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [roleForm, setRoleForm] = useState({
        name: '',
        description: '',
        role_type: 'organization_role',
    });
    const [roleFormErrors, setRoleFormErrors] = useState({});
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [roleCreateError, setRoleCreateError] = useState(null);

    // Policy management state
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [isCreatePolicyModalOpen, setIsCreatePolicyModalOpen] = useState(false);
    const [policyForm, setPolicyForm] = useState({
        name: '',
        description: '',
        policy_type: 'access_policy',
        effect: 'allow',
    });
    const [policyFormErrors, setPolicyFormErrors] = useState({});
    const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
    const [policyCreateError, setPolicyCreateError] = useState(null);

    // Resource management state
    const [selectedResource, setSelectedResource] = useState(null);
    const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] = useState(false);
    const [resourceForm, setResourceForm] = useState({
        name: '',
        type: '',
        arn: '',
    });
    const [resourceFormErrors, setResourceFormErrors] = useState({});
    const [isCreatingResource, setIsCreatingResource] = useState(false);
    const [resourceCreateError, setResourceCreateError] = useState(null);

    const displayValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return '—';
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return value;
    };

    const openEditModal = () => {
        if (!organization) {
            return;
        }
        setFormErrors({});
        setSaveError(null);
        setSaveNotice(null);
        setEditForm({
            name: organization.name || '',
            slug: organization.slug || '',
            parent_id:
                organization.parent_id !== undefined && organization.parent_id !== null
                    ? String(organization.parent_id)
                    : '',
            description: organization.description || '',
            billing_tier: organization.billing_tier || '',
            status: organization.status || 'active',
            max_users:
                organization.max_users !== undefined && organization.max_users !== null
                    ? String(organization.max_users)
                    : '',
            max_resources:
                organization.max_resources !== undefined && organization.max_resources !== null
                    ? String(organization.max_resources)
                    : '',
            metadata: prettyPrintJSON(organization.metadata || '{}'),
            settings: prettyPrintJSON(organization.settings || '{}'),
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        if (isSaving) {
            return;
        }
        setIsEditModalOpen(false);
    };

    const handleFieldChange = (field, value) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const parseJsonForSubmit = (rawValue, fallback = '{}') => {
        const trimmed = rawValue?.trim();
        if (!trimmed) {
            return fallback;
        }
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed);
    };

    const normalizeNumberField = (value) => {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
            return NaN;
        }
        return Math.floor(parsed);
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        const validationErrors = {};

        if (!editForm.name.trim()) {
            validationErrors.name = 'Name is required';
        }

        let metadataPayload;
        try {
            metadataPayload = parseJsonForSubmit(editForm.metadata, '{}');
        } catch (jsonError) {
            validationErrors.metadata = 'Metadata must be valid JSON';
        }

        let settingsPayload;
        try {
            settingsPayload = parseJsonForSubmit(editForm.settings, '{}');
        } catch (jsonError) {
            validationErrors.settings = 'Settings must be valid JSON';
        }

        const maxUsersValue = normalizeNumberField(editForm.max_users);
        if (Number.isNaN(maxUsersValue) || (maxUsersValue !== null && maxUsersValue < 0)) {
            validationErrors.max_users = 'Max users must be a non-negative number';
        }

        const maxResourcesValue = normalizeNumberField(editForm.max_resources);
        if (Number.isNaN(maxResourcesValue) || (maxResourcesValue !== null && maxResourcesValue < 0)) {
            validationErrors.max_resources = 'Max resources must be a non-negative number';
        }

        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        setFormErrors({});
        setIsSaving(true);
        setSaveError(null);

        const slugValue = editForm.slug?.trim() || '';
        const parentIdValue = editForm.parent_id?.trim() || '';

        const payload = {
            name: editForm.name.trim(),
            slug: slugValue !== '' ? slugValue : organization?.slug || '',
            parent_id: parentIdValue === '' ? null : parentIdValue,
            description: editForm.description.trim() === '' ? null : editForm.description.trim(),
            billing_tier: editForm.billing_tier.trim() || organization?.billing_tier || 'free',
            status: editForm.status.trim() || organization?.status || 'active',
            max_users: maxUsersValue !== null ? maxUsersValue : organization?.max_users,
            max_resources: maxResourcesValue !== null ? maxResourcesValue : organization?.max_resources,
            metadata: metadataPayload,
            settings: settingsPayload,
        };

        try {
            await organizationAPI.update(id, payload);
            await fetchOrganizationData({ showSpinner: false });
            setIsEditModalOpen(false);
            setSaveNotice('Organization updated successfully.');
            setTimeout(() => setSaveNotice(null), 4000);
        } catch (updateError) {
            const apiMessage =
                updateError.response?.data?.message || updateError.message || 'Failed to update organization';
            setSaveError(apiMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const displayTimestamp = (value) => {
        if (!value) {
            return '—';
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    };

    const formatJSON = (value) => {
        if (!value) {
            return '—';
        }
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return JSON.stringify(parsed, null, 2);
        } catch (err) {
            return String(value);
        }
    };

    const prettyPrintJSON = (value) => {
        if (!value) {
            return '{}';
        }
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return JSON.stringify(parsed, null, 2);
        } catch (err) {
            return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        }
    };

    // User management functions
    const handleUserClick = (user) => {
        setSelectedUser(user);
        setActiveTab('user-detail');
    };

    const handleCreateUser = () => {
        setIsCreateUserModalOpen(true);
    };

    const closeCreateUserModal = () => {
        if (isCreatingUser) return;
        setIsCreateUserModalOpen(false);
        setUserForm({
            username: '',
            email: '',
            display_name: '',
            password: '',
        });
        setUserFormErrors({});
        setUserCreateError(null);
    };

    const handleUserFormChange = (field, value) => {
        setUserForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateUserSubmit = async (event) => {
        event.preventDefault();
        const errors = {};

        if (!userForm.username.trim()) {
            errors.username = 'Username is required';
        }
        if (!userForm.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(userForm.email)) {
            errors.email = 'Email is invalid';
        }
        if (!userForm.password) {
            errors.password = 'Password is required';
        } else if (userForm.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        if (Object.keys(errors).length > 0) {
            setUserFormErrors(errors);
            return;
        }

        setUserFormErrors({});
        setIsCreatingUser(true);
        setUserCreateError(null);

        try {
            const userData = {
                ...userForm,
                organization_id: id,
            };
            await userAPI.create(userData);
            await fetchOrganizationData({ showSpinner: false });
            setIsCreateUserModalOpen(false);
            setUserForm({
                username: '',
                email: '',
                display_name: '',
                password: '',
            });
        } catch (error) {
            const apiMessage = error.response?.data?.message || error.message || 'Failed to create user';
            setUserCreateError(apiMessage);
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleUpdateUser = async (userId, userData) => {
        try {
            await userAPI.update(userId, userData);
            await fetchOrganizationData({ showSpinner: false });
            // Refresh selected user data
            const updatedUser = await userAPI.get(userId);
            setSelectedUser(updatedUser.data.data);
        } catch (error) {
            throw error;
        }
    };

    // Group management functions
    const handleGroupClick = (group) => {
        setSelectedGroup(group);
        setActiveTab('group-detail');
    };

    const handleCreateGroup = () => {
        setIsCreateGroupModalOpen(true);
    };

    const closeCreateGroupModal = () => {
        if (isCreatingGroup) return;
        setIsCreateGroupModalOpen(false);
        setGroupForm({
            name: '',
            description: '',
            group_type: 'user_group',
        });
        setGroupFormErrors({});
        setGroupCreateError(null);
    };

    const handleGroupFormChange = (field, value) => {
        setGroupForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateGroupSubmit = async (event) => {
        event.preventDefault();
        const errors = {};

        if (!groupForm.name.trim()) {
            errors.name = 'Name is required';
        }

        if (Object.keys(errors).length > 0) {
            setGroupFormErrors(errors);
            return;
        }

        setGroupFormErrors({});
        setIsCreatingGroup(true);
        setGroupCreateError(null);

        try {
            const groupData = {
                ...groupForm,
                organization_id: id,
            };
            await organizationAPI.createGroup(id, groupData);
            await fetchOrganizationData({ showSpinner: false });
            setIsCreateGroupModalOpen(false);
            setGroupForm({
                name: '',
                description: '',
                group_type: 'user_group',
            });
        } catch (error) {
            const apiMessage = error.response?.data?.message || error.message || 'Failed to create group';
            setGroupCreateError(apiMessage);
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleUpdateGroup = async (groupId, groupData) => {
        try {
            await organizationAPI.updateGroup(id, groupId, groupData);
            await fetchOrganizationData({ showSpinner: false });
            // Refresh selected group data
            const updatedGroup = await organizationAPI.getGroup(id, groupId);
            setSelectedGroup(updatedGroup.data.data);
        } catch (error) {
            throw error;
        }
    };

    // Role management functions
    const handleRoleClick = (role) => {
        setSelectedRole(role);
        setActiveTab('role-detail');
    };

    const handleCreateRole = () => {
        setIsCreateRoleModalOpen(true);
    };

    const closeCreateRoleModal = () => {
        if (isCreatingRole) return;
        setIsCreateRoleModalOpen(false);
        setRoleForm({
            name: '',
            description: '',
            role_type: 'organization_role',
        });
        setRoleFormErrors({});
        setRoleCreateError(null);
    };

    const handleRoleFormChange = (field, value) => {
        setRoleForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateRoleSubmit = async (event) => {
        event.preventDefault();
        const errors = {};

        if (!roleForm.name.trim()) {
            errors.name = 'Name is required';
        }

        if (Object.keys(errors).length > 0) {
            setRoleFormErrors(errors);
            return;
        }

        setRoleFormErrors({});
        setIsCreatingRole(true);
        setRoleCreateError(null);

        try {
            const roleData = {
                ...roleForm,
                organization_id: id,
            };
            await organizationAPI.createRole(id, roleData);
            await fetchOrganizationData({ showSpinner: false });
            setIsCreateRoleModalOpen(false);
            setRoleForm({
                name: '',
                description: '',
                role_type: 'organization_role',
            });
        } catch (error) {
            const apiMessage = error.response?.data?.message || error.message || 'Failed to create role';
            setRoleCreateError(apiMessage);
        } finally {
            setIsCreatingRole(false);
        }
    };

    const handleUpdateRole = async (roleId, roleData) => {
        try {
            await organizationAPI.updateRole(id, roleId, roleData);
            await fetchOrganizationData({ showSpinner: false });
            // Refresh selected role data
            const updatedRole = await organizationAPI.getRole(id, roleId);
            setSelectedRole(updatedRole.data.data);
        } catch (error) {
            throw error;
        }
    };

    // Policy management functions
    const handlePolicyClick = (policy) => {
        setSelectedPolicy(policy);
        setActiveTab('policy-detail');
    };

    const handleCreatePolicy = () => {
        setIsCreatePolicyModalOpen(true);
    };

    const closeCreatePolicyModal = () => {
        if (isCreatingPolicy) return;
        setIsCreatePolicyModalOpen(false);
        setPolicyForm({
            name: '',
            description: '',
            policy_type: 'access_policy',
            effect: 'allow',
        });
        setPolicyFormErrors({});
        setPolicyCreateError(null);
    };

    const handlePolicyFormChange = (field, value) => {
        setPolicyForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreatePolicySubmit = async (event) => {
        event.preventDefault();
        const errors = {};

        if (!policyForm.name.trim()) {
            errors.name = 'Name is required';
        }

        if (Object.keys(errors).length > 0) {
            setPolicyFormErrors(errors);
            return;
        }

        setPolicyFormErrors({});
        setIsCreatingPolicy(true);
        setPolicyCreateError(null);

        try {
            const policyData = {
                ...policyForm,
                organization_id: id,
            };
            await organizationAPI.createPolicy(id, policyData);
            await fetchOrganizationData({ showSpinner: false });
            setIsCreatePolicyModalOpen(false);
            setPolicyForm({
                name: '',
                description: '',
                policy_type: 'access_policy',
                effect: 'allow',
            });
        } catch (error) {
            const apiMessage = error.response?.data?.message || error.message || 'Failed to create policy';
            setPolicyCreateError(apiMessage);
        } finally {
            setIsCreatingPolicy(false);
        }
    };

    const handleUpdatePolicy = async (policyId, policyData) => {
        try {
            await organizationAPI.updatePolicy(id, policyId, policyData);
            await fetchOrganizationData({ showSpinner: false });
            // Refresh selected policy data
            const updatedPolicy = await organizationAPI.getPolicy(id, policyId);
            setSelectedPolicy(updatedPolicy.data.data);
        } catch (error) {
            throw error;
        }
    };

    // Resource management functions
    const handleResourceClick = (resource) => {
        setSelectedResource(resource);
        setActiveTab('resource-detail');
    };

    const handleCreateResource = () => {
        setIsCreateResourceModalOpen(true);
    };

    const closeCreateResourceModal = () => {
        if (isCreatingResource) return;
        setIsCreateResourceModalOpen(false);
        setResourceForm({
            name: '',
            type: '',
            arn: '',
        });
        setResourceFormErrors({});
        setResourceCreateError(null);
    };

    const handleResourceFormChange = (field, value) => {
        setResourceForm(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateResourceSubmit = async (event) => {
        event.preventDefault();
        const errors = {};

        if (!resourceForm.name.trim()) {
            errors.name = 'Name is required';
        }
        if (!resourceForm.type.trim()) {
            errors.type = 'Type is required';
        }

        if (Object.keys(errors).length > 0) {
            setResourceFormErrors(errors);
            return;
        }

        setResourceFormErrors({});
        setIsCreatingResource(true);
        setResourceCreateError(null);

        try {
            const resourceData = {
                ...resourceForm,
                organization_id: id,
            };
            await organizationAPI.createResource(id, resourceData);
            await fetchOrganizationData({ showSpinner: false });
            setIsCreateResourceModalOpen(false);
            setResourceForm({
                name: '',
                type: '',
                arn: '',
            });
        } catch (error) {
            const apiMessage = error.response?.data?.message || error.message || 'Failed to create resource';
            setResourceCreateError(apiMessage);
        } finally {
            setIsCreatingResource(false);
        }
    };

    const handleUpdateResource = async (resourceId, resourceData) => {
        try {
            await organizationAPI.updateResource(id, resourceId, resourceData);
            await fetchOrganizationData({ showSpinner: false });
            // Refresh selected resource data
            const updatedResource = await organizationAPI.getResource(id, resourceId);
            setSelectedResource(updatedResource.data.data);
        } catch (error) {
            throw error;
        }
    };

    useEffect(() => {
        fetchOrganizationData();
    }, [id]);

    const parseJSON = (value) => {
        if (!value) {
            return null;
        }
        try {
            return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (err) {
            console.warn('Failed to parse JSON field:', err);
            return null;
        }
    };

    const fetchOrganizationData = async ({ showSpinner = true } = {}) => {
        if (showSpinner) {
            setLoading(true);
        }
        setError(null);
        try {
            const [
                orgRes,
                usersRes,
                groupsRes,
                rolesRes,
                policiesRes,
                resourcesRes,
                settingsRes,
            ] = await Promise.all([
                organizationAPI.get(id),
                organizationAPI.getUsers(id),
                organizationAPI.getGroups(id),
                organizationAPI.getRoles(id),
                organizationAPI.getPolicies(id),
                organizationAPI.getResources(id),
                organizationAPI.getSettings(id),
            ]);

            const orgData = orgRes?.data?.data;
            if (!orgData) {
                throw new Error('Organization payload missing');
            }

            setOrganization(orgData);
            setUsers(usersRes.data.data.users || []);
            setGroups(groupsRes.data.data.groups || []);
            setRoles(rolesRes.data.data.roles || []);
            setPolicies(policiesRes.data.data.policies || []);
            setResources(resourcesRes.data.data.resources || []);
            setOrgSettings(parseJSON(settingsRes.data.data.settings) || {});
        } catch (fetchError) {
            console.error('Failed to fetch organization data:', fetchError);
            setOrganization(null);
            setUsers([]);
            setGroups([]);
            setRoles([]);
            setPolicies([]);
            setResources([]);
            setOrgSettings({});
            setError('Unable to load organization details. Please try again.');
        } finally {
            if (showSpinner) {
                setLoading(false);
            }
        }
    };

    const editModal = null; // Not used, modal rendered inline

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return (
            <>
                <div className="dashboard-layout">
                    <Sidebar user={user} onLogout={logout} />
                    <main className="dashboard-main">
                        <div className="error-state">
                            <h2>Unable to load organization</h2>
                            <p>{error}</p>
                            <button className="btn-secondary" onClick={fetchOrganizationData}>
                                Retry
                            </button>
                            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                                ← Back to Organizations
                            </button>
                        </div>
                    </main>
                </div>
                {editModal}
            </>
        );
    }

    if (!organization) {
        return null;
    }

    const org = organization;
    const metadata = parseJSON(org.metadata);
    const orgSettingsParsed = parseJSON(org.settings);
    const metadataEntries = metadata && Object.entries(metadata);
    const settingsEntries = orgSettingsParsed && Object.entries(orgSettingsParsed);

    const overviewCards = [
        {
            title: 'Organization Details',
            fields: [
                { label: 'Name', value: displayValue(org.name) },
                { label: 'ID', value: displayValue(org.id) },
                { label: 'Slug', value: displayValue(org.slug) },
                { label: 'Status', value: displayValue(org.status), badge: true },
                { label: 'Billing Tier', value: displayValue(org.billing_tier) },
                { label: 'Parent Organization', value: displayValue(org.parent_id) },
            ],
        },
        {
            title: 'Business Profile',
            fields: [
                { label: 'Domain', value: displayValue(org.domain) },
                { label: 'Website', value: displayValue(org.website) },
                { label: 'Industry', value: displayValue(org.industry) },
                { label: 'Organization Size', value: displayValue(org.size) },
                { label: 'Country', value: displayValue(org.country) },
                { label: 'Timezone', value: displayValue(org.timezone) },
                { label: 'Language', value: displayValue(org.language) },
            ],
        },
        {
            title: 'Contact & Support',
            fields: [
                { label: 'Billing Email', value: displayValue(org.billing_email) },
                { label: 'Support Email', value: displayValue(org.support_email) },
                { label: 'Phone', value: displayValue(org.phone) },
                { label: 'Address', value: displayValue(org.address) },
            ],
        },
        {
            title: 'Lifecycle',
            fields: [
                { label: 'Created At', value: displayTimestamp(org.created_at) },
                { label: 'Updated At', value: displayTimestamp(org.updated_at) },
                { label: 'Deleted At', value: displayTimestamp(org.deleted_at) },
            ],
        },
        {
            title: 'Limits & Allocation',
            fields: [
                { label: 'Max Users', value: displayValue(org.max_users) },
                { label: 'Max Resources', value: displayValue(org.max_resources) },
                { label: 'Usage Model', value: displayValue(org.usage_model) },
            ],
        },
    ];

    return (
        <>
            <div className="dashboard-layout">
                <Sidebar user={user} onLogout={logout} />

                <main className="dashboard-main">
                    <div className="org-detail-header">
                        <div className="org-header-row">
                            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                                ← Back to Organizations
                            </button>
                            <button className="btn btn-primary" onClick={openEditModal}>
                                Edit Organization
                            </button>
                        </div>
                        <h1>{org?.name}</h1>
                        <p>{displayValue(org?.description)}</p>
                        {saveNotice && <div className="inline-alert inline-alert-success">{saveNotice}</div>}
                    </div>

                    <div className="tabs">
                        <button
                            className={activeTab === 'overview' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={activeTab === 'users' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('users')}
                        >
                            Users ({users.length})
                        </button>
                        <button
                            className={activeTab === 'groups' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('groups')}
                        >
                            Groups ({groups.length})
                        </button>
                        <button
                            className={activeTab === 'roles' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('roles')}
                        >
                            Roles ({roles.length})
                        </button>
                        <button
                            className={activeTab === 'policies' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('policies')}
                        >
                            Policies ({policies.length})
                        </button>
                        <button
                            className={activeTab === 'resources' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('resources')}
                        >
                            Resources ({resources.length})
                        </button>
                        <button
                            className={activeTab === 'settings' ? 'tab active' : 'tab'}
                            onClick={() => setActiveTab('settings')}
                        >
                            Settings
                        </button>
                        {selectedUser && (
                            <button
                                className={activeTab === 'user-detail' ? 'tab active' : 'tab'}
                                onClick={() => setActiveTab('user-detail')}
                            >
                                User: {selectedUser.username}
                            </button>
                        )}
                        {selectedGroup && (
                            <button
                                className={activeTab === 'group-detail' ? 'tab active' : 'tab'}
                                onClick={() => setActiveTab('group-detail')}
                            >
                                Group: {selectedGroup.name}
                            </button>
                        )}
                        {selectedRole && (
                            <button
                                className={activeTab === 'role-detail' ? 'tab active' : 'tab'}
                                onClick={() => setActiveTab('role-detail')}
                            >
                                Role: {selectedRole.name}
                            </button>
                        )}
                        {selectedPolicy && (
                            <button
                                className={activeTab === 'policy-detail' ? 'tab active' : 'tab'}
                                onClick={() => setActiveTab('policy-detail')}
                            >
                                Policy: {selectedPolicy.name}
                            </button>
                        )}
                        {selectedResource && (
                            <button
                                className={activeTab === 'resource-detail' ? 'tab active' : 'tab'}
                                onClick={() => setActiveTab('resource-detail')}
                            >
                                Resource: {selectedResource.name}
                            </button>
                        )}
                    </div>

                    <div className="tab-content">
                        {activeTab === 'overview' && (
                            <div className="overview-section">
                                {overviewCards.map((card) => (
                                    <div key={card.title} className="info-card">
                                        <h3>{card.title}</h3>
                                        <div className="info-grid">
                                            {card.fields.map((field) => (
                                                <div key={field.label}>
                                                    <strong>{field.label}</strong>
                                                    {field.badge ? (
                                                        <span className="badge">{field.value}</span>
                                                    ) : (
                                                        field.value
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="info-card">
                                    <h3>Description</h3>
                                    <p className="paragraph-text">{displayValue(org.description)}</p>
                                </div>

                                <div className="info-card">
                                    <h3>Metadata</h3>
                                    {metadataEntries && metadataEntries.length > 0 ? (
                                        <div className="key-value-grid">
                                            {metadataEntries.map(([key, value]) => (
                                                <div key={key}>
                                                    <strong>{key}</strong>
                                                    <span>{typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-note">No metadata configured</p>
                                    )}
                                    <pre className="json-preview">{formatJSON(org.metadata)}</pre>
                                </div>

                                <div className="info-card">
                                    <h3>Settings</h3>
                                    {settingsEntries && settingsEntries.length > 0 ? (
                                        <div className="key-value-grid">
                                            {settingsEntries.map(([key, value]) => (
                                                <div key={key}>
                                                    <strong>{key}</strong>
                                                    <span>{typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-note">No settings configured</p>
                                    )}
                                    <pre className="json-preview">{formatJSON(org.settings)}</pre>
                                </div>

                                <div className="info-card">
                                    <h3>Raw Response</h3>
                                    <pre className="json-preview">{JSON.stringify(org, null, 2)}</pre>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="users-section">
                                <div className="section-header">
                                    <h3>Organization Users</h3>
                                    <button className="btn btn-primary" onClick={handleCreateUser}>
                                        Create User
                                    </button>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>Email</th>
                                                <th>Display Name</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} onClick={() => handleUserClick(user)} className="clickable-row">
                                                    <td>{user.username}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.display_name}</td>
                                                    <td><span className="badge">{user.status}</span></td>
                                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {users.length === 0 && <p className="empty-message">No users found</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'groups' && (
                            <div className="groups-section">
                                <div className="section-header">
                                    <h3>Organization Groups</h3>
                                    <button className="btn btn-primary" onClick={handleCreateGroup}>
                                        Create Group
                                    </button>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groups.map((group) => (
                                                <tr key={group.id} onClick={() => handleGroupClick(group)} className="clickable-row">
                                                    <td>{group.name}</td>
                                                    <td>{group.description}</td>
                                                    <td>{group.group_type}</td>
                                                    <td><span className="badge">{group.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {groups.length === 0 && <p className="empty-message">No groups found</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div className="roles-section">
                                <div className="section-header">
                                    <h3>Organization Roles</h3>
                                    <button className="btn btn-primary" onClick={handleCreateRole}>
                                        Create Role
                                    </button>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roles.map((role) => (
                                                <tr key={role.id} onClick={() => handleRoleClick(role)} className="clickable-row">
                                                    <td>{role.name}</td>
                                                    <td>{role.description}</td>
                                                    <td>{role.role_type}</td>
                                                    <td><span className="badge">{role.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {roles.length === 0 && <p className="empty-message">No roles found</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'policies' && (
                            <div className="policies-section">
                                <div className="section-header">
                                    <h3>Organization Policies</h3>
                                    <button className="btn btn-primary" onClick={handleCreatePolicy}>
                                        Create Policy
                                    </button>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Description</th>
                                                <th>Type</th>
                                                <th>Effect</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {policies.map((policy) => (
                                                <tr key={policy.id} onClick={() => handlePolicyClick(policy)} className="clickable-row">
                                                    <td>{policy.name}</td>
                                                    <td>{policy.description}</td>
                                                    <td>{policy.policy_type}</td>
                                                    <td><span className="badge">{policy.effect}</span></td>
                                                    <td><span className="badge">{policy.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {policies.length === 0 && <p className="empty-message">No policies found</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="resources-section">
                                <div className="section-header">
                                    <h3>Organization Resources</h3>
                                    <button className="btn btn-primary" onClick={handleCreateResource}>
                                        Create Resource
                                    </button>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Type</th>
                                                <th>ARN</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resources.map((resource) => (
                                                <tr key={resource.id} onClick={() => handleResourceClick(resource)} className="clickable-row">
                                                    <td>{resource.name}</td>
                                                    <td>{resource.type}</td>
                                                    <td>{resource.arn}</td>
                                                    <td><span className="badge">{resource.status}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {resources.length === 0 && <p className="empty-message">No resources found</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="settings-section">
                                <div className="settings-header">
                                    <h3>Organization Settings</h3>
                                    <button className="btn btn-primary" onClick={() => setActiveTab('settings-edit')}>
                                        Edit Settings
                                    </button>
                                </div>
                                <div className="info-card">
                                    <h4>Current Settings</h4>
                                    {Object.keys(orgSettings).length > 0 ? (
                                        <div className="key-value-grid">
                                            {Object.entries(orgSettings).map(([key, value]) => (
                                                <div key={key}>
                                                    <strong>{key}</strong>
                                                    <span>{typeof value === 'object' ? JSON.stringify(value, null, 2) : displayValue(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="empty-note">No settings configured</p>
                                    )}
                                    <pre className="json-preview">{JSON.stringify(orgSettings, null, 2)}</pre>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings-edit' && <SettingsEditTab orgId={id} currentSettings={orgSettings} onSave={() => { setActiveTab('settings'); fetchOrganizationData({ showSpinner: false }); }} onCancel={() => setActiveTab('settings')} />}

                        {activeTab === 'user-detail' && selectedUser && (
                            <UserDetailTab
                                user={selectedUser}
                                onUpdate={handleUpdateUser}
                                onBack={() => setActiveTab('users')}
                            />
                        )}

                        {activeTab === 'group-detail' && selectedGroup && (
                            <GroupDetailTab
                                group={selectedGroup}
                                onUpdate={handleUpdateGroup}
                                onBack={() => setActiveTab('groups')}
                            />
                        )}

                        {activeTab === 'role-detail' && selectedRole && (
                            <RoleDetailTab
                                role={selectedRole}
                                onUpdate={handleUpdateRole}
                                onBack={() => setActiveTab('roles')}
                            />
                        )}

                        {activeTab === 'policy-detail' && selectedPolicy && (
                            <PolicyDetailTab
                                policy={selectedPolicy}
                                onUpdate={handleUpdatePolicy}
                                onBack={() => setActiveTab('policies')}
                            />
                        )}

                        {activeTab === 'resource-detail' && selectedResource && (
                            <ResourceDetailTab
                                resource={selectedResource}
                                onUpdate={handleUpdateResource}
                                onBack={() => setActiveTab('resources')}
                            />
                        )}

                        {isCreateUserModalOpen && (
                            <div className="modal-overlay" role="dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3>Create New User</h3>
                                        <button
                                            className="modal-close"
                                            onClick={closeCreateUserModal}
                                            disabled={isCreatingUser}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateUserSubmit}>
                                        <div className="form-grid">
                                            <div className="form-group">
                                                <label htmlFor="user-username">Username *</label>
                                                <input
                                                    id="user-username"
                                                    type="text"
                                                    value={userForm.username}
                                                    onChange={(e) => handleUserFormChange('username', e.target.value)}
                                                    required
                                                />
                                                {userFormErrors.username && <p className="field-error">{userFormErrors.username}</p>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="user-email">Email *</label>
                                                <input
                                                    id="user-email"
                                                    type="email"
                                                    value={userForm.email}
                                                    onChange={(e) => handleUserFormChange('email', e.target.value)}
                                                    required
                                                />
                                                {userFormErrors.email && <p className="field-error">{userFormErrors.email}</p>}
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="user-display-name">Display Name</label>
                                                <input
                                                    id="user-display-name"
                                                    type="text"
                                                    value={userForm.display_name}
                                                    onChange={(e) => handleUserFormChange('display_name', e.target.value)}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="user-password">Password *</label>
                                                <input
                                                    id="user-password"
                                                    type="password"
                                                    value={userForm.password}
                                                    onChange={(e) => handleUserFormChange('password', e.target.value)}
                                                    required
                                                    minLength="8"
                                                />
                                                {userFormErrors.password && <p className="field-error">{userFormErrors.password}</p>}
                                            </div>
                                        </div>

                                        {userCreateError && <div className="save-error">{userCreateError}</div>}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={closeCreateUserModal}
                                                disabled={isCreatingUser}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-save"
                                                disabled={isCreatingUser}
                                            >
                                                {isCreatingUser ? 'Creating...' : 'Create User'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {isCreateGroupModalOpen && (
                            <div className="modal-overlay" role="dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3>Create New Group</h3>
                                        <button
                                            className="modal-close"
                                            onClick={closeCreateGroupModal}
                                            disabled={isCreatingGroup}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateGroupSubmit}>
                                        <div className="modal-body">
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="group-name">Name *</label>
                                                    <input
                                                        id="group-name"
                                                        type="text"
                                                        value={groupForm.name}
                                                        onChange={(e) => handleGroupFormChange('name', e.target.value)}
                                                        required
                                                    />
                                                    {groupFormErrors.name && <p className="field-error">{groupFormErrors.name}</p>}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="group-type">Type</label>
                                                    <select
                                                        id="group-type"
                                                        value={groupForm.group_type}
                                                        onChange={(e) => handleGroupFormChange('group_type', e.target.value)}
                                                    >
                                                        <option value="user_group">User Group</option>
                                                        <option value="system_group">System Group</option>
                                                        <option value="admin_group">Admin Group</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="group-description">Description</label>
                                                <textarea
                                                    id="group-description"
                                                    value={groupForm.description}
                                                    onChange={(e) => handleGroupFormChange('description', e.target.value)}
                                                    rows={3}
                                                />
                                            </div>
                                        </div>

                                        {groupCreateError && <div className="save-error">{groupCreateError}</div>}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={closeCreateGroupModal}
                                                disabled={isCreatingGroup}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-save"
                                                disabled={isCreatingGroup}
                                            >
                                                {isCreatingGroup ? 'Creating...' : 'Create Group'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {isCreateRoleModalOpen && (
                            <div className="modal-overlay" role="dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3>Create New Role</h3>
                                        <button
                                            className="modal-close"
                                            onClick={closeCreateRoleModal}
                                            disabled={isCreatingRole}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateRoleSubmit}>
                                        <div className="modal-body">
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="role-name">Name *</label>
                                                    <input
                                                        id="role-name"
                                                        type="text"
                                                        value={roleForm.name}
                                                        onChange={(e) => handleRoleFormChange('name', e.target.value)}
                                                        required
                                                    />
                                                    {roleFormErrors.name && <p className="field-error">{roleFormErrors.name}</p>}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="role-type">Type</label>
                                                    <select
                                                        id="role-type"
                                                        value={roleForm.role_type}
                                                        onChange={(e) => handleRoleFormChange('role_type', e.target.value)}
                                                    >
                                                        <option value="organization_role">Organization Role</option>
                                                        <option value="system_role">System Role</option>
                                                        <option value="admin_role">Admin Role</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="role-description">Description</label>
                                                <textarea
                                                    id="role-description"
                                                    value={roleForm.description}
                                                    onChange={(e) => handleRoleFormChange('description', e.target.value)}
                                                    rows={3}
                                                />
                                            </div>
                                        </div>

                                        {roleCreateError && <div className="save-error">{roleCreateError}</div>}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={closeCreateRoleModal}
                                                disabled={isCreatingRole}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-save"
                                                disabled={isCreatingRole}
                                            >
                                                {isCreatingRole ? 'Creating...' : 'Create Role'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {isCreatePolicyModalOpen && (
                            <div className="modal-overlay" role="dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3>Create New Policy</h3>
                                        <button
                                            className="modal-close"
                                            onClick={closeCreatePolicyModal}
                                            disabled={isCreatingPolicy}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreatePolicySubmit}>
                                        <div className="modal-body">
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="policy-name">Name *</label>
                                                    <input
                                                        id="policy-name"
                                                        type="text"
                                                        value={policyForm.name}
                                                        onChange={(e) => handlePolicyFormChange('name', e.target.value)}
                                                        required
                                                    />
                                                    {policyFormErrors.name && <p className="field-error">{policyFormErrors.name}</p>}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="policy-type">Type</label>
                                                    <select
                                                        id="policy-type"
                                                        value={policyForm.policy_type}
                                                        onChange={(e) => handlePolicyFormChange('policy_type', e.target.value)}
                                                    >
                                                        <option value="access_policy">Access Policy</option>
                                                        <option value="security_policy">Security Policy</option>
                                                        <option value="compliance_policy">Compliance Policy</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="policy-effect">Effect</label>
                                                    <select
                                                        id="policy-effect"
                                                        value={policyForm.effect}
                                                        onChange={(e) => handlePolicyFormChange('effect', e.target.value)}
                                                    >
                                                        <option value="allow">Allow</option>
                                                        <option value="deny">Deny</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="policy-description">Description</label>
                                                <textarea
                                                    id="policy-description"
                                                    value={policyForm.description}
                                                    onChange={(e) => handlePolicyFormChange('description', e.target.value)}
                                                    rows={3}
                                                />
                                            </div>
                                        </div>

                                        {policyCreateError && <div className="save-error">{policyCreateError}</div>}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={closeCreatePolicyModal}
                                                disabled={isCreatingPolicy}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-save"
                                                disabled={isCreatingPolicy}
                                            >
                                                {isCreatingPolicy ? 'Creating...' : 'Create Policy'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {isCreateResourceModalOpen && (
                            <div className="modal-overlay" role="dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3>Create New Resource</h3>
                                        <button
                                            className="modal-close"
                                            onClick={closeCreateResourceModal}
                                            disabled={isCreatingResource}
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateResourceSubmit}>
                                        <div className="modal-body">
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label htmlFor="resource-name">Name *</label>
                                                    <input
                                                        id="resource-name"
                                                        type="text"
                                                        value={resourceForm.name}
                                                        onChange={(e) => handleResourceFormChange('name', e.target.value)}
                                                        required
                                                    />
                                                    {resourceFormErrors.name && <p className="field-error">{resourceFormErrors.name}</p>}
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="resource-type">Type *</label>
                                                    <input
                                                        id="resource-type"
                                                        type="text"
                                                        value={resourceForm.type}
                                                        onChange={(e) => handleResourceFormChange('type', e.target.value)}
                                                        required
                                                    />
                                                    {resourceFormErrors.type && <p className="field-error">{resourceFormErrors.type}</p>}
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="resource-arn">ARN</label>
                                                <input
                                                    id="resource-arn"
                                                    type="text"
                                                    value={resourceForm.arn}
                                                    onChange={(e) => handleResourceFormChange('arn', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {resourceCreateError && <div className="save-error">{resourceCreateError}</div>}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={closeCreateResourceModal}
                                                disabled={isCreatingResource}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn-save"
                                                disabled={isCreatingResource}
                                            >
                                                {isCreatingResource ? 'Creating...' : 'Create Resource'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {isEditModalOpen && (
                            <div
                                className="modal-overlay"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="edit-organization-title"
                                onClick={closeEditModal}
                            >
                                <div
                                    className="modal-content org-edit-modal"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="modal-header">
                                        <h2 id="edit-organization-title">Edit Organization</h2>
                                        <button
                                            type="button"
                                            className="modal-close"
                                            onClick={closeEditModal}
                                            disabled={isSaving}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <form className="org-edit-form" onSubmit={handleEditSubmit}>
                                        <div className="org-edit-grid">
                                            <div className="form-group">
                                                <label htmlFor="org-name-input">Name *</label>
                                                <input
                                                    id="org-name-input"
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(event) => handleFieldChange('name', event.target.value)}
                                                    required
                                                />
                                                {formErrors.name && <p className="field-error">{formErrors.name}</p>}
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="org-slug-input">Slug</label>
                                                <input
                                                    id="org-slug-input"
                                                    type="text"
                                                    value={editForm.slug}
                                                    onChange={(event) => handleFieldChange('slug', event.target.value)}
                                                    placeholder="auto-generate from name"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="org-parent-input">Parent ID</label>
                                                <input
                                                    id="org-parent-input"
                                                    type="text"
                                                    value={editForm.parent_id}
                                                    onChange={(event) => handleFieldChange('parent_id', event.target.value)}
                                                    placeholder="optional parent identifier"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="org-status-input">Status</label>
                                                <input
                                                    id="org-status-input"
                                                    type="text"
                                                    value={editForm.status}
                                                    onChange={(event) => handleFieldChange('status', event.target.value)}
                                                    placeholder="active"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="org-billing-tier-input">Billing Tier</label>
                                                <input
                                                    id="org-billing-tier-input"
                                                    type="text"
                                                    value={editForm.billing_tier}
                                                    onChange={(event) => handleFieldChange('billing_tier', event.target.value)}
                                                    placeholder="free"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="org-max-users-input">Max Users</label>
                                                <input
                                                    id="org-max-users-input"
                                                    type="number"
                                                    min="0"
                                                    value={editForm.max_users}
                                                    onChange={(event) => handleFieldChange('max_users', event.target.value)}
                                                />
                                                {formErrors.max_users && <p className="field-error">{formErrors.max_users}</p>}
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="org-max-resources-input">Max Resources</label>
                                                <input
                                                    id="org-max-resources-input"
                                                    type="number"
                                                    min="0"
                                                    value={editForm.max_resources}
                                                    onChange={(event) => handleFieldChange('max_resources', event.target.value)}
                                                />
                                                {formErrors.max_resources && (
                                                    <p className="field-error">{formErrors.max_resources}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="org-description-input">Description</label>
                                            <textarea
                                                id="org-description-input"
                                                rows="3"
                                                value={editForm.description}
                                                onChange={(event) => handleFieldChange('description', event.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="org-metadata-input">Metadata (JSON)</label>
                                            <textarea
                                                id="org-metadata-input"
                                                className="json-input"
                                                rows="6"
                                                value={editForm.metadata}
                                                onChange={(event) => handleFieldChange('metadata', event.target.value)}
                                            />
                                            <p className="field-help">Provide a valid JSON object describing custom metadata.</p>
                                            {formErrors.metadata && <p className="field-error">{formErrors.metadata}</p>}
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="org-settings-input">Settings (JSON)</label>
                                            <textarea
                                                id="org-settings-input"
                                                className="json-input"
                                                rows="6"
                                                value={editForm.settings}
                                                onChange={(event) => handleFieldChange('settings', event.target.value)}
                                            />
                                            <p className="field-help">Provide a valid JSON object for organization settings.</p>
                                            {formErrors.settings && <p className="field-error">{formErrors.settings}</p>}
                                        </div>

                                        {saveError && <div className="save-error">{saveError}</div>}

                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                className="btn-cancel"
                                                onClick={closeEditModal}
                                                disabled={isSaving}
                                            >
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn-save" disabled={isSaving}>
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {editModal}
        </>
    );
};

export default OrganizationDetail;

