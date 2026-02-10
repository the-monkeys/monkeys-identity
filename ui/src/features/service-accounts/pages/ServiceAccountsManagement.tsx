import { useState, useMemo } from 'react';
import { Plus, Search, Filter, AlertCircle, Server, Trash2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useServiceAccounts, useCreateServiceAccount, useDeleteServiceAccount, useUpdateServiceAccount } from '../api/serviceAccounts';
import { ServiceAccount, CreateServiceAccountRequest, UpdateServiceAccountRequest } from '../types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const ServiceAccountsManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedSA, setSelectedSA] = useState<ServiceAccount | null>(null);
    const [newSA, setNewSA] = useState<CreateServiceAccountRequest>({
        name: '',
        description: '',
    });
    const [editSAData, setEditSAData] = useState<UpdateServiceAccountRequest>({
        name: '',
        description: '',
    });

    const navigate = useNavigate();

    const { data: serviceAccounts = [], isLoading, error } = useServiceAccounts();
    const createSAMutation = useCreateServiceAccount();
    const deleteSAMutation = useDeleteServiceAccount();
    const updateSAMutation = useUpdateServiceAccount();

    const filteredSAs = useMemo(() => {
        if (!searchQuery) return serviceAccounts;
        const lowerQuery = searchQuery.toLowerCase();
        return serviceAccounts.filter((sa: ServiceAccount) =>
            sa.name.toLowerCase().includes(lowerQuery) ||
            sa.description?.toLowerCase().includes(lowerQuery)
        );
    }, [serviceAccounts, searchQuery]);

    const handleDeleteClick = (sa: ServiceAccount) => {
        setSelectedSA(sa);
        setShowDeleteDialog(true);
    };

    const handleEditClick = (sa: ServiceAccount) => {
        setSelectedSA(sa);
        setEditSAData({
            name: sa.name,
            description: sa.description,
        });
        setShowEditModal(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedSA) return;
        deleteSAMutation.mutate(selectedSA.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createSAMutation.mutate(newSA, {
            onSuccess: () => {
                setShowCreateModal(false);
                setNewSA({ name: '', description: '' });
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSA) return;
        updateSAMutation.mutate({ id: selectedSA.id, data: editSAData }, {
            onSuccess: () => {
                setShowEditModal(false);
                setSelectedSA(null);
            },
        });
    };

    const columns: Column<ServiceAccount>[] = [
        {
            header: 'Name',
            cell: (sa) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <Server size={16} className="text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-200">{sa.name}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{sa.description || 'No description'}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            cell: (sa) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    sa.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-400' :
                        'bg-gray-100/10 border-gray-500/30 text-gray-400'
                )}>
                    {sa.status}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: 'Created',
            cell: (sa) => <span className="text-xs text-gray-500">{new Date(sa.created_at).toLocaleDateString()}</span>,
            className: 'hidden md:table-cell w-32'
        },
        {
            header: 'Actions',
            className: 'text-right w-24',
            cell: (sa) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(sa); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit Service Account"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(sa); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete Service Account"
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
                    <span>Failed to load service accounts</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark flex items-center gap-2">
                        <Server className="h-6 w-6 text-primary" />
                        Service Accounts
                    </h1>
                    <p className="text-sm text-gray-400">Manage machine-to-machine identities and API keys</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>Create Service Account</span>
                </button>
            </div>

            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
                <div className="h-4 w-[1px] bg-border-color-dark mx-1"></div>
                <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 transition-colors">
                    <Filter size={16} />
                </button>
            </div>

            <DataTable
                columns={columns}
                data={filteredSAs}
                keyExtractor={(sa) => sa.id}
                isLoading={isLoading}
                onRowClick={(sa) => navigate(`/service-accounts/${sa.id}`)}
                emptyMessage="No service accounts found."
            />

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Create Service Account</h2>
                            <p className="text-sm text-gray-400 mt-1">Create a new identity for machine access</p>
                        </div>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={newSA.name}
                                        onChange={(e) => setNewSA({ ...newSA, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. backend-service-worker"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        value={newSA.description}
                                        onChange={(e) => setNewSA({ ...newSA, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Purpose of this account"
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
                                    disabled={createSAMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {createSAMutation.isPending ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Service Account</h2>
                            <p className="text-sm text-gray-400 mt-1">Update service account details</p>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={editSAData.name}
                                        onChange={(e) => setEditSAData({ ...editSAData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. backend-service-worker"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        value={editSAData.description}
                                        onChange={(e) => setEditSAData({ ...editSAData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Purpose of this account"
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
                                    disabled={updateSAMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {updateSAMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Service Account"
                message={`Are you sure you want to delete "${selectedSA?.name}"? All associated API keys will be immediately revoked.`}
                variant="danger"
                isLoading={deleteSAMutation.isPending}
            />
        </div>
    );
};

export default ServiceAccountsManagement;
