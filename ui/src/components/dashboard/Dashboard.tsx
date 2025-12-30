import { useState } from 'react';
import { AlertCircle, Search, Filter, MoreVertical, Shield, ShieldAlert, CheckCircle, RotateCw, ExternalLink } from 'lucide-react';

import { mockIdentities, mockSummary } from '@/constants/dashboard';

const Dashboard = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredIdentities = mockIdentities.filter(id =>
        id.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">IAM Overview</h1>
                    <p className="text-sm text-gray-400">Account: monkeys-production-01 (7721-0092-1244)</p>
                </div>
                <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-slate-800 border border-border-color-dark rounded-md text-sm font-semibold hover:bg-slate-700 transition-colors">
                        Export Reports
                    </button>
                    <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-opacity-90 transition-all">
                        Create New Identity
                    </button>
                </div>
            </div>

            {/* Top Row: Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {mockSummary.map((m, i) => (
                    <div key={i} className="bg-bg-card-dark border border-border-color-dark rounded-xl p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{m.label}</p>
                            <div className="flex items-baseline space-x-2">
                                <h3 className="text-3xl font-bold">{m.value}</h3>
                                <span className={`text-xs font-bold ${m.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {m.change >= 0 ? '+' : ''}{m.change}%
                                </span>
                            </div>
                        </div>
                        <div className="h-12 flex items-end justify-between space-x-1">
                            {m.data.map((v, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 rounded-t-sm ${m.label === 'Security Alerts' ? 'bg-red-500/20' : 'bg-primary/20'}`}
                                    style={{ height: `${(v / Math.max(...m.data)) * 100}%` }}
                                >
                                    <div
                                        className={`w-full rounded-t-sm h-full ${m.label === 'Security Alerts' ? 'bg-red-500' : 'bg-primary'}`}
                                        style={{ opacity: 0.5 }}
                                    ></div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Center: Data Table */}
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border-color-dark flex flex-col md:flex-row justify-between gap-4">
                            <h2 className="font-bold flex items-center space-x-2">
                                <span>Recently Modified Identities</span>
                                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full font-mono text-gray-500">{filteredIdentities.length}</span>
                            </h2>
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter list..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-slate-900 border border-border-color-dark rounded-lg text-sm focus:outline-none focus:border-primary transition-all w-full md:w-64"
                                    />
                                </div>
                                <button className="p-2 border border-border-color-dark rounded-lg hover:bg-slate-800 text-gray-500 transition-colors">
                                    <Filter size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-border-color-dark">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Resource ARN</th>
                                        <th className="px-6 py-4">Last Modified</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color-dark">
                                    {filteredIdentities.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4 font-semibold">{item.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${item.type === 'Role' ? 'bg-blue-100/10 border-blue-500/30 text-blue-500' :
                                                    item.type === 'Group' ? 'bg-purple-100/10 border-purple-500/30 text-purple-500' :
                                                        'bg-primary/10 border-primary/30 text-primary'
                                                    }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-[11px] text-gray-400 group-hover:text-text-main-dark transition-colors">
                                                {item.arn}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{item.lastModified}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Active' ? 'bg-green-500' :
                                                        item.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}></div>
                                                    <span className="text-xs">{item.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-1 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-text-main-dark">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredIdentities.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">No identities found matching your criteria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Simple Policy Preview/Editor Widget */}
                    <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm">
                        <div className="p-4 border-b border-border-color-dark flex justify-between items-center">
                            <h2 className="font-bold flex items-center space-x-2">
                                <Shield size={18} className="text-primary" />
                                <span>Quick Policy Editor</span>
                            </h2>
                            <div className="flex space-x-2">
                                <button className="text-[10px] font-bold uppercase px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors">JSON View</button>
                                <button className="text-[10px] font-bold uppercase px-3 py-1 text-gray-400 hover:text-text-main-dark transition-colors">Visual Editor</button>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-900/50 font-mono text-sm">
                            <div className="space-y-1">
                                <p><span className="text-primary">"Version"</span>: <span className="text-blue-400">"2025-01-24"</span>,</p>
                                <p><span className="text-primary">"Statement"</span>: [</p>
                                <div className="pl-6">
                                    <p>{"{"}</p>
                                    <div className="pl-6">
                                        <p><span className="text-primary">"Effect"</span>: <span className="text-blue-400">"Allow"</span>,</p>
                                        <p><span className="text-primary">"Action"</span>: [</p>
                                        <div className="pl-6">
                                            <p><span className="text-blue-400">"iam:ListAccessKeys"</span>,</p>
                                            <p><span className="text-blue-400">"iam:GetAccessKeyLastUsed"</span></p>
                                        </div>
                                        <p>],</p>
                                        {/* Fix: use a safe JSX expression to avoid 'Cannot find name aws' error from template literal syntax */}
                                        <p><span className="text-primary">"Resource"</span>: <span className="text-blue-400">"arn:monkeys-iam::7721:user/{"$"}{"{aws:username}"}"</span></p>
                                    </div>
                                    <p>{"}"}</p>
                                </div>
                                <p>]</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border-color-dark flex justify-end space-x-3">
                            <button className="text-sm font-semibold px-4 py-2 hover:bg-slate-800 rounded-md transition-colors">Discard</button>
                            <button className="text-sm font-semibold px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-all">Save Changes</button>
                        </div>
                    </div>
                </div>

                {/* Right Rail: Security Status */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm p-6">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center space-x-2">
                            <ShieldAlert size={14} className="text-primary" />
                            <span>Security Health</span>
                        </h2>

                        <div className="space-y-6">
                            {[
                                { label: 'Root MFA Status', status: 'Secure', icon: <CheckCircle className="text-green-500" size={16} /> },
                                { label: 'Unused Credentials', status: 'Warning', count: 12, icon: <AlertCircle className="text-yellow-500" size={16} /> },
                                { label: 'Key Rotation', status: 'Action Required', count: 4, icon: <RotateCw className="text-red-500" size={16} /> },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        <div className="mt-1">{item.icon}</div>
                                        <div>
                                            <p className="text-sm font-semibold leading-tight">{item.label}</p>
                                            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter">
                                                {item.status} {item.count ? `(${item.count} items)` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="text-primary hover:scale-110 transition-transform">
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-border-color-dark">
                            <div className="bg-slate-900 rounded-lg p-4">
                                <p className="text-xs font-bold text-gray-500 mb-2">SECURITY RECOMMENDATION</p>
                                <p className="text-xs leading-relaxed text-gray-400">
                                    You have 4 IAM Users without MFA enabled. Enforce MFA via an Account Password Policy to improve security score.
                                </p>
                                <button className="mt-3 text-xs font-bold text-primary hover:underline">Apply Policy Now</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 text-primary/10 group-hover:scale-125 transition-transform duration-700">
                            <Shield size={120} />
                        </div>
                        <h3 className="text-lg font-bold mb-2 relative z-10">Advanced Protection</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 relative z-10 mb-4 leading-relaxed">
                            Upgrade to Enterprise for hardware-backed keys and automated threat detection.
                        </p>
                        <button className="relative z-10 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                            Upgrade Plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
