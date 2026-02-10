import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, FileText, AlertCircle, CheckCircle, Clock, Code2, Edit3 } from 'lucide-react';
import { usePolicies, useCreatePolicy, useDeletePolicy, useUpdatePolicy, Policy } from '../api/usePolicies';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';

const PoliciesManagement = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [newPolicy, setNewPolicy] = useState({
        name: '',
        description: '',
        effect: 'allow',
        document: '{\n  "Version": "2024-01-01",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Action": ["*"],\n      "Resource": ["*"]\n    }\n  ]\n}',
    });
    const [editPolicyData, setEditPolicyData] = useState({
        name: '',
        description: '',
        effect: 'allow',
        document: '',
    });

    const { data: policies = [], isLoading, error } = usePolicies();
    const createPolicyMutation = useCreatePolicy();
    const deletePolicyMutation = useDeletePolicy();
    const updatePolicyMutation = useUpdatePolicy();

    const filteredPolicies = useMemo(() => {
        if (!searchQuery) return policies;
        const lowerQuery = searchQuery.toLowerCase();
        return policies.filter((p: Policy) =>
            p.name?.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery)
        );
    }, [policies, searchQuery]);

    const handleDeleteClick = (policy: Policy) => {
        setSelectedPolicy(policy);
        setShowDeleteDialog(true);
    };

    const handleEditClick = (policy: Policy) => {
        setSelectedPolicy(policy);
        setEditPolicyData({
            name: policy.name,
            description: policy.description,
            effect: policy.effect,
            document: policy.document || '',
        });
        setShowEditModal(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedPolicy) return;
        deletePolicyMutation.mutate(selectedPolicy.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const documentObj = JSON.parse(newPolicy.document);
            createPolicyMutation.mutate({ ...newPolicy, document: documentObj }, {
                onSuccess: () => {
                    setShowCreateModal(false);
                    setNewPolicy({
                        name: '',
                        description: '',
                        effect: 'allow',
                        document: '{\n  "Version": "2024-01-01",\n  "Statement": [\n    {\n      "Effect": "Allow",\n      "Action": ["*"],\n      "Resource": ["*"]\n    }\n  ]\n}'
                    });
                },
            });
        } catch (err) {
            alert('Invalid JSON in policy document: ' + (err as Error).message);
        }
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPolicy) return;
        try {
            const documentObj = JSON.parse(editPolicyData.document);
            updatePolicyMutation.mutate({ id: selectedPolicy.id, data: { ...editPolicyData, document: documentObj } }, {
                onSuccess: () => {
                    setShowEditModal(false);
                    setSelectedPolicy(null);
                },
            });
        } catch (err) {
            alert('Invalid JSON in policy document: ' + (err as Error).message);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return '—';
        return new Date(dateString).toLocaleDateString();
    };

    const effectBadge = (effect: string) => {
        const isAllow = effect?.toLowerCase() === 'allow';
        return (
            <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                isAllow
                    ? 'bg-green-100/10 border-green-500/30 text-green-400'
                    : 'bg-red-100/10 border-red-500/30 text-red-400'
            )}>
                {effect || 'allow'}
            </span>
        );
    };

    const columns: Column<Policy>[] = [
        {
            header: 'Policy',
            cell: (p) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <FileText size={16} className="text-amber-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-200">{p.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{p.description}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Effect',
            cell: (p) => effectBadge(p.effect),
        },
        {
            header: 'Status',
            cell: (p) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border flex items-center gap-1 w-fit",
                    p.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-400' :
                        p.status === 'pending' ? 'bg-yellow-100/10 border-yellow-500/30 text-yellow-400' :
                            'bg-gray-100/10 border-gray-500/30 text-gray-400'
                )}>
                    {p.status === 'active' ? <CheckCircle size={10} /> : <Clock size={10} />}
                    {p.status || 'active'}
                </span>
            ),
        },
        {
            header: 'Version',
            cell: (p) => <span className="text-xs text-gray-400 font-mono">v{p.version || 1}</span>,
            className: 'hidden md:table-cell'
        },
        {
            header: 'Created',
            cell: (p) => <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>,
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (p) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(p); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit Policy"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(p); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete Policy"
                    >
                        <Trash2 size={16} />
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
                    <span>Failed to load policies</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Fine-Grained Policies</h1>
                    <p className="text-sm text-gray-400">Define attribute-based access policies with conditions, wildcards, and resource matching</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>Create Policy</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/10"><FileText size={20} className="text-amber-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{policies.length}</p>
                        <p className="text-xs text-gray-400">Total Policies</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10"><CheckCircle size={20} className="text-green-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{policies.filter((p: Policy) => p.effect === 'allow').length}</p>
                        <p className="text-xs text-gray-400">Allow Policies</p>
                    </div>
                </div>
                <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-4 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-red-500/10"><Code2 size={20} className="text-red-400" /></div>
                    <div>
                        <p className="text-2xl font-bold text-white">{policies.filter((p: Policy) => p.effect === 'deny').length}</p>
                        <p className="text-xs text-gray-400">Deny Policies</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search policies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredPolicies}
                keyExtractor={(p) => p.id}
                isLoading={isLoading}
                onRowClick={(p) => navigate(`/policies/${p.id}`)}
                emptyMessage="No policies found. Create your first policy to define fine-grained access control."
            />

            {/* Create Policy Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Create New Policy</h2>
                            <p className="text-sm text-gray-400 mt-1">Define an access control policy with JSON policy document</p>
                        </div>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Policy Name</label>
                                    <input
                                        type="text"
                                        value={newPolicy.name}
                                        onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. ReadOnlyS3Access"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        value={newPolicy.description}
                                        onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Policy description"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Effect</label>
                                    <select
                                        value={newPolicy.effect}
                                        onChange={(e) => setNewPolicy({ ...newPolicy, effect: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    >
                                        <option value="allow">Allow</option>
                                        <option value="deny">Deny</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Policy Document (JSON)</label>
                                    <textarea
                                        value={newPolicy.document}
                                        onChange={(e) => setNewPolicy({ ...newPolicy, document: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[160px]"
                                        placeholder='{"Version":"2024-01-01","Statement":[...]}'
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={createPolicyMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {createPolicyMutation.isPending ? 'Creating...' : 'Create Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Policy Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Policy</h2>
                            <p className="text-sm text-gray-400 mt-1">Update access control policy details and document</p>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Policy Name</label>
                                    <input
                                        type="text"
                                        value={editPolicyData.name}
                                        onChange={(e) => setEditPolicyData({ ...editPolicyData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. ReadOnlyS3Access"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        value={editPolicyData.description}
                                        onChange={(e) => setEditPolicyData({ ...editPolicyData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Policy description"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Effect</label>
                                    <select
                                        value={editPolicyData.effect}
                                        onChange={(e) => setEditPolicyData({ ...editPolicyData, effect: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    >
                                        <option value="allow">Allow</option>
                                        <option value="deny">Deny</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Policy Document (JSON)</label>
                                    <textarea
                                        value={editPolicyData.document}
                                        onChange={(e) => setEditPolicyData({ ...editPolicyData, document: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[160px]"
                                        placeholder='{"Version":"2024-01-01","Statement":[...]}'
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={updatePolicyMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {updatePolicyMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Dialog */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Policy"
                message={`Are you sure you want to delete the "${selectedPolicy?.name}" policy? Roles using this policy will lose these permissions.`}
                variant="danger"
                isLoading={deletePolicyMutation.isPending}
            />
        </div>
    );
};

export default PoliciesManagement;
