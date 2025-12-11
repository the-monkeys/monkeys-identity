import { useState, useEffect } from 'react';

export default function Dashboard({ token, onLogout }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/v1/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    onLogout();
                    return;
                }
                throw new Error('Failed to fetch users');
            }

            const data = await res.json();
            setUsers(data.users || []); // Assuming API returns { users: [...] }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem' }}>
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl">Dashboard</h1>
                    <p className="text-muted">Manage your users and organizations.</p>
                </div>
                <button onClick={onLogout} className="btn">Sign Out</button>
            </header>

            {error && <div className="p-4 mb-4" style={{ color: 'var(--error)' }}>{error}</div>}

            <div className="card">
                <div className="p-4 border-bottom flex justify-between items-center">
                    <h2 className="text-xl">Users</h2>
                    <button className="btn btn-primary text-sm" onClick={() => alert('Feature coming soon')}>Add User</button>
                </div>

                {loading ? (
                    <div className="p-6 text-center text-muted">Loading users...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td><span className="text-muted text-sm">{user.id.substring(0, 8)}...</span></td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: 24, height: 24, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                                    {user.email[0].toUpperCase()}
                                                </div>
                                                {user.email}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                background: user.role === 'admin' ? 'var(--primary)' : 'var(--bg-input)',
                                                borderRadius: 4,
                                                fontSize: '0.75rem',
                                                opacity: 0.8
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="text-muted text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center p-6 text-muted">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
