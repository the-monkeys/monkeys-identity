import { useState, useEffect } from 'react';
import policyAPI from '../services/policyAPI';
import '../styles/Policies.css';

const PolicyVersionsModal = ({ policy, onClose, onRollback }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVersion, setSelectedVersion] = useState(null);
    const [showDocument, setShowDocument] = useState(false);

    useEffect(() => {
        fetchVersions();
    }, []);

    const fetchVersions = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await policyAPI.getVersions(policy.id);
            setVersions(response.data.versions || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch policy versions');
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (version) => {
        if (!window.confirm(`Are you sure you want to rollback to version ${version}?`)) {
            return;
        }

        try {
            setError(null);
            await policyAPI.rollback(policy.id, version);
            alert(`Successfully rolled back to version ${version}`);
            onRollback();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to rollback policy');
        }
    };

    const handleViewDocument = (versionData) => {
        setSelectedVersion(versionData);
        setShowDocument(true);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            if (showDocument) {
                setShowDocument(false);
            } else {
                onClose();
            }
        }
    };

    if (showDocument && selectedVersion) {
        // Parse document if it's a string
        let documentToShow = selectedVersion.document;
        if (typeof documentToShow === 'string') {
            try {
                documentToShow = JSON.parse(documentToShow);
            } catch {
                // Keep as string if parse fails
            }
        }

        return (
            <div className="modal-overlay" onClick={handleOverlayClick}>
                <div className="modal">
                    <div className="modal-header">
                        <h3>Policy Document - Version {selectedVersion.version}</h3>
                        <button className="modal-close" onClick={() => setShowDocument(false)}>✕</button>
                    </div>
                    <div className="modal-body">
                        <div className="json-viewer">
                            <pre>{typeof documentToShow === 'string' ? documentToShow : JSON.stringify(documentToShow, null, 2)}</pre>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn-secondary" onClick={() => setShowDocument(false)}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Policy Versions - {policy.name}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    {loading ? (
                        <div className="loading">Loading versions...</div>
                    ) : versions.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#718096' }}>
                            No version history available
                        </p>
                    ) : (
                        <ul className="policy-version-list">
                            {versions.map((version) => (
                                <li key={version.version} className="policy-version-item">
                                    <div className="version-info">
                                        <h4>Version {version.version}</h4>
                                        <p>
                                            Created: {new Date(version.created_at).toLocaleString()}
                                            {version.created_by && ` by ${version.created_by}`}
                                        </p>
                                        {version.change_description && (
                                            <p style={{ marginTop: '0.25rem' }}>
                                                {version.change_description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="version-actions">
                                        <button
                                            className="btn-secondary"
                                            onClick={() => handleViewDocument(version)}
                                        >
                                            View Document
                                        </button>
                                        {version.version !== policy.version && (
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleRollback(version.version)}
                                            >
                                                Rollback
                                            </button>
                                        )}
                                        {version.version === policy.version && (
                                            <span className="policy-badge badge-active">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PolicyVersionsModal;
