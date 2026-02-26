import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle, Box, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import { useResources, useDeleteResource, useCreateResource, useUpdateResource } from '../api/resources';
import { Resource, CreateResourceRequest, UpdateResourceRequest } from '../types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

const ResourcesManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<CreateResourceRequest>({
        name: '',
        type: 'object',
        description: '',
    });
    const [editFormData, setEditFormData] = useState<UpdateResourceRequest>({
        name: '',
        description: '',
    });

    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const { data: resourcesResponse, isLoading, error } = useResources();
    const resources = resourcesResponse || [];
    const deleteResourceMutation = useDeleteResource();
    const createResourceMutation = useCreateResource();
    const updateResourceMutation = useUpdateResource();

    const filteredResources = useMemo(() => {
        if (!searchQuery) return resources;
        const lowerQuery = searchQuery.toLowerCase();
        return resources.filter((resource: Resource) =>
            resource.name?.toLowerCase().includes(lowerQuery) ||
            resource.type?.toLowerCase().includes(lowerQuery) ||
            resource.arn?.toLowerCase().includes(lowerQuery)
        );
    }, [resources, searchQuery]);

    const handleDeleteClick = (resource: Resource) => {
        setSelectedResource(resource);
        setShowDeleteDialog(true);
    };

    const handleEditClick = (resource: Resource) => {
        setSelectedResource(resource);
        setEditFormData({
            name: resource.name,
            description: resource.description,
        });
        setShowEditModal(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedResource) return;
        deleteResourceMutation.mutate(selectedResource.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createResourceMutation.mutate(formData, {
            onSuccess: () => {
                setShowCreateModal(false);
                setFormData({ name: '', type: '', description: '' });
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedResource) return;
        updateResourceMutation.mutate({ id: selectedResource.id, data: editFormData }, {
            onSuccess: () => {
                setShowEditModal(false);
                setSelectedResource(null);
            },
        });
    };

    const columns: Column<Resource>[] = [
        {
            header: 'Name',
            cell: (resource) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-200">{resource.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{resource.arn}</span>
                </div>
            )
        },
        {
            header: 'Type',
            accessorKey: 'type',
            cell: (resource) => (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100/10 text-blue-400 border border-blue-500/30">
                    {resource.type}
                </span>
            ),
            className: 'w-32'
        },
        {
            header: 'Owner',
            cell: (resource) => (
                <div className="text-xs text-gray-400">
                    {resource.owner_type}: {resource.owner_id?.substring(0, 8)}...
                </div>
            ),
            className: 'hidden md:table-cell'
        },
        {
            header: 'Status',
            cell: (resource) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    resource.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                        'bg-gray-100/10 border-gray-500/30 text-gray-500'
                )}>
                    {resource.status}
                </span>
            ),
            className: 'hidden sm:table-cell w-24'
        },
        {
            header: 'Created',
            cell: (resource) => <span className="text-xs text-gray-500">{new Date(resource.created_at).toLocaleDateString()}</span>,
            className: 'hidden lg:table-cell w-32'
        },
        {
            header: 'Actions',
            className: 'text-right w-24',
            cell: (resource) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/resources/${resource.id}`); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="View Details"
                    >
                        <ExternalLink size={16} />
                    </button>
                    {isAdmin() && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(resource); }}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                                title="Edit Resource"
                            >
                                <Edit3 size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(resource); }}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                                title="Delete Resource"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>{extractErrorMessage(error, 'Failed to load resources')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark flex items-center gap-2">
                        <Box className="h-6 w-6 text-primary" />
                        Resources
                    </h1>
                    <p className="text-sm text-gray-400">Manage protected system resources</p>
                </div>
                {isAdmin() && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} /> <span>Add Resource</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search resources..."
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
                data={filteredResources}
                keyExtractor={(r) => r.id}
                isLoading={isLoading}
                emptyMessage="No resources found."
            />

            {/* Create Resource Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Add New Resource</h2>
                            <p className="text-sm text-gray-400 mt-1">Register a new resource in the system</p>
                        </div>
                        <form onSubmit={handleCreateSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Resource Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Storage Bucket A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Resource Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                                        required
                                    >
                                        <option value="object">Object</option>
                                        <option value="service">Service</option>
                                        <option value="namespace">Namespace</option>
                                        <option value="infrastructure">Infrastructure</option>
                                        <option value="application">Application</option>
                                        <option value="configuration">Configuration</option>
                                        <option value="data">Data</option>
                                        <option value="documentation">Documentation</option>
                                        <option value="blog">Blog</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                                        placeholder="Brief description of the resource"
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
                                    disabled={createResourceMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {createResourceMutation.isPending ? 'Adding...' : 'Add Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Resource Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Resource</h2>
                            <p className="text-sm text-gray-400 mt-1">Update resource details</p>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Resource Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Storage Bucket A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                                    <textarea
                                        value={editFormData.description}
                                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]"
                                        placeholder="Brief description of the resource"
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
                                    disabled={updateResourceMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {updateResourceMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                title="Delete Resource"
                message={`Are you sure you want to delete ${selectedResource?.name}? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteResourceMutation.isPending}
            />
        </div>
    );
};

export default ResourcesManagement;
