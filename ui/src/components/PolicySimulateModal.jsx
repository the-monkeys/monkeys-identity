import { useState } from 'react';
import policyAPI from '../services/policyAPI';
import '../styles/Policies.css';

const PolicySimulateModal = ({ policy, onClose }) => {
    const [formData, setFormData] = useState({
        principal: '',
        action: '',
        resource: '',
        context: ''
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [contextError, setContextError] = useState(null);

    const validateContext = (contextString) => {
        if (!contextString.trim()) {
            setContextError(null);
            return {};
        }

        try {
            const parsed = JSON.parse(contextString);
            setContextError(null);
            return parsed;
        } catch (err) {
            setContextError(`Invalid JSON: ${err.message}`);
            return false;
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Validate JSON in real-time for context
        if (name === 'context') {
            validateContext(value);
        }
    };

    const handleSimulate = async (e) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        // Validate context if provided
        let parsedContext = {};
        if (formData.context.trim()) {
            parsedContext = validateContext(formData.context);
            if (parsedContext === false) {
                return;
            }
        }

        // Basic validation
        if (!formData.principal.trim() || !formData.action.trim() || !formData.resource.trim()) {
            setError('Principal, Action, and Resource are required');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                principal: formData.principal,
                action: formData.action,
                resource: formData.resource,
                context: parsedContext
            };

            const response = await policyAPI.simulate(policy.id, payload);
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to simulate policy');
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const loadSampleContext = () => {
        const sample = {
            "aws:RequestedRegion": "us-east-1",
            "aws:CurrentTime": new Date().toISOString(),
            "aws:SecureTransport": "true"
        };
        setFormData(prev => ({
            ...prev,
            context: JSON.stringify(sample, null, 2)
        }));
        setContextError(null);
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Simulate Policy - {policy.name}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSimulate}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <p style={{ marginBottom: '1.5rem', color: '#718096', fontSize: '0.875rem' }}>
                            Test this policy against a specific request to see if it would allow or deny access.
                        </p>

                        <div className="form-group">
                            <label htmlFor="principal">Principal (User/Role ARN) *</label>
                            <input
                                type="text"
                                id="principal"
                                name="principal"
                                value={formData.principal}
                                onChange={handleInputChange}
                                required
                                placeholder="arn:monkeys:iam::account:user/username"
                            />
                            <small>The identity attempting the action</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="action">Action *</label>
                            <input
                                type="text"
                                id="action"
                                name="action"
                                value={formData.action}
                                onChange={handleInputChange}
                                required
                                placeholder="resource:Read"
                            />
                            <small>The action being attempted (e.g., resource:Read, s3:GetObject)</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="resource">Resource ARN *</label>
                            <input
                                type="text"
                                id="resource"
                                name="resource"
                                value={formData.resource}
                                onChange={handleInputChange}
                                required
                                placeholder="arn:monkeys:service:region:account:resource/*"
                            />
                            <small>The resource being accessed</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="context">
                                Context (JSON, Optional)
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={loadSampleContext}
                                    style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                >
                                    Load Sample
                                </button>
                            </label>
                            <textarea
                                id="context"
                                name="context"
                                value={formData.context}
                                onChange={handleInputChange}
                                placeholder='{"aws:RequestedRegion": "us-east-1"}'
                                style={{ fontFamily: 'monospace', minHeight: '120px' }}
                            />
                            {contextError && (
                                <small style={{ color: '#f56565' }}>{contextError}</small>
                            )}
                            {!contextError && formData.context && (
                                <small style={{ color: '#48bb78' }}>✓ Valid JSON</small>
                            )}
                        </div>

                        {result && (
                            <div className="test-case" style={{ marginTop: '1.5rem' }}>
                                <div className="test-case-header">
                                    <h4>Simulation Result</h4>
                                    <span className={
                                        result.decision === 'allow'
                                            ? 'test-case-result result-pass'
                                            : 'test-case-result result-fail'
                                    }>
                                        {result.decision?.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <p><strong>Decision:</strong> {result.decision}</p>
                                    {result.matched_statements && result.matched_statements.length > 0 && (
                                        <p><strong>Matched Statements:</strong> {result.matched_statements.join(', ')}</p>
                                    )}
                                    {result.evaluation_notes && (
                                        <p><strong>Notes:</strong> {result.evaluation_notes}</p>
                                    )}
                                    {result.reason && (
                                        <p><strong>Reason:</strong> {result.reason}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || contextError}
                        >
                            {loading ? 'Simulating...' : 'Run Simulation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PolicySimulateModal;
