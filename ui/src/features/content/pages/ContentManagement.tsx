import { useState, useMemo } from 'react';
import {
    Plus, Search, Filter, AlertCircle, FileText, Trash2, Edit3,
    Send, Archive, RotateCcw, Users, Video, MessageSquare,
    Newspaper, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    useContentList, useCreateContent, useUpdateContent,
    useDeleteContent, useUpdateContentStatus,
    useContentCollaborators, useInviteCollaborator, useRemoveCollaborator
} from '../api/content';
import { ContentItem, CreateContentRequest, UpdateContentRequest, CONTENT_TYPES } from '../types';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

// ── Content type styling helpers ───────────────────────────────────────

const typeColors: Record<string, string> = {
    blog: 'bg-blue-100/10 text-blue-400 border-blue-500/30',
    video: 'bg-red-100/10 text-red-400 border-red-500/30',
    tweet: 'bg-cyan-100/10 text-cyan-400 border-cyan-500/30',
    comment: 'bg-yellow-100/10 text-yellow-400 border-yellow-500/30',
    article: 'bg-green-100/10 text-green-400 border-green-500/30',
    post: 'bg-purple-100/10 text-purple-400 border-purple-500/30',
};

const typeIcons: Record<string, React.ReactNode> = {
    blog: <FileText size={14} />,
    video: <Video size={14} />,
    tweet: <MessageSquare size={14} />,
    comment: <MessageSquare size={14} />,
    article: <Newspaper size={14} />,
    post: <Globe size={14} />,
};

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100/10 border-gray-500/30 text-gray-400',
    published: 'bg-green-100/10 border-green-500/30 text-green-400',
    archived: 'bg-amber-100/10 border-amber-500/30 text-amber-400',
    private: 'bg-purple-100/10 border-purple-500/30 text-purple-400',
    hidden: 'bg-rose-100/10 border-rose-500/30 text-rose-400',
};

// ── Page component ─────────────────────────────────────────────────────

