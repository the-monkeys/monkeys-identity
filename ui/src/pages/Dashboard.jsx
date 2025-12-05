import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { organizationAPI } from '../services/api';
import Sidebar from '../components/Sidebar';
import OrganizationCard from '../components/OrganizationCard';
import OrganizationModal from '../components/OrganizationModal';
import '../styles/Dashboard.css';

const Dashboard = () => {
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const response = await organizationAPI.list();
            setOrganizations(response.data.data.items || []);
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedOrg(null);
        setShowModal(true);
    };

    const handleEdit = (org) => {
        setSelectedOrg(org);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this organization?')) return;

        try {
            await organizationAPI.delete(id);
            fetchOrganizations();
        } catch (error) {
            alert('Failed to delete organization');
        }
    };

    const handleSave = async (data) => {
        try {
            if (selectedOrg) {
                await organizationAPI.update(selectedOrg.id, data);
            } else {
                await organizationAPI.create(data);
            }
            setShowModal(false);
            fetchOrganizations();
        } catch (error) {
            alert('Failed to save organization');
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard-layout">
            <Sidebar user={user} onLogout={logout} />

            <main className="dashboard-main">
                <div className="org-header-row">
                    <div>
                        <h1>Organizations</h1>
                        <p>Manage all organizations in the system</p>
                    </div>
                    <button className="btn" onClick={handleCreate}>
                        + New Organization
                    </button>
                </div>

                <div className="organizations-grid">
                    {organizations.map((org) => (
                        <OrganizationCard
                            key={org.id}
                            organization={org}
                            onView={() => navigate(`/organizations/${org.id}`)}
                            onEdit={() => handleEdit(org)}
                            onDelete={() => handleDelete(org.id)}
                        />
                    ))}
                </div>

                {organizations.length === 0 && (
                    <div className="empty-state">
                        <p>No organizations found</p>
                        <button className="btn" onClick={handleCreate}>
                            Create your first organization
                        </button>
                    </div>
                )}
            </main>

            {showModal && (
                <OrganizationModal
                    organization={selectedOrg}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default Dashboard;
