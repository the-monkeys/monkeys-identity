import { useState } from 'react';
import { Search, Filter, MoreVertical, Plus } from 'lucide-react';

import { mockIdentities } from '@/constants/dashboard';
import MetricCard from '@/components/ui/MetricCard';

const Dashboard = () => {
    const [searchQuery, setSearchQuery] = useState('');


    const filteredIdentities = mockIdentities.filter(id =>
        id.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full mx-auto">
            <div className="w-full flex flex-row justify-between items-center mb-8 gap-4">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-2xl font-bold text-text-main-dark">Overview</h1>
                    <p className="text-sm text-gray-300">Real-time telemetry from all connected IAM accounts.</p>
                </div>
                <button className="px-4 py-2 bg-primary/80 text-white rounded-md text-sm font-semibold flex items-center space-x-4 hover:bg-primary/90 transition-all cursor-pointer">
                    <Plus size={16} /> Add Identity
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Total Identities" value="1,248" change="+12%" positive />
                <MetricCard label="Active Sessions" value="342" change="+5.4%" positive />
                <MetricCard label="Failed Logins (24h)" value="28" change="+82%" positive={false} />
                <MetricCard label="Policy Versions" value="94" change="0%" neutral />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
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
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
