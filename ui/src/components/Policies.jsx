import { useState, useEffect } from 'react';
import policyAPI from '../services/policyAPI';
import PolicyModal from './PolicyModal';
import PolicyVersionsModal from './PolicyVersionsModal';
import PolicySimulateModal from './PolicySimulateModal';
import '../styles/Policies.css';

const Policies = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showVersionsModal, setShowVersionsModal] = useState(false);
    const [showSimulateModal, setShowSimulateModal] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await policyAPI.list();
            setPolicies(response.data.policies || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch policies');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePolicy = () => {
        setSelectedPolicy(null);
        setModalMode('create');
        setShowModal(true);
    };

    const handleEditPolicy = (policy) => {
        setSelectedPolicy(policy);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleViewVersions = (policy) => {
        setSelectedPolicy(policy);
        setShowVersionsModal(true);
    };

    const handleSimulatePolicy = (policy) => {
        setSelectedPolicy(policy);
        setShowSimulateModal(true);
    };

    const handleApprovePolicy = async (policyId) => {
        try {
            setError(null);
            await policyAPI.approve(policyId);
            setSuccess('Policy approved successfully');
            setTimeout(() => setSuccess(null), 3000);
            fetchPolicies();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to approve policy');
        }
    };

    const handleDeletePolicy = async (policyId, policyName) => {
        if (!window.confirm(`Are you sure you want to delete policy "${policyName}"?`)) {
            return;
        }

        try {
            setError(null);
            await policyAPI.delete(policyId);
            setSuccess('Policy deleted successfully');
            setTimeout(() => setSuccess(null), 3000);
            fetchPolicies();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete policy');
        }
    };

    const handleModalSuccess = (message) => {
        setShowModal(false);
        setSuccess(message);
        setTimeout(() => setSuccess(null), 3000);
        fetchPolicies();
    };

    const filteredPolicies = policies.filter(policy => {
        const searchLower = searchTerm.toLowerCase();
        return (
            policy.name?.toLowerCase().includes(searchLower) ||
            policy.description?.toLowerCase().includes(searchLower) ||
            policy.effect?.toLowerCase().includes(searchLower)
        );
    });

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'policy-badge badge-active';
            case 'draft':
                return 'policy-badge badge-draft';
            case 'suspended':
                return 'policy-badge badge-suspended';
            default:
                return 'policy-badge';
        }
    };

    const getEffectBadgeClass = (effect) => {
        switch (effect?.toLowerCase()) {
            case 'allow':
                return 'policy-badge badge-allow';
            case 'deny':
                return 'policy-badge badge-deny';
            default:
                return 'policy-badge';
        }
    };

    const getTypeBadgeClass = (type) => {
        return type?.toLowerCase() === 'system' ? 'policy-badge badge-system' : 'policy-badge';
    };

    if (loading) {
        return <div className="loading">Loading policies...</div>;
    }

    return (
        <div className="policies-container">
            <div className="policies-header">
                <h2>Policy Management</h2>
                <div className="policies-actions">
                    <input
                        type="text"
                        className="search-box"
                        placeholder="Search policies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn-primary" onClick={handleCreatePolicy}>
                        + New Policy
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {filteredPolicies.length === 0 ? (
                <div className="no-policies">
                    <p>No policies found</p>
                    {searchTerm ? (
                        <p>Try adjusting your search terms</p>
                    ) : (
                        <button className="btn-primary" onClick={handleCreatePolicy}>
                            Create Your First Policy
                        </button>
                    )}
                </div>
            ) : (
                <div className="policies-table-container">
                    <table className="policies-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Effect</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Version</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPolicies.map((policy) => (
                                <tr key={policy.id}>
                                    <td>
                                        <div className="policy-name">{policy.name}</div>
                                        {policy.description && (
                                            <div className="policy-description">{policy.description}</div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={getEffectBadgeClass(policy.effect)}>
                                            {policy.effect}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={getTypeBadgeClass(policy.policy_type)}>
                                            {policy.policy_type || 'access'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={getStatusBadgeClass(policy.status)}>
                                            {policy.status}
                                        </span>
                                    </td>
                                    <td>{policy.version}</td>
                                    <td>{new Date(policy.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="policy-actions">
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEditPolicy(policy)}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleViewVersions(policy)}
                                                title="View Versions"
                                            >
                                                📋
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleSimulatePolicy(policy)}
                                                title="Simulate"
                                            >
                                                🧪
                                            </button>
                                            {policy.status !== 'active' && (
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handleApprovePolicy(policy.id)}
                                                    title="Approve"
                                                >
                                                    ✓
                                                </button>
                                            )}
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDeletePolicy(policy.id, policy.name)}
                                                title="Delete"
                                                style={{ color: '#f56565' }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <PolicyModal
                    mode={modalMode}
                    policy={selectedPolicy}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}

            {showVersionsModal && (
                <PolicyVersionsModal
                    policy={selectedPolicy}
                    onClose={() => setShowVersionsModal(false)}
                    onRollback={fetchPolicies}
                />
            )}

            {showSimulateModal && (
                <PolicySimulateModal
                    policy={selectedPolicy}
                    onClose={() => setShowSimulateModal(false)}
                />
            )}
        </div>
    );
};

export default Policies;
