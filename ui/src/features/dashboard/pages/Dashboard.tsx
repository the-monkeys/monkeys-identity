import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Users, Shield, Key, Database, Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import client from '@/pkg/api/client';

interface DashboardStats {
    totalUsers: number;
    totalRoles: number;
    totalGroups: number;
    totalPolicies: number;
}

interface RecentUser {
    id: string;
    email: string;
    display_name: string;
    status: string;
    created_at: string;
    role: string;
}

const Dashboard = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalRoles: 0, totalGroups: 0, totalPolicies: 0 });
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [usersRes, rolesRes, groupsRes, policiesRes] = await Promise.allSettled([
                    client.get('/users'),
                    client.get('/roles'),
                    client.get('/groups'),
                    client.get('/policies'),
                ]);

                const getCount = (res: PromiseSettledResult<any>) => {
                    if (res.status === 'fulfilled') {
                        const data = res.value.data;
                        // Handle our standard ListResult structure
                        if (data && typeof data.total === 'number') return data.total;

                        // Fallback to data.data checking
                        const nestedData = data?.data;
                        if (nestedData && typeof nestedData.total === 'number') return nestedData.total;

                        // Fallback to array length
                        const items = data?.items || nestedData?.items || data?.data || data || [];
                        return Array.isArray(items) ? items.length : 0;
                    }
                    return 0;
                };

                setStats({
                    totalUsers: getCount(usersRes),
                    totalRoles: getCount(rolesRes),
                    totalGroups: getCount(groupsRes),
                    totalPolicies: getCount(policiesRes),
                });

                if (usersRes.status === 'fulfilled') {
                    const users = usersRes.value.data?.data || usersRes.value.data || [];
                    setRecentUsers(
                        users.slice(0, 10).map((u: any) => ({
                            id: u.id,
                            email: u.email,
                            display_name: u.display_name || u.first_name || u.email,
                            status: u.status || 'active',
                            created_at: u.created_at,
                            role: u.role || 'user',
                        }))
                    );
                }
            } catch {
                // Errors handled per-request via allSettled
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const filteredUsers = recentUsers.filter(u =>
        u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
        <div className="p-6 rounded-xl border border-border-color-dark bg-bg-card-dark shadow-sm transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <div className="text-primary/70">{icon}</div>
            </div>
            <h3 className="text-2xl font-bold text-text-main-dark">
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-500" /> : value.toLocaleString()}
            </h3>
        </div>
    );

    return (
        <div className="w-full mx-auto">
            <div className="w-full flex flex-row justify-between items-center mb-8 gap-4">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-2xl font-bold text-text-main-dark">Overview</h1>
                    <p className="text-sm text-gray-300">
                        {user?.email ? `Welcome back, ${user.display_name || user.email}` : 'Real-time telemetry from all connected IAM accounts.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard label="Total Users" value={stats.totalUsers} icon={<Users size={18} />} />
                <MetricCard label="Roles" value={stats.totalRoles} icon={<Key size={18} />} />
                <MetricCard label="Groups" value={stats.totalGroups} icon={<Database size={18} />} />
                <MetricCard label="Policies" value={stats.totalPolicies} icon={<Shield size={18} />} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border-color-dark flex flex-col md:flex-row justify-between gap-4">
                            <h2 className="font-bold flex items-center space-x-2">
                                <span>Recent Users</span>
                                <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full font-mono text-gray-500">{filteredUsers.length}</span>
                            </h2>
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter users..."
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
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="ml-2 text-gray-400 text-sm">Loading...</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900/50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-border-color-dark">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Created</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color-dark">
                                        {filteredUsers.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                                <td className="px-6 py-4 font-semibold">{item.display_name}</td>
                                                <td className="px-6 py-4 text-gray-400">{item.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${item.role === 'admin' ? 'bg-amber-100/10 border-amber-500/30 text-amber-400' :
                                                        'bg-primary/10 border-primary/30 text-primary'
                                                        }`}>
                                                        {item.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-green-500' :
                                                            item.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}></div>
                                                        <span className="text-xs capitalize">{item.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-1 hover:bg-slate-700 rounded transition-colors text-gray-400 hover:text-text-main-dark">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                                                    {recentUsers.length === 0 ? 'No users found.' : 'No users match your filter.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
