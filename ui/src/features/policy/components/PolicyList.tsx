import React from 'react';
import { Policy } from '../types';
import { Search, Filter, FileText } from 'lucide-react';

interface PolicyListProps {
    policies: Policy[];
    selectedPolicy: Policy | null;
    onSelectPolicy: (policy: Policy) => void;
}

const PolicyList: React.FC<PolicyListProps> = ({ policies, selectedPolicy, onSelectPolicy }) => {
    return (
        <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border-color-dark flex flex-col md:flex-row justify-between gap-4 bg-slate-900/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Filter policies..."
                        className="pl-9 pr-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg text-sm focus:outline-none focus:border-primary transition-all w-full text-text-main-dark placeholder:text-gray-500"
                    />
                </div>
                <button className="p-2 border border-border-color-dark rounded-lg hover:bg-slate-800 text-gray-400 transition-colors">
                    <Filter size={18} />
                </button>
            </div>

            <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-border-color-dark sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-3">Policy Name</th>
                            <th className="px-6 py-3 hidden md:table-cell">Type</th>
                            <th className="px-6 py-3 hidden lg:table-cell">Usage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color-dark">
                        {policies.map((p) => (
                            <tr
                                key={p.id}
                                className={`cursor-pointer transition-colors group ${selectedPolicy?.id === p.id
                                    ? 'bg-primary/10 border-l-2 border-l-primary'
                                    : 'hover:bg-slate-800/50 border-l-2 border-l-transparent'
                                    }`}
                                onClick={() => onSelectPolicy(p)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${selectedPolicy?.id === p.id ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-gray-400 group-hover:text-text-main-dark'}`}>
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${selectedPolicy?.id === p.id ? 'text-primary' : 'text-text-main-dark'}`}>{p.name}</p>
                                            <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{p.description}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell">
                                    <span className={`px-2 py-0.5 text-[10px] rounded border uppercase font-bold ${p.type === 'Managed'
                                        ? 'bg-blue-100/10 border-blue-500/30 text-blue-500'
                                        : 'bg-purple-100/10 border-purple-500/30 text-purple-500'
                                        }`}>
                                        {p.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500 hidden lg:table-cell">
                                    {p.usageCount} attached
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-3 border-t border-border-color-dark bg-slate-900/30 text-[11px] text-gray-500 text-center">
                Showing {policies.length} policies
            </div>
        </div>
    );
};

export default PolicyList;
