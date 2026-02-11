import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User as UserIcon, Mail, Clock, Shield, ShieldCheck, ShieldOff,
    AlertCircle, Edit3, Trash2, Pause, Play
} from 'lucide-react';
import { useUser, useDeleteUser, useSuspendUser, useActivateUser } from '../api/useUsers';
import { cn } from '@/components/ui/utils';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import EditUserModal from '../components/EditUserModal';

const UserDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSuspendDialog, setShowSuspendDialog] = useState(false);
    const [showActivateDialog, setShowActivateDialog] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const { data: user, isLoading, error } = useUser(id || '');
    const deleteUserMutation = useDeleteUser();
    const suspendUserMutation = useSuspendUser();
    const activateUserMutation = useActivateUser();

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return '—';
        return new Date(dateString).toLocaleString();
    };

    const handleDeleteConfirm = () => {
        if (!id) return;
        deleteUserMutation.mutate(id, {
            onSuccess: () => navigate('/users'),
        });
    };

    const handleSuspendConfirm = () => {
        if (!id) return;
        suspendUserMutation.mutate({ id, reason: 'Suspended by admin' }, {
            onSuccess: () => setShowSuspendDialog(false),
        });
    };

    const handleActivateConfirm = () => {
        if (!id) return;
        activateUserMutation.mutate(id, {
            onSuccess: () => setShowActivateDialog(false),
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">User Not Found</h2>
                    <p className="text-gray-400">This user doesn't exist or has been deleted.</p>
                </div>
                <button
                    onClick={() => navigate('/users')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Back to Users
                </button>
            </div>
        );
    }

    const initials = (user.display_name || user.username || '??')
        .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Nav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/users')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Users</span>
                </button>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2.5 bg-slate-800 text-gray-400 hover:text-blue-400 rounded-lg border border-border-color-dark transition-all"
                        title="Edit User"
                    >
                        <Edit3 size={18} />
                    </button>
                    {user.status === 'active' ? (
                        <button
                            onClick={() => setShowSuspendDialog(true)}
                            className="p-2.5 bg-slate-800 text-gray-400 hover:text-yellow-400 rounded-lg border border-border-color-dark transition-all"
                            title="Suspend User"
                        >
                            <Pause size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowActivateDialog(true)}
                            className="p-2.5 bg-slate-800 text-gray-400 hover:text-green-400 rounded-lg border border-border-color-dark transition-all"
                            title="Activate User"
                        >
                            <Play size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="p-2.5 bg-slate-800 text-gray-400 hover:text-red-400 rounded-lg border border-border-color-dark transition-all"
                        title="Delete User"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Hero Card */}
            <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark overflow-hidden shadow-xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-bold flex-shrink-0">
                        {initials}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-white tracking-tight">{user.display_name || user.username}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                user.status === 'active'
                                    ? 'bg-green-100/10 border-green-500/30 text-green-400'
                                    : user.status === 'suspended'
                                        ? 'bg-yellow-100/10 border-yellow-500/30 text-yellow-400'
                                        : 'bg-gray-100/10 border-gray-500/30 text-gray-400'
                            )}>
                                {user.status}
                            </span>
                            {user.email_verified && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-blue-100/10 border-blue-500/30 text-blue-400">
                                    Verified
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-6 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail size={14} />
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserIcon size={14} />
                                <span>@{user.username}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={14} />
                                <span>Last login: {formatDate(user.last_login)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Account Info */}
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <UserIcon size={16} className="text-primary" />
                        Account Information
                    </h3>
                    <dl className="space-y-3 text-sm">
                        {[
                            { label: 'User ID', value: user.id, mono: true },
                            { label: 'Organization ID', value: user.organization_id, mono: true },
                            { label: 'Username', value: user.username },
                            { label: 'Display Name', value: user.display_name },
                            { label: 'Failed Login Attempts', value: String(user.failed_login_attempts ?? 0) },
                            { label: 'Account Created', value: formatDate(user.created_at) },
                            { label: 'Last Updated', value: formatDate(user.updated_at) },
                        ].map(({ label, value, mono }) => (
                            <div key={label} className="flex justify-between items-start gap-4">
                                <dt className="text-gray-500 shrink-0">{label}</dt>
                                <dd className={cn("text-gray-200 text-right break-all", mono && "font-mono text-[11px] text-gray-400")}>
                                    {value || '—'}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Security Info */}
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Shield size={16} className="text-primary" />
                        Security
                    </h3>
                    <dl className="space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <dt className="text-gray-500">Email Verified</dt>
                            <dd>
                                {user.email_verified
                                    ? <span className="flex items-center gap-1.5 text-green-400"><ShieldCheck size={14} /> Verified</span>
                                    : <span className="flex items-center gap-1.5 text-yellow-400"><ShieldOff size={14} /> Not Verified</span>
                                }
                            </dd>
                        </div>
                        <div className="flex items-center justify-between">
                            <dt className="text-gray-500">Two-Factor Auth (MFA)</dt>
                            <dd>
                                {user.mfa_enabled
                                    ? <span className="flex items-center gap-1.5 text-green-400"><ShieldCheck size={14} /> Enabled</span>
                                    : <span className="flex items-center gap-1.5 text-gray-400"><ShieldOff size={14} /> Disabled</span>
                                }
                            </dd>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                            <dt className="text-gray-500">Password Changed</dt>
                            <dd className="text-gray-200">{formatDate(user.password_changed_at)}</dd>
                        </div>
                        {user.locked_until && user.locked_until !== '0001-01-01T00:00:00Z' && (
                            <div className="flex justify-between items-start gap-4">
                                <dt className="text-gray-500">Locked Until</dt>
                                <dd className="text-yellow-400">{formatDate(user.locked_until)}</dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete User"
                message={`Are you sure you want to permanently delete "${user.username}"? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteUserMutation.isPending}
            />
            <ConfirmDialog
                isOpen={showSuspendDialog}
                onClose={() => setShowSuspendDialog(false)}
                onConfirm={handleSuspendConfirm}
                title="Suspend User"
                message={`Are you sure you want to suspend "${user.username}"? They will not be able to log in.`}
                variant="danger"
                confirmText="Suspend"
                isLoading={suspendUserMutation.isPending}
            />
            <ConfirmDialog
                isOpen={showActivateDialog}
                onClose={() => setShowActivateDialog(false)}
                onConfirm={handleActivateConfirm}
                title="Activate User"
                message={`Activate "${user.username}"? They will be able to log in again.`}
                variant="info"
                confirmText="Activate"
                isLoading={activateUserMutation.isPending}
            />
            {showEditModal && (
                <EditUserModal
                    user={user}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => setShowEditModal(false)}
                />
            )}
        </div>
    );
};

export default UserDetailPage;
