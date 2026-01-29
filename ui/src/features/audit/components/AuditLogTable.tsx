
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../api/audit';
import { AuditLogFilters } from '../types/audit';
import { DataTable } from '@/components/ui/DataTable';
import { Loader2, Search, Filter } from 'lucide-react';

const AuditLogTable = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Local state for filters to avoid refetching on every keystroke
    const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '');
    const [principalDetails, setPrincipalDetails] = useState(searchParams.get('principal_id') || '');

    const filters: AuditLogFilters = {
        action: searchParams.get('action') || undefined,
        principal_id: searchParams.get('principal_id') || undefined,
        severity: searchParams.get('severity') || undefined,
        organization_id: searchParams.get('organization_id') || undefined,
    };

    const { data, isLoading, isError } = useQuery({
        queryKey: ['audit-logs', page, limit, filters],
        queryFn: () => fetchAuditLogs(filters, page, limit),
    });

    // Update URL when filters change
    const updateFilters = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        // Reset to page 1 when filtering
        newParams.set('page', '1');
        setSearchParams(newParams);
    };

    const handleSearch = () => {
        updateFilters('action', actionFilter);
        updateFilters('principal_id', principalDetails);
    };

    // Columns configuration for DataTable
    const columns = [
        { header: 'Time', accessor: 'timestamp', render: (val: unknown) => new Date(val as string).toLocaleString() },
        { header: 'Action', accessor: 'action', className: 'font-medium text-white' },
        { header: 'Actor', accessor: 'principal_id', render: (val: unknown, row: any) => row.principal_type === 'user' ? `User (${val})` : `System` },
        { header: 'Resource', accessor: 'resource_type', render: (val: unknown, row: any) => `${val} (${row.resource_id})` },
        {
            header: 'Result', accessor: 'result', render: (val: unknown) => (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${val === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    {(val as string).toUpperCase()}
                </span>
            )
        },
        { header: 'IP Address', accessor: 'ip_address' },
        {
            header: 'Severity', accessor: 'severity', render: (val: unknown) => (
                <span className={`px-2 py-1 rounded text-xs ${val === 'CRITICAL' ? 'bg-red-600/30 text-red-200' :
                    val === 'HIGH' ? 'bg-orange-500/20 text-orange-300' : 'text-gray-400'
                    }`}>
                    {val as string}
                </span>
            )
        },
        {
            header: 'Actions',
            className: 'w-[100px]',
            render: (val: unknown, row: any) => (
                <button className="text-xs text-primary hover:underline">View Details</button>
            )
        }
    ];

    if (isError) {
        return <div className="text-red-400 p-4">Failed to load audit logs. Please try again later.</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-bg-card-dark p-4 rounded-lg border border-border-color-dark">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-400 mb-1 block">Action</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter by action..."
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full bg-bg-main-dark border border-border-color-dark rounded-md py-2 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm text-gray-400 mb-1 block">Principal ID</label>
                    <input
                        type="text"
                        placeholder="Filter by user/actor ID..."
                        value={principalDetails}
                        onChange={(e) => setPrincipalDetails(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full bg-bg-main-dark border border-border-color-dark rounded-md py-2 px-4 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleSearch}
                        className="bg-primary text-bg-main-dark px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <DataTable
                    data={data?.data.events || []}
                    columns={columns}
                    keyExtractor={(item) => item.id}
                />
            )}

            {/* Pagination Controls - Simplified for MVP */}
            <div className="flex justify-between items-center text-sm text-gray-400">
                <div>
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data?.data.total_count || 0)} of {data?.data.total_count} events
                </div>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => {
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('page', (page - 1).toString());
                            setSearchParams(newParams);
                        }}
                        className="px-3 py-1 bg-bg-card-dark border border-border-color-dark rounded hover:bg-slate-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <button
                        disabled={!data || (page * limit >= data.data.total_count)}
                        onClick={() => {
                            const newParams = new URLSearchParams(searchParams);
                            newParams.set('page', (page + 1).toString());
                            setSearchParams(newParams);
                        }}
                        className="px-3 py-1 bg-bg-card-dark border border-border-color-dark rounded hover:bg-slate-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditLogTable;
