
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useServiceAccount,
    useServiceAccountKeys,
    useGenerateAPIKey,
    useRevokeAPIKey
} from '../api/serviceAccounts';
import { CreateAPIKeyRequest, GenerateAPIKeyResponse } from '../types';
import {
    ArrowLeft, Server, Shield, Key, Plus, Trash2,
    Copy, Check, AlertCircle, Clock
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const ServiceAccountDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showSecretModal, setShowSecretModal] = useState(false);
    const [generatedKey, setGeneratedKey] = useState<GenerateAPIKeyResponse['data'] | null>(null);
    const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [newKeyParams, setNewKeyParams] = useState<CreateAPIKeyRequest>({
        name: '',
        rate_limit_per_hour: 1000
    });

    const { data: sa, isLoading: isSALoading, error: saError } = useServiceAccount(id!);
    const { data: keys, isLoading: isKeysLoading } = useServiceAccountKeys(id!);

    const generateKeyMutation = useGenerateAPIKey();
    const revokeKeyMutation = useRevokeAPIKey();

    const handleGenerateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        generateKeyMutation.mutate({ saID: id, data: newKeyParams }, {
            onSuccess: (response) => {
                setGeneratedKey(response.data.data);
                setShowGenerateModal(false);
                setShowSecretModal(true);
                setNewKeyParams({ name: '', rate_limit_per_hour: 1000 });
            }
        });
    };

    const handleCopySecret = () => {
        if (generatedKey?.secret) {
            navigator.clipboard.writeText(generatedKey.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRevokeConfirm = () => {
        if (!id || !keyToRevoke) return;
        revokeKeyMutation.mutate({ saID: id, keyID: keyToRevoke }, {
            onSuccess: () => setKeyToRevoke(null)
        });
    };

    if (isSALoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (saError || !sa) return <div className="p-8 text-center text-red-400">Service Account not found</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/service-accounts')}
                className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={16} className="mr-1" /> Back to Service Accounts
            </button>

            {/* Header */}
            <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <Server size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">{sa.name}</h1>
                            <p className="text-sm text-gray-400">{sa.description}</p>
                        </div>
                    </div>
                    <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase border",
                        sa.status === 'active' ? 'bg-green-100/10 border-green-500/30 text-green-500' : 'bg-gray-100/10 text-gray-500'
                    )}>
                        {sa.status}
                    </span>
                </div>
            </div>

            {/* API Keys Section */}
            <div className="bg-bg-card-dark rounded-xl border border-border-color-dark p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key size={18} className="text-amber-400" />
                        API Keys
                    </h2>
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="px-3 py-1.5 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                        <Plus size={14} /> Generate Key
                    </button>
                </div>

                {isKeysLoading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-12 bg-slate-800 rounded"></div>
                        <div className="h-12 bg-slate-800 rounded"></div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {keys && keys.length > 0 ? (
                            keys.map((key) => (
                                <div key={key.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded bg-slate-700">
                                            <Shield size={16} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-200">{key.name}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                <span className="font-mono bg-slate-900 px-1.5 rounded">{key.key_id}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    Expires: {new Date(key.expires_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded border",
                                            key.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        )}>{key.status}</span>
                                        {key.status === 'active' && (
                                            <button
                                                onClick={() => setKeyToRevoke(key.id)}
                                                className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                                                title="Revoke Key"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 italic">No API keys found. Generate one to get started.</div>
                        )}
                    </div>
                )}
            </div>

            {/* Generate Key Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark">
                            <h2 className="text-lg font-bold text-white">Generate API Key</h2>
                        </div>
                        <form onSubmit={handleGenerateSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Key Name</label>
                                    <input
                                        type="text"
                                        value={newKeyParams.name}
                                        onChange={(e) => setNewKeyParams({ ...newKeyParams, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-border-color-dark rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        placeholder="e.g. Production Backend"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="p-4 border-t border-border-color-dark flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={generateKeyMutation.isPending}
                                    className="px-4 py-2 bg-primary/80 text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {generateKeyMutation.isPending ? 'Generating...' : 'Generate Key'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Secret Display Modal */}
            {showSecretModal && generatedKey && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-bg-card-dark rounded-2xl border border-border-color-dark w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-border-color-dark flex items-start gap-3">
                            <div className="p-2 bg-green-500/10 rounded-full text-green-500"><Check size={20} /></div>
                            <div>
                                <h2 className="text-lg font-bold text-white">API Key Generated</h2>
                                <p className="text-sm text-gray-400 mt-1">Make sure to copy your secret key now. You won't be able to see it again!</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 relative group">
                                <p className="text-xs uppercase font-bold text-gray-500 mb-2">Secret Key</p>
                                <code className="block font-mono text-sm text-green-400 break-all pr-8">
                                    {generatedKey.secret}
                                </code>
                                <button
                                    onClick={handleCopySecret}
                                    className="absolute top-2 right-2 p-1.5 hover:bg-slate-800 rounded text-gray-400 hover:text-white transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                <AlertCircle size={16} />
                                <span>Store this secret securely. It cannot be recovered.</span>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border-color-dark flex justify-end">
                            <button
                                onClick={() => setShowSecretModal(false)}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                I have saved it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!keyToRevoke}
                onClose={() => setKeyToRevoke(null)}
                onConfirm={handleRevokeConfirm}
                title="Revoke API Key"
                message="Are you sure you want to revoke this API key? Any applications using it will immediately lose access."
                variant="danger"
                isLoading={revokeKeyMutation.isPending}
            />
        </div>
    );
};

export default ServiceAccountDetailPage;
