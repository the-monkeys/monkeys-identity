
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useResource, useResourcePermissions, useShareResource, useUnshareResource, useResourceAccessLog } from '../api/resources';
import { ArrowLeft, Box, Shield, Users, Clock, AlertCircle, Share2, Trash2, FileText, Calendar } from 'lucide-react';
import { cn } from '@/components/ui/utils';

const ResourceDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: resource, isLoading: isResourceLoading, error: resourceError } = useResource(id!);
    const { data: permissions, isLoading: isPermsLoading } = useResourcePermissions(id!);
    const { data: accessLogs, isLoading: isLogsLoading } = useResourceAccessLog(id!);

    const shareMutation = useShareResource();
    const unshareMutation = useUnshareResource();

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareForm, setShareForm] = useState({
        principal_id: '',
        principal_type: 'user',
        access_level: 'read',
        expires_at: ''
    });

    const handleShareSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Append ISO time format if date is selected
        const payload = { ...shareForm };
        if (payload.expires_at) {
            payload.expires_at = new Date(payload.expires_at).toISOString();
        }

        shareMutation.mutate({ id: id!, data: payload }, {
            onSuccess: () => {
                setIsShareModalOpen(false);
                setShareForm({ principal_id: '', principal_type: 'user', access_level: 'read', expires_at: '' });
            }
        });
    };

    const handleUnshare = (principalId: string, principalType: string) => {
        if (confirm('Are you sure you want to remove this permission?')) {
            unshareMutation.mutate({ id: id!, data: { principal_id: principalId, principal_type: principalType } });
        }
    };

    if (isResourceLoading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    if (resourceError || !resource) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>Resource not found</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/resources')}
                className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={16} className="mr-1" /> Back to Resources
            </button>

            {/* Header */}
            <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <Box size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">{resource.name}</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-400 font-mono">
                                <span>{resource.arn}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span className="uppercase text-xs font-bold text-blue-400">{resource.type}</span>
                            </div>
                        </div>
                    </div>
                    <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase border",
                        resource.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' : 'bg-gray-100/10 text-gray-500'
                    )}>
                        {resource.status}
                    </span>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Owner</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-200 font-medium">{resource.owner_type}</span>
                            <span className="text-xs text-gray-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{resource.owner_id}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Created At</p>
                        <div className="flex items-center gap-2 text-gray-200">
                            <Clock size={14} />
                            <span className="text-sm">{new Date(resource.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-bold text-gray-500 mb-1">Last Updated</p>
                        <span className="text-sm text-gray-200">{new Date(resource.updated_at).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Permission Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Attributes / Metadata */}
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Box size={18} className="text-purple-400" />
                        Attributes & Tags
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-500 mb-2">Attributes (JSON)</p>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-green-400 overflow-x-auto">
                                {resource.attributes ? JSON.stringify(JSON.parse(resource.attributes), null, 2) : '{}'}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs uppercase font-bold text-gray-500 mb-2">Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {/* Parsing tags if string, or display placeholder */}
                                {resource.tags && resource.tags !== "{}" ? (
                                    Object.entries(JSON.parse(resource.tags)).map(([k, v]) => (
                                        <span key={k} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-gray-300">
                                            <span className="text-gray-500">{k}:</span> {String(v)}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-500 italic">No tags</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACL / Permissions */}
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Shield size={18} className="text-amber-400" />
                            Access Control
                        </h2>
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded hover:bg-primary/30 flex items-center gap-1.5 transition-colors font-medium border border-primary/20"
                        >
                            <Share2 size={12} /> Share
                        </button>
                    </div>

                    {isPermsLoading ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-10 bg-slate-800 rounded"></div>
                            <div className="h-10 bg-slate-800 rounded"></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {permissions && permissions.length > 0 ? (
                                permissions.map((perm: any) => (
                                    <div key={perm.id} className="group flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded bg-slate-700">
                                                <Users size={14} className="text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-200">{perm.principal_type === 'user' ? 'User' : 'Group'}</p>
                                                <p className="text-xs text-gray-500 font-mono">{perm.principal_id.substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                {perm.permission_level || perm.permission || 'Custom'}
                                            </span>
                                            <button
                                                onClick={() => handleUnshare(perm.principal_id, perm.principal_type)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                                title="Remove Access"
                                                disabled={unshareMutation.isPending}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No explicit permissions found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Access Logs */}
            <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText size={18} className="text-indigo-400" />
                    Access Logs
                </h2>

                {isLogsLoading ? (
                    <div className="text-center py-4 text-gray-400 text-sm">Loading access logs...</div>
                ) : accessLogs && accessLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-color-dark">
                                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Time</th>
                                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Action</th>
                                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Principal</th>
                                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">IP Address</th>
                                    <th className="py-2 text-xs font-bold text-gray-500 pointer-events-none uppercase text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accessLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="py-3 text-xs text-gray-400 flex items-center gap-1.5">
                                            <Calendar size={12} />
                                            {new Date(log.accessed_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 text-xs text-gray-200 font-medium">{log.action}</td>
                                        <td className="py-3 text-xs text-gray-500 font-mono">{log.principal_id.substring(0, 12)}...</td>
                                        <td className="py-3 text-xs text-gray-500">{log.ip_address}</td>
                                        <td className="py-3 text-right">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                                log.status === 'success' ? 'bg-green-100/10 border-green-500/30 text-green-500' : 'bg-red-100/10 border-red-500/30 text-red-500'
                                            )}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No access logs recorded for this resource.
                    </div>
                )}
            </div>

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Share2 size={20} className="text-primary" />
                                Share Resource
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">Grant a user or group access to this resource.</p>
                        </div>
                        <form onSubmit={handleShareSubmit}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                                        <select
                                            value={shareForm.principal_type}
                                            onChange={(e) => setShareForm({ ...shareForm, principal_type: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                                        >
                                            <option value="user">User</option>
                                            <option value="group">Group</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Principal ID (UUID)</label>
                                        <input
                                            type="text"
                                            value={shareForm.principal_id}
                                            onChange={(e) => setShareForm({ ...shareForm, principal_id: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                                            placeholder="User or Group ID"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Access Level</label>
                                    <select
                                        value={shareForm.access_level}
                                        onChange={(e) => setShareForm({ ...shareForm, access_level: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                                    >
                                        <option value="read">Read Only</option>
                                        <option value="write">Read & Write</option>
                                        <option value="admin">Full Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                        Expires At <span className="text-gray-500 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={shareForm.expires_at}
                                        onChange={(e) => setShareForm({ ...shareForm, expires_at: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3 bg-slate-900/50 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => !shareMutation.isPending && setIsShareModalOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={shareMutation.isPending}
                                    className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f111a] focus:ring-primary disabled:opacity-50 flex items-center gap-2"
                                >
                                    {shareMutation.isPending ? 'Sharing...' : 'Share Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceDetailPage;
