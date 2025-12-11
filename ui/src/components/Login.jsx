import { useState } from 'react';

export default function Login({ onLogin }) {
    const [mode, setMode] = useState('login'); // 'login', 'register', 'create-admin'
    const [email, setEmail] = useState('admin@monkeys.com');
    const [password, setPassword] = useState('password');
    const [username, setUsername] = useState('admin');
    const [displayName, setDisplayName] = useState('System Admin');
    const [organizationId, setOrganizationId] = useState('00000000-0000-4000-8000-000000000001'); // Default from seed

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        let url = '/api/v1/auth/login';
        let body = { email, password };

        if (mode === 'register') {
            url = '/api/v1/auth/register';
            body = {
                email,
                password,
                username,
                display_name: displayName,
                organization_id: organizationId
            };
        } else if (mode === 'create-admin') {
            url = '/api/v1/auth/create-admin';
            body = {
                email,
                password,
                username,
                display_name: displayName,
                // organization_id is optional for create-admin but good to have if we want to assign them somewhere
                organization_id: organizationId
            };
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Action failed');
            }

            if (mode === 'login') {
                onLogin(data.data.access_token);
            } else {
                setSuccess(data.message || 'Account created successfully! Please login.');
                // Switch to login mode after success (optional, or just let them switch)
                setTimeout(() => {
                    setMode('login');
                    setSuccess(null); // Clear success message when switching
                }, 2000);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
            <div className="card p-6" style={{ width: '100%', maxWidth: '400px' }}>
                <h1 className="text-2xl mb-4 text-center">Monkeys IAM</h1>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 justify-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <button
                        className={`btn ${mode === 'login' ? 'btn-primary' : ''}`}
                        onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        Login
                    </button>
                    <button
                        className={`btn ${mode === 'register' ? 'btn-primary' : ''}`}
                        onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        Register
                    </button>
                    <button
                        className={`btn ${mode === 'create-admin' ? 'btn-primary' : ''}`}
                        onClick={() => { setMode('create-admin'); setError(null); setSuccess(null); }}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                        Create Admin
                    </button>
                </div>

                <p className="text-muted text-center mb-4">
                    {mode === 'login' && 'Sign in to your account'}
                    {mode === 'register' && 'Create a new user account'}
                    {mode === 'create-admin' && 'Bootstrap a new admin account'}
                </p>

                {error && (
                    <div className="p-4 mb-4" style={{ background: 'var(--error)', borderRadius: 'var(--radius)', color: 'white' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 mb-4" style={{ background: 'var(--success)', borderRadius: 'var(--radius)', color: 'white' }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                    {(mode === 'register' || mode === 'create-admin') && (
                        <>
                            <div>
                                <label className="text-sm text-muted">Username</label>
                                <input
                                    className="input mt-1"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Display Name</label>
                                <input
                                    className="input mt-1"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Organization ID (UUID)</label>
                                <input
                                    className="input mt-1"
                                    type="text"
                                    value={organizationId}
                                    onChange={(e) => setOrganizationId(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-sm text-muted">Email</label>
                        <input
                            className="input mt-1"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm text-muted">Password</label>
                        <input
                            className="input mt-1"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
                        {loading ? 'Processing...' : (
                            mode === 'login' ? 'Sign In' : (mode === 'register' ? 'Register' : 'Create Admin')
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
