import { useState, useMemo } from 'react';
import { Search, Monitor, Smartphone, Globe, XCircle, AlertCircle, Clock, Activity, Shield, RefreshCw, LogOut, User } from 'lucide-react';
import { useSessions, useRevokeSession, useExtendSession, useCurrentSession, useRevokeCurrentSession, Session } from '../api/useSessions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';

const SessionsMonitoring = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [showRevokeCurrentDialog, setShowRevokeCurrentDialog] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    const { data: sessions = [], isLoading, error } = useSessions();
    const { data: currentSession } = useCurrentSession();
    const revokeSessionMutation = useRevokeSession();
    const revokeCurrentMutation = useRevokeCurrentSession();
    const extendSessionMutation = useExtendSession();

    const filteredSessions = useMemo(() => {
        if (!searchQuery) return sessions;
        const lowerQuery = searchQuery.toLowerCase();
        return sessions.filter((s: Session) =>
            s.ip_address?.toLowerCase().includes(lowerQuery) ||
            s.user_agent?.toLowerCase().includes(lowerQuery) ||
            s.username?.toLowerCase().includes(lowerQuery) ||
            s.email?.toLowerCase().includes(lowerQuery)
        );
    }, [sessions, searchQuery]);

    const handleRevokeClick = (session: Session) => {
        setSelectedSession(session);
        setShowRevokeDialog(true);
    };

    const handleRevokeConfirm = () => {
        if (!selectedSession) return;
        revokeSessionMutation.mutate(selectedSession.id, {
            onSuccess: () => setShowRevokeDialog(false),
        });
    };

    const handleExtend = (session: Session, e: React.MouseEvent) => {
        e.stopPropagation();
        extendSessionMutation.mutate(session.id);
    };

    const handleRevokeCurrentConfirm = () => {
        revokeCurrentMutation.mutate(undefined, {
            onSuccess: () => setShowRevokeCurrentDialog(false),
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z' || dateString === '0001-01-01T00:00:00.000Z') return '—';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '—';

        return d.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const getDeviceIcon = (userAgent: string) => {
        if (!userAgent) return <Globe size={16} className="text-gray-400" />;
        const ua = userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone size={16} className="text-blue-400" />;
        }
        return <Monitor size={16} className="text-green-400" />;
    };

    const getBrowserName = (userAgent: string) => {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    };

    const isActive = (s: Session) => s.status === 'active';
    const activeSessions = sessions.filter(isActive);
    const expiredSessions = sessions.filter((s: Session) => !isActive(s));

    const columns: Column<Session>[] = [
        {
            header: 'Device',
            cell: (s) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700/50">
                        {getDeviceIcon(s.user_agent)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-200 text-sm">{getBrowserName(s.user_agent)}</span>
                        <span className="text-[11px] text-gray-500 line-clamp-1 max-w-[200px]">{s.user_agent?.slice(0, 50) || 'Unknown device'}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'User',
            cell: (s) => (
                <div className="flex flex-col">
                    <span className="text-sm text-gray-300">{s.username || s.principal_id?.slice(0, 8)}</span>
                    <span className="text-[11px] text-gray-500">{s.email || s.principal_type || ''}</span>
                </div>
            ),
            className: 'hidden md:table-cell'
        },
        {
            header: 'IP Address',
            cell: (s) => (
                <span className="font-mono text-xs text-gray-400">{s.ip_address || '—'}</span>
            ),
        },
        {
            header: 'Status',
            cell: (s) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border flex items-center gap-1 w-fit",
                    isActive(s)
                        ? 'bg-green-100/10 border-green-500/30 text-green-400'
                        : 'bg-gray-100/10 border-gray-500/30 text-gray-500'
                )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isActive(s) ? 'bg-green-400' : 'bg-gray-500')} />
                    {s.status || (isActive(s) ? 'Active' : 'Expired')}
                </span>
            ),
        },
        {
            header: 'Last Activity',
            cell: (s) => <span className="text-xs text-gray-500">{formatDate(s.last_used_at)}</span>,
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Expires',
            cell: (s) => <span className="text-xs text-gray-500">{formatDate(s.expires_at)}</span>,
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (s) => (
                <div className="flex items-center gap-2 justify-end">
                    {/* Extend Session */}
                    <button
                        id={`extend-session-${s.id}`}
                        onClick={(e) => handleExtend(s, e)}
                        disabled={!isActive(s) || extendSessionMutation.isPending}
                        title="Extend Session"
                        className={cn(
                            "px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                            isActive(s)
                                ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                                : 'opacity-30 cursor-not-allowed text-gray-500'
                        )}
                    >
                        <RefreshCw size={11} /> Extend
                    </button>
                    {/* Revoke Session */}
                    <button
                        id={`revoke-session-${s.id}`}
                        onClick={(e) => { e.stopPropagation(); handleRevokeClick(s); }}
                        disabled={!isActive(s)}
                        title="Revoke Session"
                        className={cn(
                            "px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                            isActive(s)
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                : 'opacity-30 cursor-not-allowed text-gray-500'
                        )}
                    >
                        <XCircle size={11} /> Revoke
                    </button>
                </div>
            )
        }
    ];

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>Failed to load sessions</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Session Monitoring</h1>
                    <p className="text-sm text-gray-400">Monitor active sessions, track devices, and revoke suspicious access</p>
                </div>
                {/* Revoke Current Session */}
                <button
                    id="revoke-current-session-btn"
                    onClick={() => setShowRevokeCurrentDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                    title="Revoke your current session (logout)"
                >
                    <LogOut size={14} /> Revoke Current Session
                </button>
            </div>

            {/* Current Session Info */}
            {currentSession && (
                <div className="bg-bg-card-dark rounded-xl border border-blue-500/20 p-4 flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 mt-0.5">
                        <User size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-300">Your Current Session</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs text-gray-400">
                            <div><span className="text-gray-500">ID:</span> {currentSession.id?.slice(0, 8)}...</div>
                            <div><span className="text-gray-500">IP:</span> {currentSession.ip_address || '—'}</div>
                            <div><span className="text-gray-500">Issued:</span> {formatDate(currentSession.issued_at)}</div>
                            <div><span className="text-gray-500">Expires:</span> {formatDate(currentSession.expires_at)}</div>
                        </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-100/10 border border-green-500/30 text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Active
                    </span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10"><Activity size={20} className="text-green-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{activeSessions.length}</p>
                        <p className="text-xs text-gray-400">Active Sessions</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gray-500/10"><Clock size={20} className="text-gray-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{expiredSessions.length}</p>
                        <p className="text-xs text-gray-400">Expired / Revoked</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10"><Monitor size={20} className="text-blue-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{sessions.length}</p>
                        <p className="text-xs text-gray-400">Total Sessions</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10"><Shield size={20} className="text-purple-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">
                            {new Set(sessions.map((s: Session) => s.ip_address)).size}
                        </p>
                        <p className="text-xs text-gray-400">Unique IPs</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by IP, device, user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredSessions}
                keyExtractor={(s) => s.id}
                isLoading={isLoading}
                emptyMessage="No sessions found."
            />

            {/* Revoke Session Dialog */}
            <ConfirmDialog
                isOpen={showRevokeDialog}
                onClose={() => setShowRevokeDialog(false)}
                onConfirm={handleRevokeConfirm}
                title="Revoke Session"
                message={`Are you sure you want to revoke this session from ${selectedSession?.ip_address || 'unknown IP'}? The user will be logged out.`}
                variant="danger"
                confirmText="Revoke"
                isLoading={revokeSessionMutation.isPending}
            />

            {/* Revoke Current Session Dialog */}
            <ConfirmDialog
                isOpen={showRevokeCurrentDialog}
                onClose={() => setShowRevokeCurrentDialog(false)}
                onConfirm={handleRevokeCurrentConfirm}
                title="Revoke Current Session"
                message="Are you sure you want to revoke your current session? You will be logged out immediately."
                variant="danger"
                confirmText="Logout & Revoke"
                isLoading={revokeCurrentMutation.isPending}
            />
        </div>
    );
};

export default SessionsMonitoring;
