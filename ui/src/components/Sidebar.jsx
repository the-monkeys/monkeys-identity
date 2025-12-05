import React from 'react';
import '../styles/Sidebar.css';

const Sidebar = ({ user, onLogout }) => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Monkeys IAM</h2>
            </div>

            <nav className="sidebar-nav">
                <a href="/dashboard" className="nav-item active">
                    <span className="icon">🏢</span>
                    Dashboard
                </a>
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                    <div className="user-details">
                        <div className="user-name">{user?.display_name}</div>
                        <div className="user-email">{user?.email}</div>
                    </div>
                </div>
                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
