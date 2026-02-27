import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Search, AlertCircle } from 'lucide-react';
import { useOrganizations, useDeleteOrganization } from '../api/useOrganizations';
import { Organization } from '../types/organization';
import EditOrganizationModal from '../components/EditOrganizationModal';
import AddOrganizationModal from '../components/AddOrganizationModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

const OrganizationsManagement = () => {
    const navigate = useNavigate();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Data
    const { data: organizations = [], isLoading, error } = useOrganizations();
    const deleteMutation = useDeleteOrganization();

    // Filters
    const filteredOrgs = useMemo(() => {
        if (!searchQuery) return organizations;
        const lowerQuery = searchQuery.toLowerCase();
        return organizations.filter((org: Organization) =>
            org.name.toLowerCase().includes(lowerQuery) ||
            org.slug.toLowerCase().includes(lowerQuery)
        );
    }, [organizations, searchQuery]);

    // Handlers
    const handleEdit = (org: Organization) => {
        setSelectedOrg(org);
        setShowEditModal(true);
    };

    const handleDeleteClick = (org: Organization) => {
        setSelectedOrg(org);
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedOrg) return;
        deleteMutation.mutate(selectedOrg.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const columns: Column<Organization>[] = [
        {
            header: 'ID',
            cell: (org) => <span className="font-mono text-[11px] text-gray-500" title={org.id}>{org.id.substring(0, 8)}...</span>,
            className: 'w-24'
        },
        {
            header: 'Name',
            cell: (org) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-200">{org.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{org.slug}</span>
                </div>
            )
        },
        {
            header: 'Plan',
            cell: (org) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    org.billing_tier === 'enterprise' ? 'bg-purple-100/10 border-purple-500/30 text-purple-400' :
                        org.billing_tier === 'pro' ? 'bg-blue-100/10 border-blue-500/30 text-blue-400' :
                            'bg-gray-100/10 border-gray-500/30 text-gray-500'
                )}>
                    {org.billing_tier}
                </span>
            )
        },
        {
            header: 'Users',
            cell: (org) => <span className="text-sm text-gray-400">{org.max_users}</span>,
            className: 'hidden sm:table-cell'
        },
        {
            header: 'Status',
            cell: (org) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    org.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                        'bg-gray-100/10 border-gray-500/30 text-gray-500'
                )}>
                    {org.status}
                </span>
            )
        },
        {
            header: 'Created',
            cell: (org) => <span className="text-xs text-gray-500">{formatDate(org.created_at)}</span>,
            className: 'hidden lg:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (org) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(org); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit Organization"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(org); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete Organization"
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
                    <span>{extractErrorMessage(error, 'Failed to load organizations')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Organizations</h1>
                    <p className="text-sm text-gray-400">Manage tenants and billing</p>
                </div>
                {/* New Organization button disabled — org creation happens via signup (/auth/register-org).
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>New Organization</span>
                </button>
                */}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={filteredOrgs}
                keyExtractor={(org) => org.id}
                isLoading={isLoading}
                emptyMessage="No organizations found."
                onRowClick={(org) => navigate(`/organizations/${org.id}`)}
            />

            {/* Modals */}
            {showAddModal && (
                <AddOrganizationModal
                    onClose={() => setShowAddModal(false)}
                    onSave={() => setShowAddModal(false)}
                />
            )}

            {showEditModal && selectedOrg && (
                <EditOrganizationModal
                    organization={selectedOrg}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => setShowEditModal(false)}
                />
            )}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Organization"
                message={`Are you sure you want to delete ${selectedOrg?.name}? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

export default OrganizationsManagement;
