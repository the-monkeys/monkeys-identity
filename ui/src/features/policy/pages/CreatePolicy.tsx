import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Save, X, Code } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { policyAPI } from '../api/policy';

const CreatePolicy = () => {
    const navigate = useNavigate();
    const [formError, setFormError] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: policyAPI.createPolicy,
        onSuccess: () => {
            navigate('/policies');
        },
        onError: (error: any) => {
            setFormError(error.response?.data?.message || 'Failed to create policy');
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);

        const formData = new FormData(e.currentTarget);
        const jsonContent = formData.get('document') as string;

        try {
            const parsedDoc = JSON.parse(jsonContent);

            const requestData: any = {
                name: formData.get('name'),
                description: formData.get('description'),
                version: formData.get('version'),
                organization_id: formData.get('organization_id'),
                document: parsedDoc,
                policy_type: formData.get('policy_type'),
                effect: formData.get('effect'),
                is_system_policy: formData.get('is_system_policy'),
                status: formData.get('status'),
            };

            createMutation.mutate(requestData);
        } catch (e) {
            setFormError('Invalid JSON document');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-row items-center justify-between gap-4 mb-6">
                    <div>
                        <nav className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
                            <Link to="/policies" className="hover:text-primary transition-colors">Policies</Link>
                            <ChevronRight size={12} />
                            <span className="text-gray-300 font-medium">Create Policy</span>
                        </nav>
                        <h1 className="text-2xl font-bold text-text-main-dark">Create New Policy</h1>
                        <p className="text-gray-400 text-sm">Define a new set of permissions for your primate users.</p>
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
                            disabled={createMutation.isPending}
                            className="px-6 py-2 text-sm font-semibold text-white bg-primary/80 rounded-md shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createMutation.isPending ? 'Creating...' : <><Save size={16} /> Create Policy</>}
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
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Policy Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. StorageAccess"
                                    className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600"
                                />
                            </>

                            <>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none transition-colors placeholder:text-gray-600 resize-none"
                                    placeholder="What does this policy allow?"
                                />
                            </>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Type</label>
                                    <select
                                        name="policy_type"
                                        className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none"
                                        defaultValue="Custom"
                                    >
                                        <option value="Custom">Custom</option>
                                        <option value="Managed">Managed</option>
                                        <option value="Infrastructure">Infrastructure</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                                    <select
                                        name="status"
                                        className="w-full px-3 py-2 bg-slate-900 border border-border-color-dark rounded text-sm text-text-main-dark focus:border-primary focus:outline-none"
                                        defaultValue="Active"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Reviewing">Reviewing</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-border-color-dark mt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-300">System Policy</span>
                                    <button
                                        type="button"
                                        className='relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none'
                                    >
                                        <span className='inline-block h-4 w-4 transform rounded-full bg-white transition-transform' />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 italic">System policies cannot be deleted by standard monkeys.</p>
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
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Top-Level Effect:</label>
                                        <select
                                            name="effect"
                                            className="text-[10px] font-bold py-0.5 px-2 rounded border border-border-color-dark bg-slate-800 text-text-main-dark focus:outline-none"
                                            defaultValue="Allow"
                                        >
                                            <option value="Allow">Allow</option>
                                            <option value="Deny">Deny</option>
                                        </select>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-500">Ver: 2024-05-01</span>
                                </div>
                            </div>
                            <div className="flex-1 relative bg-[#0d1117]">
                                <textarea
                                    name="document"
                                    className="w-full h-full p-6 font-mono text-xs bg-transparent text-green-400 outline-none resize-none leading-relaxed"
                                    spellCheck={false}
                                    defaultValue={JSON.stringify({
                                        Version: "2024-05-01",
                                        Statement: [
                                            {
                                                Effect: "Allow",
                                                Action: ["fruit:Fetch"],
                                                Resource: "*"
                                            }
                                        ]
                                    }, null, 2)}
                                />
                            </div>
                            <div className="p-3 bg-slate-900 border-t border-border-color-dark flex items-center justify-between">
                                <p className="text-[10px] text-gray-500 font-mono">Organization: jgl-root-org</p>
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
