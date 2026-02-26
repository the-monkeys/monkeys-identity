import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
    ArrowLeft, FileText, Video, MessageSquare, Newspaper, Globe,
    Clock, AlertCircle, Users, Trash2, Edit3, Send, Archive,
    RotateCcw, Plus, Tag, Database, User, Building, Link2, Hash
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    useContent, useContentCollaborators,
    useUpdateContent, useDeleteContent, useUpdateContentStatus,
    useInviteCollaborator, useRemoveCollaborator,
} from '../api/content';
import { CONTENT_TYPES, UpdateContentRequest } from '../types';

// ── Styling helpers ────────────────────────────────────────────────────

const typeColors: Record<string, string> = {
    blog: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    video: 'bg-red-500/10 border-red-500/20 text-red-400',
    tweet: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    comment: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    article: 'bg-green-500/10 border-green-500/20 text-green-400',
    post: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
};

const typeIconMap: Record<string, React.ReactNode> = {
    blog: <FileText size={24} />,
    video: <Video size={24} />,
    tweet: <MessageSquare size={24} />,
    comment: <MessageSquare size={24} />,
    article: <Newspaper size={24} />,
    post: <Globe size={24} />,
};

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100/10 border-gray-500/30 text-gray-400',
    published: 'bg-green-100/10 border-green-500/30 text-green-400',
    archived: 'bg-amber-100/10 border-amber-500/30 text-amber-400',
    private: 'bg-purple-100/10 border-purple-500/30 text-purple-400',
    hidden: 'bg-rose-100/10 border-rose-500/30 text-rose-400',
};

