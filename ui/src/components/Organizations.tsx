import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';

export default function Organizations({ token, currentUser }) {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Auth State - Only Super Admin can create orgs usually, but let's check
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedOrg, setSelectedOrg] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        billing_tier: 'free'
    });

    useEffect(() => {
        if (token) {
            fetchOrgs();
        }
    }, [token]);

    const fetchOrgs = async () => {
        try {
            const res = await fetch('/api/v1/organizations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch organizations');
            }

            const data = await res.json();
            setOrgs(data.data.items || data.data.organizations || []); // Adjust based on actual API response
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this organization? This will delete all associated resources.')) return;

        try {
            const res = await fetch(`/api/v1/organizations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete organization');

            setSuccess('Organization deleted successfully');
            setTimeout(() => setSuccess(null), 3000);
            fetchOrgs();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (org) => {
        setModalMode('edit');
        setSelectedOrg(org);
        setFormData({
            name: org.name,
            slug: org.slug,
            description: org.description || '',
            billing_tier: org.billing_tier || 'free'
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedOrg(null);
        setFormData({
            name: '',
            slug: '',
            description: '',
            billing_tier: 'free'
        });
        setShowModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const url = modalMode === 'create' ? '/api/v1/organizations' : `/api/v1/organizations/${selectedOrg.id}`;
            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.error || 'Operation failed');

            setSuccess(`Organization ${modalMode === 'create' ? 'created' : 'updated'} successfully`);
            setShowModal(false);
            fetchOrgs();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Organizations</h2>
                    <p className="text-muted">Manage tenant organizations</p>
                </div>
                {isSuperAdmin && (
                    <button className="btn btn-primary flex items-center gap-2" onClick={openCreateModal}>
                        <Plus size={16} /> New Organization
                    </button>
                )}
            </div>

            {error && <div className="p-4 mb-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md">{error}</div>}
            {success && <div className="p-4 mb-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md">{success}</div>}

            <div className="card">
                {loading ? (
                    <div className="p-8 text-center text-muted">Loading organizations...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)] text-left">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Slug</th>
                                    <th className="p-4">Billing Tier</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Created</th>
                                    {(isAdmin || isSuperAdmin) && <th className="p-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {orgs.map(org => (
                                    <tr key={org.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-input)] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white">
                                                    <Building2 size={16} />
                                                </div>
                                                <div className="font-medium">{org.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-mono text-muted">{org.id}</td>
                                        <td className="p-4 text-sm font-mono text-muted">{org.slug || '-'}</td>
                                        <td className="p-4">
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                background: 'rgba(59, 130, 246, 0.15)',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(59, 130, 246, 0.2)'
                                            }}>
                                                {org.billing_tier?.toUpperCase() || 'FREE'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                background: org.status === 'active' ? 'var(--success-bg)' : 'rgba(107, 114, 128, 0.2)',
                                                color: org.status === 'active' ? 'var(--success)' : '#9ca3af'
                                            }}>
                                                {org.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-muted">{new Date(org.created_at).toLocaleDateString()}</td>
                                        {(isAdmin || isSuperAdmin) && (
                                            <td className="p-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => openEditModal(org)} className="p-1 hover:text-white text-muted" title="Edit"><Edit size={16} /></button>
                                                    {isSuperAdmin && (
                                                        <button onClick={() => handleDelete(org.id)} className="p-1 hover:text-red-500 text-muted" title="Delete"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {orgs.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center p-8 text-muted">
                                            No organizations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card p-6 w-full max-w-lg animate-fade-in">
                        <h3 className="text-xl font-bold mb-4">{modalMode === 'create' ? 'New Organization' : 'Edit Organization'}</h3>
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm text-muted">Organization Name</label>
                                <input
                                    className="input mt-1 w-full"
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm text-muted">Slug (Optional)</label>
                                <input
                                    className="input mt-1 w-full font-mono text-sm"
                                    type="text"
                                    value={formData.slug}
                                    placeholder="auto-generated"
                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                />
                                <p className="text-xs text-muted mt-1">Unique identifier for the organization URL.</p>
                            </div>

                            <div>
                                <label className="text-sm text-muted">Billing Tier</label>
                                <select
                                    className="input mt-1 w-full"
                                    value={formData.billing_tier}
                                    onChange={e => setFormData({ ...formData, billing_tier: e.target.value })}
                                >
                                    <option value="free">Free</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {modalMode === 'create' ? 'Create Organization' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
