import React, { useState, useMemo } from 'react';
import { Policy, PolicyDocument, PolicyStatement } from '../types';
import { Braces, Eye, Copy, Check } from 'lucide-react';

interface PolicyVisualizerProps {
    policy: Policy;
}

const PolicyVisualizer: React.FC<PolicyVisualizerProps> = ({ policy }) => {
    const [view, setView] = useState<'visual' | 'json'>('visual');
    const [copied, setCopied] = useState(false);

    const parsedDocument = useMemo((): PolicyDocument | null => {
        if (typeof policy.document === 'string') {
            try {
                return JSON.parse(policy.document) as PolicyDocument;
            } catch (e) {
                console.error("Failed to parse policy document", e);
                return null;
            }
        }
        return policy.document as PolicyDocument;
    }, [policy.document]);

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(parsedDocument, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="bg-slate-900/50 border-b border-border-color-dark px-6 py-4 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-text-main-dark text-lg flex items-center gap-2">
                        {policy.name}
                        <span className="text-xs font-normal text-gray-500 px-2 py-0.5 border border-border-color-dark rounded-full bg-slate-800">
                            {policy.policy_type}
                        </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{policy.description}</p>
                </div>
                <div className="flex bg-slate-900 border border-border-color-dark rounded-lg p-1">
                    <button
                        onClick={() => setView('visual')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${view === 'visual'
                            ? 'bg-primary/20 text-primary shadow-sm'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800'
                            }`}
                    >
                        <Eye size={14} /> Visual
                    </button>
                    <button
                        onClick={() => setView('json')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${view === 'json'
                            ? 'bg-primary/20 text-primary shadow-sm'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800'
                            }`}
                    >
                        <Braces size={14} /> JSON
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-bg-main-dark/50 relative">
                {view === 'visual' ? (
                    <div className="p-6 space-y-4">
                        {parsedDocument?.Statement?.map((stmt: PolicyStatement, i: number) => (
                            <div
                                key={i}
                                className={`rounded-lg border overflow-hidden transition-all hover:shadow-md ${stmt.Effect === 'Allow'
                                    ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                    : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                    }`}
                            >
                                <div className={`px-4 py-2 border-b flex items-center justify-between ${stmt.Effect === 'Allow' ? 'border-green-500/10 bg-green-500/10' : 'border-red-500/10 bg-red-500/10'
                                    }`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${stmt.Effect === 'Allow' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {stmt.Effect}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">Statement {i + 1}</span>
                                </div>

                                <div className="p-4 space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Actions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(stmt.Action) ? stmt.Action.map((a: string) => (
                                                <span key={a} className="bg-slate-800 px-2 py-1 border border-border-color-dark rounded text-xs text-gray-300 font-mono">
                                                    {a}
                                                </span>
                                            )) : (
                                                <span className="bg-slate-800 px-2 py-1 border border-border-color-dark rounded text-xs text-gray-300 font-mono">
                                                    {stmt.Action}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Resource</p>
                                        <div className="bg-slate-900/50 p-2 rounded border border-border-color-dark flex flex-wrap gap-2">
                                            {Array.isArray(stmt.Resource) ? stmt.Resource.map((r: string) => (
                                                <span key={r} className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded break-all">
                                                    {r}
                                                </span>
                                            )) : (
                                                <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded break-all">
                                                    {stmt.Resource}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full relative group">
                        <button
                            onClick={handleCopy}
                            className="absolute top-4 right-4 p-2 bg-slate-800 rounded-md border border-border-color-dark text-gray-400 hover:text-white transition-colors z-10 opacity-0 group-hover:opacity-100"
                            title="Copy JSON"
                        >
                            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                        <pre className="p-6 text-sm font-mono text-gray-300 h-full overflow-auto leading-relaxed">
                            {JSON.stringify(parsedDocument, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 border-t border-border-color-dark px-4 py-2 text-[10px] text-gray-500 font-mono flex justify-between">
                <span>ID: {policy.id}</span>
                <span>Version: {policy.version || parsedDocument?.Version || 'N/A'}</span>
            </div>
        </div>
    );
};

export default PolicyVisualizer;
