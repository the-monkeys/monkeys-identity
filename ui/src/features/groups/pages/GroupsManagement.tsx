import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Filter, AlertCircle, Users } from 'lucide-react';
import { useGroups, useDeleteGroup } from '../api/useGroups';
import { Group } from '../types/group';
import AddGroupModal from '../components/AddGroupModal';
import EditGroupModal from '../components/EditGroupModal';
import GroupMembersModal from '../components/GroupMembersModal';
import GroupDetailsModal from '../components/GroupDetailsModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';

const GroupsManagement = () => {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // Modals State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Queries & Mutations
    const { data: groups = [], isLoading, error } = useGroups();
    const deleteGroupMutation = useDeleteGroup();

    // Filters
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groups;
        const lowerQuery = searchQuery.toLowerCase();
        return groups.filter(group =>
            group.name?.toLowerCase().includes(lowerQuery) ||
            group.description?.toLowerCase().includes(lowerQuery)
        );
    }, [groups, searchQuery]);

    // Handlers
    const handleEdit = (group: Group) => {
        setSelectedGroup(group);
        setShowEditModal(true);
    };

    const handleDeleteClick = (group: Group) => {
        setSelectedGroup(group);
        setShowDeleteDialog(true);
    };

    const handleMembersClick = (group: Group) => {
        setSelectedGroup(group);
        setShowMembersModal(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedGroup) return;
        deleteGroupMutation.mutate(selectedGroup.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    // Formatters
    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '0001-01-01T00:00:00Z') return 'Never';
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Columns Definition
    const columns: Column<Group>[] = [
        {
            header: 'ID',
            cell: (group) => <span className="font-mono text-[11px] text-gray-500" title={group.id}>{group.id.substring(0, 8)}...</span>,
            className: 'w-24'
        },
        {
            header: 'Group Name',
            cell: (group) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-200">{group.name}</span>
                    <span className="text-xs text-gray-500">{group.description}</span>
                </div>
            )
        },
        {
            header: 'Type',
            accessorKey: 'group_type',
            cell: (group) => (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100/10 border border-blue-500/30 text-blue-500">
                    {group.group_type}
                </span>
            ),
            className: 'hidden md:table-cell'
        },
        {
            header: 'Status',
            cell: (group) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    group.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' :
                            'bg-red-100/10 border-red-500/30 text-red-500'
                )}>
                    {group.status}
                </span>
            )
        },
        {
            header: 'Max Members',
            accessorKey: 'max_members',
            className: 'hidden lg:table-cell text-center'
        },
        {
            header: 'Created',
            cell: (group) => <span className="text-xs text-gray-500">{formatDate(group.created_at)}</span>,
            className: 'hidden xl:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (group) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleMembersClick(group); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-purple-400"
                        title="Manage Members"
                    >
                        <Users size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(group); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit Group"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(group); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete Group"
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
                    <span>{(error as any)?.response?.data?.message || 'Failed to load groups'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Groups Management</h1>
                    <p className="text-sm text-gray-400">Manage groups and their members</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>Add new group</span>
                </button>
            </div>

            {/* Search & Filter Section */}
            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search groups..."
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

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredGroups}
                keyExtractor={(group) => group.id}
                isLoading={isLoading}
                emptyMessage="No groups found."
                onRowClick={(group) => {
                    setSelectedGroup(group);
                    setShowDetailsModal(true);
                }}
            />

            {/* Modals */}
            {showAddModal && (
                <AddGroupModal
                    onClose={() => setShowAddModal(false)}
                    onSave={() => setShowAddModal(false)}
                />
            )}

            {showEditModal && selectedGroup && (
                <EditGroupModal
                    group={selectedGroup}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => setShowEditModal(false)}
                />
            )}

            {showMembersModal && selectedGroup && (
                <GroupMembersModal
                    group={selectedGroup}
                    onClose={() => setShowMembersModal(false)}
                />
            )}

            {showDetailsModal && selectedGroup && (
                <GroupDetailsModal
                    group={selectedGroup}
                    onClose={() => setShowDetailsModal(false)}
                />
            )}

            {/* Dialogs */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Group"
                message={`Are you sure you want to delete ${selectedGroup?.name}? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteGroupMutation.isPending}
            />
        </div>
    );
};

export default GroupsManagement;