const ContentManagement = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter]   = useState('');
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal]     = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCollabModal, setShowCollabModal] = useState(false);

    // Forms
    const [createForm, setCreateForm] = useState<CreateContentRequest>({
        content_type: 'blog', title: '', body: '', summary: '',
    });
    const [editForm, setEditForm] = useState<UpdateContentRequest>({});
    const [inviteUserId, setInviteUserId] = useState('');

    // Queries & mutations
    const { data, isLoading, error } = useContentList(
        typeFilter ? { content_type: typeFilter } : undefined,
    );
    const items = data?.items ?? [];

    const createMut   = useCreateContent();
    const updateMut   = useUpdateContent();
    const deleteMut   = useDeleteContent();
    const statusMut   = useUpdateContentStatus();
    const inviteMut   = useInviteCollaborator();
    const removeMut   = useRemoveCollaborator();

    const collabContentId = showCollabModal && selectedItem ? selectedItem.id : '';
    const { data: collaborators } = useContentCollaborators(collabContentId);

    // ── Search filter ──────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        const q = searchQuery.toLowerCase();
        return items.filter((it) =>
            it.title?.toLowerCase().includes(q) ||
            it.slug?.toLowerCase().includes(q) ||
            it.content_type?.toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

    // ── Handlers ───────────────────────────────────────────────────────
    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMut.mutate(createForm, {
            onSuccess: () => {
                setShowCreateModal(false);
                setCreateForm({ content_type: 'blog', title: '', body: '', summary: '' });
            },
        });
    };

    const handleEditClick = (item: ContentItem) => {
        setSelectedItem(item);
        setEditForm({
            title: item.title,
            body: item.body,
            summary: item.summary,
            cover_image_url: item.cover_image_url,
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        updateMut.mutate({ id: selectedItem.id, data: editForm }, {
            onSuccess: () => { setShowEditModal(false); setSelectedItem(null); },
        });
    };

    const handleDeleteClick = (item: ContentItem) => {
        setSelectedItem(item);
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedItem) return;
        deleteMut.mutate(selectedItem.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleStatusChange = (item: ContentItem, status: string) => {
        statusMut.mutate({ id: item.id, status });
    };

    const handleCollabClick = (item: ContentItem) => {
        setSelectedItem(item);
        setShowCollabModal(true);
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !inviteUserId.trim()) return;
        inviteMut.mutate({ contentId: selectedItem.id, userId: inviteUserId.trim() }, {
            onSuccess: () => setInviteUserId(''),
        });
    };

    // ── Table columns ──────────────────────────────────────────────────
    const columns: Column<ContentItem>[] = [
        {
            header: 'Title',
            cell: (item) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-200 truncate max-w-[260px]">{item.title}</span>
                    <span className="text-xs text-gray-500 font-mono">{item.slug}</span>
                </div>
            ),
        },
        {
            header: 'Type',
            cell: (item) => (
                <span className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border inline-flex items-center gap-1',
                    typeColors[item.content_type] ?? 'bg-gray-100/10 text-gray-400 border-gray-500/30',
                )}>
                    {typeIcons[item.content_type]} {item.content_type}
                </span>
            ),
            className: 'w-28',
        },
        {
            header: 'Status',
            cell: (item) => (
                <span className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                    statusColors[item.status] ?? statusColors.draft,
                )}>
                    {item.status}
                </span>
            ),
            className: 'hidden sm:table-cell w-28',
        },
        {
            header: 'Updated',
            cell: (item) => (
                <span className="text-xs text-gray-500">
                    {new Date(item.updated_at).toLocaleDateString()}
                </span>
            ),
            className: 'hidden lg:table-cell w-28',
        },
        {
            header: 'Actions',
            className: 'text-right w-44',
            cell: (item) => (
                <div className="flex items-center justify-end space-x-0.5">
                    {/* Status actions */}
                    {/* Status dropdown */}
                    <select
                        value={item.status}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(item, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded-md text-xs bg-slate-800 border border-slate-600 text-gray-300 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                        <option value="private">Private</option>
                        <option value="hidden">Hidden</option>
                    </select>

                    {/* Collaborators */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCollabClick(item); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-purple-400"
                        title="Collaborators"
                    ><Users size={15} /></button>

                    {/* Edit */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit"
                    ><Edit3 size={15} /></button>

                    {/* Delete */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete"
                    ><Trash2 size={15} /></button>
                </div>
            ),
        },
    ];

    // ── Error state ────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>{extractErrorMessage(error, 'Failed to load content')}</span>
                </div>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        Content
                    </h1>
                    <p className="text-sm text-gray-400">
                        Create and manage blogs, videos, tweets, and more
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>New Content</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Type tabs */}
                <div className="flex items-center gap-1 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark overflow-x-auto">
                    <button
                        onClick={() => setTypeFilter('')}
                        className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap',
                            !typeFilter ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-gray-200',
                        )}
                    >All</button>
                    {CONTENT_TYPES.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => setTypeFilter(t.value)}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap',
                                typeFilter === t.value ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-gray-200',
                            )}
                        >{t.label}</button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark flex-1 sm:max-w-xs">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                        />
                    </div>
                    <div className="h-4 w-[1px] bg-border-color-dark mx-1" />
                    <button className="p-2 hover:bg-slate-800 rounded-md text-gray-400 transition-colors">
                        <Filter size={16} />
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            {data && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{data.total} item{data.total !== 1 ? 's' : ''}</span>
                    {typeFilter && <span className="text-primary">Filtered: {typeFilter}</span>}
                </div>
            )}

            {/* Table */}
            <DataTable
                columns={columns}
                data={filteredItems}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No content found. Create your first piece of content!"
                onRowClick={(item) => navigate(`/content/${item.id}`)}
            />

            {/* ── Create Modal ──────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">New Content</h2>
                            <p className="text-sm text-gray-400 mt-1">Create a new content item</p>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Content Type</label>
                                    <select
                                        value={createForm.content_type}
                                        onChange={(e) => setCreateForm({ ...createForm, content_type: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
                                    >
                                        {CONTENT_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                                    <input
                                        type="text"
                                        value={createForm.title}
                                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Enter a title..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Summary</label>
                                    <input
                                        type="text"
                                        value={createForm.summary ?? ''}
                                        onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Brief summary..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Body</label>
                                    <textarea
                                        value={createForm.body ?? ''}
                                        onChange={(e) => setCreateForm({ ...createForm, body: e.target.value })}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="Content body..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Cover Image URL</label>
                                    <input
                                        type="text"
                                        value={createForm.cover_image_url ?? ''}
                                        onChange={(e) => setCreateForm({ ...createForm, cover_image_url: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Metadata (JSON)</label>
                                    <textarea
                                        value={createForm.metadata ?? ''}
                                        onChange={(e) => setCreateForm({ ...createForm, metadata: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-xs"
                                        placeholder='{"video_url": "...", "duration": "10:30"}'
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={createMut.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                                    {createMut.isPending ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ────────────────────────────────────────────── */}
            {showEditModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Content</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border mr-2',
                                    typeColors[selectedItem.content_type] ?? 'bg-gray-100/10 text-gray-400 border-gray-500/30'
                                )}>{selectedItem.content_type}</span>
                                {selectedItem.slug}
                            </p>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                                    <input
                                        type="text"
                                        value={editForm.title ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Summary</label>
                                    <input
                                        type="text"
                                        value={editForm.summary ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Body</label>
                                    <textarea
                                        value={editForm.body ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                                        rows={5}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Cover Image URL</label>
                                    <input
                                        type="text"
                                        value={editForm.cover_image_url ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button type="button" onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={updateMut.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                                    {updateMut.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Collaborators Modal ───────────────────────────────────── */}
            {showCollabModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-primary" /> Collaborators
                            </h2>
                            <p className="text-sm text-gray-400 mt-1 truncate">{selectedItem.title}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Invite form */}
                            <form onSubmit={handleInvite} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inviteUserId}
                                    onChange={(e) => setInviteUserId(e.target.value)}
                                    placeholder="User ID to invite..."
                                    className="flex-1 px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <button
                                    type="submit"
                                    disabled={inviteMut.isPending || !inviteUserId.trim()}
                                    className="px-3 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {inviteMut.isPending ? '...' : 'Invite'}
                                </button>
                            </form>

                            {/* Collaborator list */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {(collaborators ?? []).length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No collaborators yet</p>
                                ) : (
                                    (collaborators ?? []).map((c) => (
                                        <div key={c.user_id}
                                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-border-color-dark">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                    {(c.display_name || c.username || '?')[0]?.toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-200 font-medium truncate">
                                                        {c.display_name || c.username}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={cn(
                                                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                                                    c.role === 'owner'
                                                        ? 'bg-amber-100/10 text-amber-400 border-amber-500/30'
                                                        : 'bg-blue-100/10 text-blue-400 border-blue-500/30',
                                                )}>
                                                    {c.role}
                                                </span>
                                                {c.role !== 'owner' && (
                                                    <button
                                                        onClick={() => removeMut.mutate({ contentId: selectedItem.id, userId: c.user_id })}
                                                        disabled={removeMut.isPending}
                                                        className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-border-color-dark flex justify-end">
                            <button
                                onClick={() => { setShowCollabModal(false); setInviteUserId(''); }}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                            >Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Content"
                message={`Are you sure you want to delete "${selectedItem?.title}"? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteMut.isPending}
            />
        </div>
    );
};

export default ContentManagement;
