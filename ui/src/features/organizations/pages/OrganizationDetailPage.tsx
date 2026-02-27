import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Building, Clock, AlertCircle, Edit3, Trash2, Pause, Play,
    Globe, Plus, X, Hash, Users, Server, FileText, Settings
} from 'lucide-react';
import {
    useOrganization, useDeleteOrganization,
    useOrganizationOrigins, useUpdateOrganizationOrigins,
} from '../api/useOrganizations';
import { cn } from '@/components/ui/utils';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import EditOrganizationModal from '../components/EditOrganizationModal';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

const OrganizationDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newOrigin, setNewOrigin] = useState('');
    const [originError, setOriginError] = useState('');

    const { data: org, isLoading, error } = useOrganization(id || '');
    const deleteOrgMutation = useDeleteOrganization();
    const { data: origins = [], isLoading: originsLoading } = useOrganizationOrigins(id || '');
    const updateOriginsMutation = useUpdateOrganizationOrigins();

    const formatDate = (dateString?: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return '—';
        return new Date(dateString).toLocaleString();
    };

    const handleDeleteConfirm = () => {
        if (!id) return;
        deleteOrgMutation.mutate(id, {
            onSuccess: () => navigate('/organizations'),
        });
    };

    const isValidOrigin = (url: string): boolean => {
        try {
            const u = new URL(url);
            return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname;
        } catch {
            return false;
        }
    };

    const handleAddOrigin = () => {
        const trimmed = newOrigin.trim().replace(/\/+$/, ''); // strip trailing slashes
        if (!trimmed) return;
        if (!isValidOrigin(trimmed)) {
            setOriginError('Must be a valid URL (e.g. https://example.com)');
            return;
        }
        if (origins.includes(trimmed)) {
            setOriginError('This origin already exists');
            return;
        }
        setOriginError('');
        updateOriginsMutation.mutate(
            { id: id!, origins: [...origins, trimmed] },
            { onSuccess: () => setNewOrigin('') },
        );
    };

    const handleRemoveOrigin = (origin: string) => {
        updateOriginsMutation.mutate({
            id: id!,
            origins: origins.filter((o) => o !== origin),
        });
    };

    // --- Loading / Error states ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !org) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Organization Not Found</h2>
                    <p className="text-gray-400">This organization doesn't exist or has been deleted.</p>
                </div>
                <button
                    onClick={() => navigate('/organizations')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Back to Organizations
                </button>
            </div>
        );
    }

    // --- Render ---
    const initials = org.name
        .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Nav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/organizations')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Organizations</span>
                </button>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2.5 bg-slate-800 text-gray-400 hover:text-blue-400 rounded-lg border border-border-color-dark transition-all"
                        title="Edit Organization"
                    >
                        <Edit3 size={18} />
                    </button>
                    {org.status === 'active' ? (
                        <button
                            className="p-2.5 bg-slate-800 text-gray-400 hover:text-yellow-400 rounded-lg border border-border-color-dark transition-all cursor-not-allowed opacity-50"
                            title="Suspend Organization (N/A)"
                            disabled
                        >
                            <Pause size={18} />
                        </button>
                    ) : (
                        <button
                            className="p-2.5 bg-slate-800 text-gray-400 hover:text-green-400 rounded-lg border border-border-color-dark transition-all cursor-not-allowed opacity-50"
                            title="Activate Organization (N/A)"
                            disabled
                        >
                            <Play size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="p-2.5 bg-slate-800 text-gray-400 hover:text-red-400 rounded-lg border border-border-color-dark transition-all"
                        title="Delete Organization"
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
                            <h1 className="text-3xl font-bold text-white tracking-tight">{org.name}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                org.status === 'active'
                                    ? 'bg-green-100/10 border-green-500/30 text-green-400'
                                    : 'bg-yellow-100/10 border-yellow-500/30 text-yellow-400'
                            )}>
                                {org.status}
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                org.billing_tier === 'enterprise' ? 'bg-purple-100/10 border-purple-500/30 text-purple-400' :
                                    org.billing_tier === 'pro' ? 'bg-blue-100/10 border-blue-500/30 text-blue-400' :
                                        'bg-gray-100/10 border-gray-500/30 text-gray-400'
                            )}>
                                {org.billing_tier}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-6 text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                                <Hash size={14} />
                                <span className="font-mono text-xs">{org.slug}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={14} />
                                <span>Max {org.max_users} users</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Server size={14} />
                                <span>Max {org.max_resources} resources</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={14} />
                                <span>Created {formatDate(org.created_at)}</span>
                            </div>
                        </div>

                        {org.description && (
                            <p className="text-gray-400 text-sm mt-2">{org.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Organization Info */}
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Building size={16} className="text-primary" />
                        Organization Details
                    </h3>
                    <dl className="space-y-3 text-sm">
                        {[
                            { label: 'Organization ID', value: org.id, mono: true },
                            { label: 'Name', value: org.name },
                            { label: 'Slug', value: org.slug, mono: true },
                            { label: 'Parent ID', value: org.parent_id || '—', mono: !!org.parent_id },
                            { label: 'Billing Tier', value: org.billing_tier },
                            { label: 'Max Users', value: String(org.max_users) },
                            { label: 'Max Resources', value: String(org.max_resources) },
                            { label: 'Status', value: org.status },
                            { label: 'Created', value: formatDate(org.created_at) },
                            { label: 'Updated', value: formatDate(org.updated_at) },
                            { label: 'Deleted', value: org.deleted_at ? formatDate(org.deleted_at) : '—' },
                        ].map(({ label, value, mono }) => (
                            <div key={label} className="flex justify-between items-start gap-4">
                                <dt className="text-gray-500 shrink-0">{label}</dt>
                                <dd className={cn("text-gray-200 text-right break-all", mono && "font-mono text-[11px] text-gray-400")}>
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Metadata & Settings */}
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <FileText size={16} className="text-primary" />
                            Metadata
                        </h3>
                        <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-auto max-h-40 border border-border-color-dark">
                            {org.metadata ? (() => { try { return JSON.stringify(JSON.parse(org.metadata), null, 2); } catch { return org.metadata; } })() : '{}'}
                        </pre>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Settings size={16} className="text-primary" />
                            Settings
                        </h3>
                        <pre className="bg-slate-900 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-auto max-h-40 border border-border-color-dark">
                            {org.settings ? (() => { try { return JSON.stringify(JSON.parse(org.settings), null, 2); } catch { return org.settings; } })() : '{}'}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Origins CORS Management */}
            <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Globe size={16} className="text-primary" />
                        Allowed CORS Origins
                    </h3>
                    <span className="text-xs text-gray-500">
                        {originsLoading ? 'Loading…' : `${origins.length} origin${origins.length !== 1 ? 's' : ''}`}
                    </span>
                </div>

                <p className="text-xs text-gray-500">
                    Origins that are allowed to make cross-origin requests to the API on behalf of this organization.
                    Changes take effect immediately — no restarts required.
                </p>

                {/* Add origin */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newOrigin}
                        onChange={(e) => { setNewOrigin(e.target.value); setOriginError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOrigin(); } }}
                        placeholder="https://example.com"
                        className="flex-1 px-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg focus:outline-none focus:border-primary transition-all text-sm text-gray-200 placeholder-gray-500 font-mono"
                    />
                    <button
                        onClick={handleAddOrigin}
                        disabled={updateOriginsMutation.isPending || !newOrigin.trim()}
                        className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Plus size={14} /> Add
                    </button>
                </div>
                {originError && (
                    <p className="text-xs text-red-400">{originError}</p>
                )}

                {/* Error banner */}
                {updateOriginsMutation.isError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {extractErrorMessage(updateOriginsMutation.error, 'Failed to update origins')}
                    </div>
                )}

                {/* Origins list */}
                {originsLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    </div>
                ) : origins.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No CORS origins configured. Add one above.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {origins.map((origin) => (
                            <li
                                key={origin}
                                className="flex items-center justify-between px-4 py-2.5 bg-slate-900 rounded-lg border border-border-color-dark group"
                            >
                                <span className="font-mono text-sm text-gray-300">{origin}</span>
                                <button
                                    onClick={() => handleRemoveOrigin(origin)}
                                    disabled={updateOriginsMutation.isPending}
                                    className="p-1.5 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-20"
                                    title="Remove origin"
                                >
                                    <X size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Organization"
                message={`Are you sure you want to permanently delete "${org.name}"? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteOrgMutation.isPending}
            />
            {showEditModal && (
                <EditOrganizationModal
                    organization={org}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => setShowEditModal(false)}
                />
            )}
        </div>
    );
};

export default OrganizationDetailPage;