const roleColors: Record<string, string> = {
    owner: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    'co-author': 'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

// ── Helpers ────────────────────────────────────────────────────────────

const safeParse = (json: string | undefined): any => {
    if (!json || json === '{}' || json === '[]' || json === 'null') return null;
    try { return JSON.parse(json); } catch { return null; }
};

const formatDate = (d: string | undefined | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
};

// ── Page component ─────────────────────────────────────────────────────

const ContentDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Data
    const { data, isLoading, error } = useContent(id!);
    const content = data?.content;
    const myRole = data?.role;

    const { data: collaborators, isLoading: collabLoading } = useContentCollaborators(id!);

    // Mutations
    const updateMut = useUpdateContent();
    const deleteMut = useDeleteContent();
    const statusMut = useUpdateContentStatus();
    const inviteMut = useInviteCollaborator();
    const removeMut = useRemoveCollaborator();

    // Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteUserId, setInviteUserId] = useState('');
    const [editForm, setEditForm] = useState<UpdateContentRequest>({});

    // ── Handlers ───────────────────────────────────────────────────────
    const openEdit = () => {
        if (!content) return;
        setEditForm({
            title: content.title,
            body: content.body,
            summary: content.summary,
            cover_image_url: content.cover_image_url,
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMut.mutate({ id: id!, data: editForm }, {
            onSuccess: () => setShowEditModal(false),
        });
    };

    const handleDeleteConfirm = () => {
        deleteMut.mutate(id!, {
            onSuccess: () => navigate('/content'),
        });
    };

    const handleStatusChange = (status: string) => {
        statusMut.mutate({ id: id!, status });
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteUserId.trim()) return;
        inviteMut.mutate({ contentId: id!, userId: inviteUserId.trim() }, {
            onSuccess: () => { setInviteUserId(''); setShowInviteModal(false); },
        });
    };

    const isOwner = myRole === 'owner';

    // ── Loading ────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="max-w-4xl mx-auto space-y-4 mt-8">
                <button onClick={() => navigate('/content')}
                    className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={16} className="mr-1" /> Back to Content
                </button>
                <div className="flex items-center justify-center h-48">
                    <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                        <AlertCircle size={20} />
                        <span>Content not found</span>
                    </div>
                </div>
            </div>
        );
    }

    const typeLabel = CONTENT_TYPES.find(t => t.value === content.content_type)?.label ?? content.content_type;
    const tags = safeParse(content.tags);
    const metadata = safeParse(content.metadata);

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Back button */}
            <button onClick={() => navigate('/content')}
                className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={16} className="mr-1" /> Back to Content
            </button>

            {/* ─── Header Card ────────────────────────────────────────── */}
            <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn('p-3 rounded-lg border', typeColors[content.content_type] ?? 'bg-gray-500/10 border-gray-500/20 text-gray-400')}>
                            {typeIconMap[content.content_type] ?? <FileText size={24} />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">{content.title}</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span className="font-mono text-xs">{content.slug}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                                    typeColors[content.content_type] ?? 'bg-gray-100/10 text-gray-400 border-gray-500/30'
                                )}>
                                    {typeLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Status badge */}
                        <span className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold uppercase border',
                            statusColors[content.status] ?? statusColors.draft,
                        )}>
                            {content.status}
                        </span>
                        {/* Your role */}
                        {myRole && (
                            <span className={cn(
                                'px-3 py-1 rounded-full text-xs font-bold uppercase border',
                                roleColors[myRole] ?? 'bg-gray-100/10 text-gray-400 border-gray-500/30'
                            )}>
                                {myRole}
                            </span>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 flex items-center gap-2 flex-wrap">
                    {/* Status transitions */}
                    {/* Status selector */}
                    <select
                        value={content.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={statusMut.isPending}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 border border-slate-600 text-gray-300 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                        <option value="private">Private</option>
                        <option value="hidden">Hidden</option>
                    </select>

                    {/* Edit */}
                    <button onClick={openEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                        <Edit3 size={13} /> Edit
                    </button>

                    {/* Delete (owner only) */}
                    {isOwner && (
                        <button onClick={() => setShowDeleteDialog(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                            <Trash2 size={13} /> Delete
                        </button>
                    )}
                </div>

                {/* Summary */}
                {content.summary && (
                    <p className="mt-4 text-sm text-gray-400 leading-relaxed">{content.summary}</p>
                )}

                {/* Metadata grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <MetaField icon={<Hash size={14} />} label="ID" value={content.id} mono />
                    <MetaField icon={<User size={14} />} label="Owner ID" value={content.owner_id} mono />
                    <MetaField icon={<Building size={14} />} label="Organization" value={content.organization_id} mono />
                    <MetaField icon={<Clock size={14} />} label="Created" value={formatDate(content.created_at)} />
                    <MetaField icon={<Clock size={14} />} label="Updated" value={formatDate(content.updated_at)} />
                    {content.published_at && (
                        <MetaField icon={<Send size={14} />} label="Published" value={formatDate(content.published_at)} />
                    )}
                    {content.parent_id && (
                        <MetaField icon={<Link2 size={14} />} label="Parent ID" value={content.parent_id} mono />
                    )}
                    {content.cover_image_url && (
                        <MetaField icon={<Globe size={14} />} label="Cover Image" value={content.cover_image_url} truncate />
                    )}
                </div>
            </div>

            {/* ─── Two-column: Body + Side panels ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Body (left 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Body Content */}
                    <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-blue-400" />
                            Body
                        </h2>
                        {content.body ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-800 font-sans">
                                    {content.body}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No body content yet.</p>
                        )}
                    </div>

                    {/* Metadata JSON */}
                    {metadata && (
                        <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Database size={18} className="text-purple-400" />
                                Metadata
                            </h2>
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-green-400 overflow-x-auto">
                                <pre>{JSON.stringify(metadata, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right sidebar panels */}
                <div className="space-y-6">
                    {/* Tags */}
                    <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <Tag size={16} className="text-cyan-400" />
                            Tags
                        </h2>
                        {tags && Array.isArray(tags) && tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-gray-300 font-medium">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        ) : tags && typeof tags === 'object' && Object.keys(tags).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(tags).map(([k, v]) => (
                                    <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-gray-300">
                                        <span className="text-gray-500">{k}:</span> {String(v)}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No tags</p>
                        )}
                    </div>

                    {/* Collaborators */}
                    <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Users size={16} className="text-amber-400" />
                                Collaborators
                            </h2>
                            {isOwner && (
                                <button onClick={() => setShowInviteModal(true)}
                                    className="text-xs bg-primary/20 text-primary px-2.5 py-1 rounded hover:bg-primary/30 flex items-center gap-1 transition-colors font-medium border border-primary/20">
                                    <Plus size={12} /> Invite
                                </button>
                            )}
                        </div>

                        {collabLoading ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-12 bg-slate-800 rounded" />
                                <div className="h-12 bg-slate-800 rounded" />
                            </div>
                        ) : collaborators && collaborators.length > 0 ? (
                            <div className="space-y-2">
                                {collaborators.map((c) => (
                                    <div key={c.user_id}
                                        className="group flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                {(c.display_name || c.username || '?')[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-200 truncate">
                                                    {c.display_name || c.username}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={cn(
                                                'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border',
                                                roleColors[c.role] ?? 'bg-gray-100/10 text-gray-400 border-gray-500/30',
                                            )}>
                                                {c.role}
                                            </span>
                                            {isOwner && c.role !== 'owner' && (
                                                <button
                                                    onClick={() => removeMut.mutate({ contentId: id!, userId: c.user_id })}
                                                    disabled={removeMut.isPending}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic text-center py-4">No collaborators</p>
                        )}
                    </div>

                    {/* Cover Image Preview */}
                    {content.cover_image_url && (
                        <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                                <Globe size={16} className="text-green-400" />
                                Cover Image
                            </h2>
                            <img
                                src={content.cover_image_url}
                                alt={content.title}
                                className="w-full rounded-lg border border-slate-700 object-cover max-h-48"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Edit Modal ─────────────────────────────────────────── */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Content</h2>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                                    <input type="text" value={editForm.title ?? ''} required
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Summary</label>
                                    <input type="text" value={editForm.summary ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Body</label>
                                    <textarea value={editForm.body ?? ''} rows={6}
                                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Cover Image URL</label>
                                    <input type="text" value={editForm.cover_image_url ?? ''}
                                        onChange={(e) => setEditForm({ ...editForm, cover_image_url: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button type="button" onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={updateMut.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                                    {updateMut.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Invite Collaborator Modal ──────────────────────────── */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-sm shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-primary" /> Invite Collaborator
                            </h2>
                        </div>
                        <form onSubmit={handleInvite}>
                            <div className="p-6">
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">User ID</label>
                                <input type="text" value={inviteUserId}
                                    onChange={(e) => setInviteUserId(e.target.value)}
                                    placeholder="Enter user UUID..."
                                    className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                                    required />
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button type="button" onClick={() => setShowInviteModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={inviteMut.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50">
                                    {inviteMut.isPending ? 'Inviting...' : 'Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Content"
                message={`Are you sure you want to delete "${content.title}"? This action cannot be undone.`}
                variant="danger"
                isLoading={deleteMut.isPending}
            />
        </div>
    );
};

// ── Small reusable metadata field ──────────────────────────────────────

const MetaField = ({ icon, label, value, mono, truncate }: {
    icon: React.ReactNode; label: string; value: string;
    mono?: boolean; truncate?: boolean;
}) => (
    <div>
        <p className="text-xs uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">{icon} {label}</p>
        <p className={cn(
            'text-sm text-gray-200',
            mono && 'font-mono text-xs bg-slate-900 px-1.5 py-0.5 rounded inline-block',
            truncate && 'truncate max-w-[200px]',
        )} title={value}>{value}</p>
    </div>
);

export default ContentDetailPage;
