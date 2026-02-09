import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Save, X, Code } from 'lucide-react';

import client from '@/pkg/api/client';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';
import { useGetPolicyById } from '@/hooks/policy/useGetPolicyById';
import { useUpdatePolicy } from '@/hooks/policy/useUpdatePolicy';

const CreatePolicy = () => {
    const navigate = useNavigate();
    const { policyId } = useParams<{ policyId: string }>();
    const { data: existingPolicy, isLoading: _isLoadingPolicy } = useGetPolicyById(policyId);
    const { mutateAsync: updatePolicy } = useUpdatePolicy();

    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSystemPolicy, setIsSystemPolicy] = useState<boolean>(false);

    useEffect(() => {
        if (existingPolicy) {
            setIsSystemPolicy(existingPolicy.is_system_policy);
        }
    }, [existingPolicy]);

    const isEditMode = !!policyId;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);

        const formData = new FormData(e.currentTarget);

        let documentJson: object;
        try {
            const documentStr = formData.get('document') as string;
            documentJson = JSON.parse(documentStr);
        } catch (e) {
            setFormError('Invalid JSON document');
            return;
        }

        const policyData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            version: formData.get('version') as string,
            organization_id: currentUser?.organization_id,
            policy_type: (formData.get('policy_type') as string).toLowerCase(),
            effect: (formData.get('effect') as string).toLowerCase(),
            is_system_policy: isSystemPolicy,
            status: (formData.get('status') as string).toLowerCase(),
            document: documentJson,
        };

        try {
            setLoading(true);
            if (isEditMode) {
                await updatePolicy({ id: policyId!, data: policyData });
            } else {
                await client.post('/policies', policyData);
            }
            navigate('/policies');
        } catch (e) {
            console.error(e);
            setFormError('Failed to create policy');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <form onSubmit={handleSubmit} key={existingPolicy ? existingPolicy.id : 'new'}>
                <div className="flex flex-row items-center justify-between gap-4 mb-6">
                    <div>
                        <nav className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
                            <Link to="/policies" className="hover:text-primary transition-colors">Policies</Link>
                            <ChevronRight size={12} />
                            <span className="text-gray-300 font-medium">{isEditMode ? 'Edit Policy' : 'Create Policy'}</span>
                        </nav>
                        <h1 className="text-2xl font-bold text-text-main-dark">{isEditMode ? 'Edit Policy' : 'Create New Policy'}</h1>
                        <p className="text-gray-400 text-sm">{isEditMode ? 'Update existing permissions.' : 'Define a new set of permissions for your primate users.'}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={() => navigate('/policies')}
                            className="px-4 py-2 text-sm font-semibold text-gray-400 border border-border-color-dark rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <X size={16} /> Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-sm font-semibold text-white bg-primary/80 rounded-md shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : <><Save size={16} /> {isEditMode ? 'Update Policy' : 'Create Policy'}</>}
                        </button>
                    </div>
                </div>

                {formError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-md text-sm mb-6">
                        {formError}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm p-6 space-y-4">
                            <h3 className="text-sm font-bold text-text-main-dark uppercase tracking-wider mb-4 border-b border-border-color-dark pb-2">General Settings</h3>

                            <>
                                <label htmlFor="name" className="block text-xs font-bold text-gray-400 uppercase mb-1">Policy Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    required
                                    defaultValue={existingPolicy?.name}
                                    placeholder="e.g. Read Access"
                                    className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600"
                                />
                            </>

                            <>
                                <label htmlFor="description" className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                                <textarea
                                    name="description"
                                    id="description"
                                    rows={2}
                                    defaultValue={existingPolicy?.description}
                                    className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600 resize-none"
                                    placeholder="What does this policy allow?"
                                />
                            </>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="policy_type" className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
                                    <select
                                        name="policy_type"
                                        id="policy_type"
                                        className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none"
                                        defaultValue={existingPolicy?.policy_type || "access"}
                                    >
                                        <option value="access">Access</option>
                                        <option value="resource">Resource</option>
                                        <option value="identity">Identity</option>
                                        <option value="permission">Permission</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="status" className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                                    <select
                                        name="status"
                                        id="status"
                                        className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none"
                                        defaultValue={existingPolicy?.status || "active"}
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="effect" className="block text-xs font-bold text-gray-400 uppercase mb-1">Effect</label>
                                    <select
                                        name="effect"
                                        id="effect"
                                        className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none"
                                        defaultValue={existingPolicy?.effect || "allow"}
                                    >
                                        <option value="allow">Allow</option>
                                        <option value="deny">Deny</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="version" className="block text-xs font-bold text-gray-400 uppercase mb-1">Version</label>
                                    <input
                                        type="text"
                                        name="version"
                                        id="version"
                                        defaultValue={existingPolicy?.version || "1.0.0"}
                                        className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border-color-dark mt-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="system_policy" className="text-sm font-medium text-gray-300">System Policy</label>
                                    <button
                                        type="button"
                                        name="system_policy"
                                        id="system_policy"
                                        onClick={() => setIsSystemPolicy(!isSystemPolicy)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isSystemPolicy ? 'bg-primary' : 'bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSystemPolicy ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 italic">System policies cannot be deleted by standard users.</p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7 flex flex-col space-y-4">
                        <div className="flex-1 bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                            <div className="px-6 py-4 border-b border-border-color-dark flex items-center justify-between bg-slate-900/50">
                                <h3 className="text-sm font-bold text-text-main-dark uppercase tracking-wider flex items-center gap-2">
                                    <Code size={16} className="text-gray-400" />
                                    Policy Document (JSON)
                                </h3>
                            </div>
                            <div className="flex-1 relative bg-[#0d1117]">
                                <textarea
                                    name="document"
                                    className="w-full h-full p-6 font-mono text-xs bg-transparent text-green-400 outline-none resize-none leading-relaxed"
                                    spellCheck={false}
                                    defaultValue={existingPolicy ? (typeof existingPolicy.document === 'string' ? existingPolicy.document : JSON.stringify(existingPolicy.document, null, 2)) : JSON.stringify({
                                        "Version": "1.0.0",
                                        "Statement": [
                                            {
                                                "Effect": "Allow",
                                                "Action": [
                                                    "resource:Read",
                                                    "resource:List",
                                                    "resource:Write"
                                                ],
                                                "Resource": [
                                                    "arn:monkeys:service:region:account:resource/*"
                                                ]
                                            }
                                        ]
                                    }, null, 2)}
                                />
                            </div>
                            <div className="p-3 bg-slate-900 border-t border-border-color-dark flex items-center justify-between">
                                <p className="text-[10px] text-gray-500 font-mono">Organization id: {currentUser?.organization_id}</p>
                                <button
                                    type="button"
                                    className="text-[10px] text-primary font-bold hover:text-primary/80 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                                >
                                    Format Document
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreatePolicy;
