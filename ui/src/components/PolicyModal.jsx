import { useState, useEffect } from 'react';
import policyAPI from '../services/policyAPI';
import '../styles/Policies.css';

const PolicyModal = ({ mode, policy, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        effect: 'allow',
        type: 'access',
        status: 'active',
        policy_document: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [jsonError, setJsonError] = useState(null);

    useEffect(() => {
        if (mode === 'edit' && policy) {
            // Parse document - it might be a string or already parsed
            let documentStr = '';
            if (policy.document) {
                if (typeof policy.document === 'string') {
                    try {
                        // Try to parse and re-stringify for formatting
                        const parsed = JSON.parse(policy.document);
                        documentStr = JSON.stringify(parsed, null, 2);
                    } catch {
                        // If parse fails, use as-is
                        documentStr = policy.document;
                    }
                } else {
                    documentStr = JSON.stringify(policy.document, null, 2);
                }
            }

            setFormData({
                name: policy.name || '',
                description: policy.description || '',
                effect: policy.effect || 'allow',
                type: policy.policy_type || 'access',
                status: policy.status || 'active',
                policy_document: documentStr
            });
        }
    }, [mode, policy]);

    const validateJSON = (jsonString) => {
        if (!jsonString.trim()) {
            setJsonError('Policy document is required');
            return false;
        }

        try {
            const parsed = JSON.parse(jsonString);
            setJsonError(null);
            return parsed;
        } catch (err) {
            setJsonError(`Invalid JSON: ${err.message}`);
            return false;
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Validate JSON in real-time for policy_document
        if (name === 'policy_document') {
            validateJSON(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate JSON
        const parsedDocument = validateJSON(formData.policy_document);
        if (!parsedDocument) {
            return;
        }

        // Basic validation
        if (!formData.name.trim()) {
            setError('Policy name is required');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                name: formData.name,
                description: formData.description,
                effect: formData.effect,
                policy_type: formData.type,
                status: formData.status,
                document: parsedDocument
            };

            if (mode === 'create') {
                await policyAPI.create(payload);
                onSuccess('Policy created successfully');
            } else {
                await policyAPI.update(policy.id, payload);
                onSuccess('Policy updated successfully');
            }
        } catch (err) {
            setError(err.response?.data?.error || `Failed to ${mode} policy`);
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const loadSampleDocument = () => {
        const sample = {
            "Version": "2024-01-01",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "resource:Read",
                        "resource:List",
                        "resource:Write"
                    ],
                    "Resource": [
                        "arn:monkeys:service:region:account:resource/*"
                    ]
                }
            ]
        };
        setFormData(prev => ({
            ...prev,
            policy_document: JSON.stringify(sample, null, 2)
        }));
        setJsonError(null);
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal">
                <div className="modal-header">
                    <h3>{mode === 'create' ? 'Create New Policy' : 'Edit Policy'}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Policy Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g., AllowS3ReadAccess"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="effect">Effect *</label>
                                <select
                                    id="effect"
                                    name="effect"
                                    value={formData.effect}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="allow">Allow</option>
                                    <option value="deny">Deny</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <input
                                type="text"
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Brief description of the policy"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="type">Policy Type *</label>
                                <select
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="access">Access Policy</option>
                                    <option value="resource">Resource Policy</option>
                                    <option value="identity">Identity Policy</option>
                                    <option value="permission">Permission Policy</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="status">Status *</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="policy_document">
                                Policy Document (JSON) *
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={loadSampleDocument}
                                    style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                >
                                    Load Sample
                                </button>
                            </label>
                            <textarea
                                id="policy_document"
                                name="policy_document"
                                value={formData.policy_document}
                                onChange={handleInputChange}
                                required
                                placeholder='{"Version": "2024-01-01", "Statement": [...]}'
                                style={{ fontFamily: 'monospace' }}
                            />
                            {jsonError && (
                                <small style={{ color: '#f56565' }}>{jsonError}</small>
                            )}
                            {!jsonError && formData.policy_document && (
                                <small style={{ color: '#48bb78' }}>✓ Valid JSON</small>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || jsonError}
                        >
                            {loading ? 'Saving...' : mode === 'create' ? 'Create Policy' : 'Update Policy'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PolicyModal;
