import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, Trash2, AlertCircle, Shield, CheckCircle, User, Play, History, RotateCcw } from 'lucide-react';
import { usePolicy, useDeletePolicy, useApprovePolicy, useRollbackPolicy, usePolicyVersions } from '../api/usePolicies';
import { cn } from '@/components/ui/utils';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const PolicyDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { data: policy, isLoading, error } = usePolicy(id || '');
    const [showVersions, setShowVersions] = useState(false);

    const deletePolicyMutation = useDeletePolicy();
    const approvePolicyMutation = useApprovePolicy();
    const rollbackPolicyMutation = useRollbackPolicy();

    const { data: versions, isLoading: isLoadingVersions } = usePolicyVersions(id || '', showVersions);

    const formatDocument = (doc: any) => {
        if (!doc) return '{}';
        if (typeof doc === 'string') {
            try {
                return JSON.stringify(JSON.parse(doc), null, 2);
            } catch (e) {
                return doc;
            }
        }
        return JSON.stringify(doc, null, 2);
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return '—';
        return new Date(dateString).toLocaleString();
    };

    const handleDeleteConfirm = () => {
        if (!id) return;
        deletePolicyMutation.mutate(id, {
            onSuccess: () => {
                setShowDeleteDialog(false);
                navigate('/policies');
            },
        });
    };

    const handleApprove = () => {
        if (!id) return;
        approvePolicyMutation.mutate(id);
    };

    const handleRollback = () => {
        if (!id || !confirm("Are you sure you want to rollback to the previous active version?")) return;
        rollbackPolicyMutation.mutate(id);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !policy) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={32} />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Policy Not Found</h2>
                    <p className="text-gray-400">The policy you're looking for doesn't exist or has been deleted.</p>
                </div>
                <button
                    onClick={() => navigate('/policies')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                    Back to Policies
                </button>
            </div>
        );
    }

    const isAllow = policy.effect?.toLowerCase() === 'allow';

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Breadcrumbs & Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/policies')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Policies</span>
                </button>

                <div className="flex items-center gap-3">
                    {policy.status !== 'active' && policy.effect !== 'deny' && (
                        <button
                            onClick={handleApprove}
                            disabled={approvePolicyMutation.isPending}
                            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg border border-green-500/20 transition-all disabled:opacity-50"
                            title="Approve Policy"
                        >
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">Approve</span>
                        </button>
                    )}
                    {(policy.version > 1) && (
                        <button
                            onClick={handleRollback}
                            disabled={rollbackPolicyMutation.isPending}
                            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-all disabled:opacity-50"
                            title="Rollback to Previous Version"
                        >
                            <RotateCcw size={16} />
                            <span className="text-sm font-medium">Rollback</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowVersions(!showVersions)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                            showVersions
                                ? "bg-primary text-white border-primary"
                                : "bg-slate-800 text-gray-400 hover:text-white border-border-color-dark"
                        )}
                        title="View Policy Versions"
                    >
                        <History size={16} />
                        <span className="text-sm font-medium">History</span>
                    </button>
                    {!policy.is_system_policy && !policy.deleted_at && (
                        <button
                            onClick={() => setShowDeleteDialog(true)}
                            className="p-2.5 bg-slate-800 text-gray-400 hover:text-red-400 rounded-lg border border-border-color-dark transition-all"
                            title="Delete Policy"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Header Content */}
            <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark overflow-hidden shadow-xl">
                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                        <FileText size={48} className="text-amber-400" />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold text-white tracking-tight">{policy.name}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                policy.is_system_policy
                                    ? 'bg-purple-100/10 border-purple-500/30 text-purple-400'
                                    : 'bg-blue-100/10 border-blue-500/30 text-blue-400'
                            )}>
                                {policy.is_system_policy ? 'System Managed' : 'Custom Policy'}
                            </span>
                            {policy.policy_type && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-indigo-100/10 border-indigo-500/30 text-indigo-400">
                                    Type: {policy.policy_type}
                                </span>
                            )}
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                isAllow
                                    ? 'bg-green-100/10 border-green-500/30 text-green-400'
                                    : 'bg-red-100/10 border-red-500/30 text-red-400'
                            )}>
                                Effect: {policy.effect || 'allow'}
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
                                policy.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-400' :
                                    policy.status === 'pending' ? 'bg-yellow-100/10 border-yellow-500/30 text-yellow-400' :
                                        'bg-gray-100/10 border-gray-500/30 text-gray-400'
                            )}>
                                {policy.status === 'active' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                {policy.status || 'active'}
                            </span>
                        </div>

                        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl">
                            {policy.description || 'No description provided for this policy.'}
                        </p>

                        <div className="flex flex-wrap gap-6 pt-2">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Clock size={16} />
                                <span className="text-sm">Created {formatDate(policy.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                                <Clock size={16} />
                                <span className="text-sm">Last updated {formatDate(policy.updated_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                                <Shield size={16} />
                                <span className="text-sm font-mono">v{policy.version || 1}</span>
                            </div>
                            {policy.created_by && (
                                <div className="flex items-center gap-2 text-gray-500" title="Created By">
                                    <User size={16} />
                                    <span className="text-sm">{policy.created_by}</span>
                                </div>
                            )}
                            {policy.approved_by && (
                                <div className="flex items-center gap-2 text-green-500/80" title="Approved By">
                                    <CheckCircle size={16} />
                                    <span className="text-sm">{policy.approved_by} on {formatDate(policy.approved_at!)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText size={18} className="text-primary" />
                        Policy Document
                    </h3>
                </div>

                <div className="bg-[#0f111a] rounded-xl border border-border-color-dark p-6 overflow-x-auto shadow-lg relative group">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>{formatDocument(policy.document)}</code>
                    </pre>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
                <button
                    onClick={() => alert('Simulation UI feature is coming soon!')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-all font-medium whitespace-nowrap"
                >
                    <Play size={16} />
                    Simulate Rules
                </button>
            </div>

            {/* Versions Section */}
            {showVersions && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <History size={18} className="text-primary" />
                            Version History
                        </h3>
                    </div>
                    <div className="bg-[#0f111a] rounded-xl border border-border-color-dark p-6 shadow-lg">
                        {isLoadingVersions ? (
                            <div className="text-center text-gray-400 py-4">Loading version history...</div>
                        ) : versions && versions.length > 0 ? (
                            <div className="space-y-4">
                                {versions.map((ver, idx) => (
                                    <div key={ver.id || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-slate-900 border border-slate-800">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold font-mono">v{ver.version}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                    ver.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-gray-300'
                                                )}>
                                                    {ver.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Created on {formatDate(ver.created_at)}
                                            </div>
                                        </div>
                                        <div className="mt-3 sm:mt-0">
                                            <button
                                                className="text-sm text-primary hover:text-white transition-colors"
                                                onClick={() => alert(`Viewing document for version ${ver.version} is not yet implemented.`)}
                                            >
                                                View Document
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-4 italic">No version history found.</div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Policy"
                message={`Are you sure you want to delete the "${policy.name}" policy?`}
                variant="danger"
                isLoading={deletePolicyMutation.isPending}
            />
        </div>
    );
};

export default PolicyDetailPage;
