import React from 'react';
import { Users, Building2, ShieldCheck, Activity } from 'lucide-react';

export default function Dashboard({ onViewChange, user }) {
    const stats = [
        { label: 'Total Users', value: '12', icon: Users, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
        { label: 'Active Organizations', value: '3', icon: Building2, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
        { label: 'System Status', value: 'Healthy', icon: Activity, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
        { label: 'Your Role', value: user?.role || 'User', icon: ShieldCheck, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
    ];

    return (
        <div className="p-8 animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.display_name || user?.username}!</h1>
            <p className="text-muted mb-8">Here's what's happening in your IAM system today.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="card p-6 flex items-center gap-4 hover:border-light transition-colors cursor-default">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: stat.bg, color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6">
                    <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => onViewChange('users')} className="p-4 rounded-lg bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-left transition-colors group">
                            <Users className="mb-2 text-[#6366f1] group-hover:scale-110 transition-transform" />
                            <div className="font-medium">Manage Users</div>
                            <div className="text-xs text-muted">Add, edit, or remove users</div>
                        </button>
                        <button onClick={() => onViewChange('organizations')} className="p-4 rounded-lg bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-left transition-colors group">
                            <Building2 className="mb-2 text-[#8b5cf6] group-hover:scale-110 transition-transform" />
                            <div className="font-medium">Organizations</div>
                            <div className="text-xs text-muted">Manage tenant settings</div>
                        </button>
                    </div>
                </div>

                <div className="card p-6">
                    <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
                                <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                                <div className="flex-1">
                                    <p className="text-sm">User login successful</p>
                                    <p className="text-xs text-muted">2 minutes ago • 127.0.0.1</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
