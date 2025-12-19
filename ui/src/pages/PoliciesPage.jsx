import React from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Policies from '../components/Policies';
import '../styles/Dashboard.css';

const PoliciesPage = () => {
    const { user, logout } = useAuth();

    return (
        <div className="dashboard-layout">
            <Sidebar user={user} onLogout={logout} />

            <main className="dashboard-main">
                <Policies />
            </main>
        </div>
    );
};

export default PoliciesPage;
