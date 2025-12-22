import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = ({ user, onLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '🏢' },
        { path: '/policies', label: 'Policies', icon: '📜' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Monkeys IAM</h2>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <a
                        key={item.path}
                        href={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(item.path);
                        }}
                    >
                        <span className="icon">{item.icon}</span>
                        {item.label}
                    </a>
                ))}
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
