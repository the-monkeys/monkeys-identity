import { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Link, AlertCircle, Copy, Check, ShieldCheck, Edit3 } from 'lucide-react';
import { useOIDCUnits, useRegisterClient, useDeleteClient, useUpdateClient, OAuthClient, RegisterClientResponse, RegisterClientRequest, UpdateClientRequest } from '../api/useOIDC';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, Column } from '@/components/ui/DataTable';
import { cn } from '@/components/ui/utils';

const OIDCClientManagement = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedClient, setSelectedClient] = useState<OAuthClient | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [registrationResult, setRegistrationResult] = useState<RegisterClientResponse['data']['data'] | null>(null);

    const [newClient, setNewClient] = useState({
        client_name: '',
        redirect_uris: [''],
        scope: 'openid profile email',
        is_public: false,
    });

    const [editClientData, setEditClientData] = useState<UpdateClientRequest>({
        client_name: '',
        redirect_uris: [''],
        scope: '',
        is_public: false,
    });

    const { data: clients = [], isLoading } = useOIDCUnits();
    const registerMutation = useRegisterClient();
    const deleteMutation = useDeleteClient();
    const updateMutation = useUpdateClient();

    const filteredClients = useMemo(() => {
        if (!searchQuery) return clients;
        const lowerQuery = searchQuery.toLowerCase();
        return clients.filter((c: OAuthClient) =>
            c.client_name?.toLowerCase().includes(lowerQuery) ||
            c.id?.toLowerCase().includes(lowerQuery)
        );
    }, [clients, searchQuery]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDeleteClick = (client: OAuthClient) => {
        setSelectedClient(client);
        setShowDeleteDialog(true);
    };

    const handleEditClick = (client: OAuthClient) => {
        setSelectedClient(client);
        setEditClientData({
            client_name: client.client_name,
            redirect_uris: client.redirect_uris || [''],
            scope: client.scope,
            is_public: client.is_public,
        });
        setShowEditModal(true);
    };

    const handleDeleteConfirm = () => {
        if (!selectedClient) return;
        deleteMutation.mutate(selectedClient.id, {
            onSuccess: () => setShowDeleteDialog(false),
        });
    };

    const handleAddRedirectUri = () => {
        setNewClient({ ...newClient, redirect_uris: [...newClient.redirect_uris, ''] });
    };

    const handleRedirectUriChange = (index: number, value: string) => {
        const uris = [...newClient.redirect_uris];
        uris[index] = value;
        setNewClient({ ...newClient, redirect_uris: uris });
    };

    const handleRemoveRedirectUri = (index: number) => {
        const uris = newClient.redirect_uris.filter((_, i) => i !== index);
        setNewClient({ ...newClient, redirect_uris: uris.length ? uris : [''] });
    };

    const handleAddEditRedirectUri = () => {
        setEditClientData({ ...editClientData, redirect_uris: [...(editClientData.redirect_uris || []), ''] });
    };

    const handleEditRedirectUriChange = (index: number, value: string) => {
        const uris = [...(editClientData.redirect_uris || [])];
        uris[index] = value;
        setEditClientData({ ...editClientData, redirect_uris: uris });
    };

    const handleRemoveEditRedirectUri = (index: number) => {
        const uris = (editClientData.redirect_uris || []).filter((_, i) => i !== index);
        setEditClientData({ ...editClientData, redirect_uris: uris.length ? uris : [''] });
    };

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...newClient,
            redirect_uris: newClient.redirect_uris.filter(uri => uri.trim() !== ''),
        };
        registerMutation.mutate(payload as RegisterClientRequest, {
            onSuccess: (response: RegisterClientResponse) => {
                setRegistrationResult(response.data.data);
                setNewClient({ client_name: '', redirect_uris: [''], scope: 'openid profile email', is_public: false });
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        const payload = {
            ...editClientData,
            redirect_uris: (editClientData.redirect_uris || []).filter(uri => uri.trim() !== ''),
        };
        updateMutation.mutate({ id: selectedClient.id, data: payload }, {
            onSuccess: () => {
                setShowEditModal(false);
                setSelectedClient(null);
            },
        });
    };

    const columns: Column<OAuthClient>[] = [
        {
            header: 'Application',
            cell: (c) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <Link size={16} className="text-green-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-200">{c.client_name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-500">{c.id}</span>
                            <button onClick={() => handleCopy(c.id, c.id)} className="text-gray-600 hover:text-gray-400">
                                {copiedId === c.id ? <Check size={10} /> : <Copy size={10} />}
                            </button>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Status',
            cell: (c) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    c.is_public ? 'bg-blue-100/10 border-blue-500/30 text-blue-400' : 'bg-gray-100/10 border-gray-500/30 text-gray-400'
                )}>
                    {c.is_public ? 'Public' : 'Confidential'}
                </span>
            ),
        },
        {
            header: 'Redirect URIs',
            cell: (c) => <span className="text-xs text-gray-500 truncate max-w-[200px] block">{c.redirect_uris?.join(', ')}</span>,
            className: 'hidden md:table-cell'
        },
        {
            header: 'Actions',
            className: 'text-right w-24',
            cell: (c) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(c); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-blue-400"
                        title="Edit Client"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(c); }}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-red-400"
                        title="Delete Client"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="w-full mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Ecosystem Integration</h1>
                    <p className="text-sm text-gray-400">Manage OIDC clients to enable Single Sign-On for your company's applications</p>
                </div>
                <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> <span>Register Application</span>
                </button>
            </div>

            <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark w-full md:w-auto self-start">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredClients}
                keyExtractor={(c) => c.id}
                isLoading={isLoading}
                emptyMessage="No applications registered yet. Add your first app to start the integration."
            />

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Register New Application</h2>
                            <p className="text-sm text-gray-400 mt-1">Get OIDC credentials for your external application</p>
                        </div>

                        {registrationResult ? (
                            <div className="p-6 space-y-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
                                    <ShieldCheck className="text-green-400 mt-1" size={20} />
                                    <div>
                                        <p className="text-sm font-semibold text-green-400">Registration Successful</p>
                                        <p className="text-xs text-green-500/70">Save these credentials. The secret will not be shown again.</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Client ID</label>
                                        <div className="mt-1 flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700">
                                            <code className="text-xs text-indigo-400 flex-1">{registrationResult.client_id}</code>
                                            <button onClick={() => handleCopy(registrationResult.client_id, 'res-id')} className="text-gray-400 hover:text-white">
                                                {copiedId === 'res-id' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    {registrationResult.client_secret && (
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase font-bold">Client Secret</label>
                                            <div className="mt-1 flex items-center gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700">
                                                <code className="text-xs text-amber-400 flex-1">{registrationResult.client_secret}</code>
                                                <button onClick={() => handleCopy(registrationResult.client_secret!, 'res-sec')} className="text-gray-400 hover:text-white">
                                                    {copiedId === 'res-sec' ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                                            <AlertCircle size={10} className="inline mr-1 mb-0.5" />
                                            Warning: You cannot retrieve this secret later. If lost, you'll need to regenerate it (or create a new client).
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setShowRegisterModal(false); setRegistrationResult(null); }}
                                    className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all mt-4"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRegisterSubmit}>
                                <div className="p-6 space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Application Name</label>
                                        <input
                                            type="text"
                                            value={newClient.client_name}
                                            onChange={(e) => setNewClient({ ...newClient, client_name: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            placeholder="e.g. Acme Dashboard, Mobile App"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-sm font-medium text-gray-300">Redirect URIs</label>
                                            <button
                                                type="button"
                                                onClick={handleAddRedirectUri}
                                                className="text-[10px] font-bold text-primary hover:underline uppercase"
                                            >+ Add URI</button>
                                        </div>
                                        <div className="space-y-2">
                                            {newClient.redirect_uris.map((uri, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={uri}
                                                        onChange={(e) => handleRedirectUriChange(index, e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                        placeholder="https://app.example.com/callback"
                                                        required
                                                    />
                                                    {newClient.redirect_uris.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveRedirectUri(index)}
                                                            className="p-2 text-gray-500 hover:text-red-400"
                                                        ><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-200">Public Client</p>
                                            <p className="text-xs text-gray-500">Native or SPA apps that cannot securely store secrets</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newClient.is_public}
                                                onChange={(e) => setNewClient({ ...newClient, is_public: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowRegisterModal(false)}
                                        className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={registerMutation.isPending}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {registerMutation.isPending ? 'Registering...' : <><Plus size={16} /> Register App</>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Edit Application</h2>
                            <p className="text-sm text-gray-400 mt-1">Update OIDC client configuration</p>
                        </div>

                        <form onSubmit={handleEditSubmit}>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Application Name</label>
                                    <input
                                        type="text"
                                        value={editClientData.client_name}
                                        onChange={(e) => setEditClientData({ ...editClientData, client_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Acme Dashboard, Mobile App"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-gray-300">Redirect URIs</label>
                                        <button
                                            type="button"
                                            onClick={handleAddEditRedirectUri}
                                            className="text-[10px] font-bold text-primary hover:underline uppercase"
                                        >+ Add URI</button>
                                    </div>
                                    <div className="space-y-2">
                                        {(editClientData.redirect_uris || []).map((uri, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={uri}
                                                    onChange={(e) => handleEditRedirectUriChange(index, e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                    placeholder="https://app.example.com/callback"
                                                    required
                                                />
                                                {(editClientData.redirect_uris || []).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEditRedirectUri(index)}
                                                        className="p-2 text-gray-500 hover:text-red-400"
                                                    ><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-200">Public Client</p>
                                        <p className="text-xs text-gray-500">Native or SPA apps that cannot securely store secrets</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editClientData.is_public}
                                            onChange={(e) => setEditClientData({ ...editClientData, is_public: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
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
                                    disabled={updateMutation.isPending}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                title="Delete Integration"
                message={`Are you sure you want to delete "${selectedClient?.client_name}"? This will immediately break Single Sign-On for this application.`}
                variant="danger"
                confirmText="Delete Integration"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

export default OIDCClientManagement;
