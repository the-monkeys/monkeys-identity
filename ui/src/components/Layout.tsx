import React from 'react';
import { LayoutDashboard, Users, Building2, Settings, LogOut, Code, Shield } from 'lucide-react';

export default function Layout({ children, currentView, onViewChange, onLogout, user }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'organizations', label: 'Organizations', icon: Building2 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
            {/* Sidebar with Glassmorphism */}
            <aside className="w-64 flex flex-col glass z-10 transition-all duration-300">
                <div className="p-6 flex items-center gap-3 border-b border-[var(--border)] bg-gradient-to-r from-transparent to-white/5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                        M
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-none tracking-tight">Monkeys IAM</h1>
                        <span className="text-xs text-muted font-mono">v1.0.0</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onViewChange(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-white border border-indigo-500/20 shadow-sm'
                                    : 'text-muted hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
                                <span className={`font-medium ${isActive ? 'translate-x-1' : ''} transition-transform`}>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-sm font-bold text-[var(--text)]">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.display_name || 'User'}</p>
                            <p className="text-xs text-muted truncate">{user?.role || 'Member'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-red-500/10 rounded-md transition-colors"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[var(--bg)]">
                {children}
            </main>
        </div>
    );
}
