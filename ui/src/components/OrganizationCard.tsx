import React from 'react';
import '../styles/OrganizationCard.css';

const OrganizationCard = ({ organization, onView, onEdit, onDelete }) => {
    return (
        <div className="org-card">
            <div className="org-card-header">
                <h3>{organization.name}</h3>
                <span className={`status-badge ${organization.status}`}>
                    {organization.status}
                </span>
            </div>

            <p className="org-description">{organization.description || 'No description'}</p>

            <div className="org-stats">
                <div className="stat">
                    <span className="stat-label">Slug</span>
                    <span className="stat-value">{organization.slug}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Tier</span>
                    <span className="stat-value">{organization.billing_tier}</span>
                </div>
            </div>

            <div className="org-card-actions">
                <button className="btn-view" onClick={onView}>
                    View Details
                </button>
                <button className="btn-edit" onClick={onEdit}>
                    Edit
                </button>
                <button className="btn-delete" onClick={onDelete}>
                    Delete
                </button>
            </div>
        </div>
    );
};

export default OrganizationCard;
