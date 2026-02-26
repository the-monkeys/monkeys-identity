
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../api/audit';
import { AuditLogFilters } from '../types/audit';
import { DataTable } from '@/components/ui/DataTable';
import { Loader2, Search, Filter, AlertCircle } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { extractErrorMessage } from '@/pkg/api/errorUtils';

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

    const { data, isLoading, isError, error } = useQuery({
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

    const columns = [
        {
            header: 'Time',
            cell: (row: any) => <span className="text-xs text-gray-500">{new Date(row.timestamp).toLocaleString()}</span>,
            className: 'w-48'
        },
        {
            header: 'Action',
            cell: (row: any) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-200">{row.action}</span>
                    <span className="text-[10px] text-gray-500 font-mono italic">{row.id.substring(0, 8)}</span>
                </div>
            )
        },
        {
            header: 'Actor',
            cell: (row: any) => (
                <div className="flex flex-col">
                    <span className="text-sm text-gray-300">{row.principal_type}</span>
                    <span className="text-[11px] text-gray-500 font-mono truncate max-w-[120px]" title={row.principal_id || ''}>
                        {row.principal_id ? row.principal_id.substring(0, 8) + '...' : 'System'}
                    </span>
                </div>
            )
        },
        {
            header: 'Resource',
            cell: (row: any) => (
                <div className="flex flex-col">
                    <span className="text-sm text-gray-300">{row.resource_type}</span>
                    <span className="text-[11px] text-gray-500 font-mono truncate max-w-[120px]" title={row.resource_id || ''}>
                        {row.resource_id ? row.resource_id.substring(0, 8) + '...' : 'N/A'}
                    </span>
                </div>
            )
        },
        {
            header: 'Result',
            cell: (row: any) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                    row.result === 'success' ? 'bg-green-100/10 border-green-500/30 text-green-500' : 'bg-red-100/10 border-red-500/30 text-red-500'
                )}>
                    {row.result}
                </span>
            )
        },
        {
            header: 'Severity',
            cell: (row: any) => (
                <span className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                    row.severity === 'CRITICAL' ? 'bg-red-600/20 text-red-400' :
                        row.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                            row.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-gray-100/10 text-gray-400'
                )}>
                    {row.severity}
                </span>
            )
        }
    ];

    if (isError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-400 flex items-center space-x-2 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <AlertCircle size={20} />
                    <span>{extractErrorMessage(error, 'Failed to load audit logs')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search & Filter Section */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark flex-1 md:flex-none">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by action..."
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full"
                        />
                    </div>
                    <div className="h-4 w-[1px] bg-border-color-dark mx-1"></div>
                    <button
                        onClick={handleSearch}
                        className="p-2 hover:bg-slate-800 rounded-md text-gray-400 transition-colors"
                        title="Apply Filter"
                    >
                        <Filter size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-bg-card-dark p-1 rounded-lg border border-border-color-dark flex-1 md:flex-none">
                    <input
                        type="text"
                        placeholder="Actor ID..."
                        value={principalDetails}
                        onChange={(e) => setPrincipalDetails(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="px-4 py-2 bg-transparent text-sm focus:outline-none text-gray-200 placeholder-gray-500 w-full md:w-48"
                    />
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns as any}
                data={data?.data.events || []}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No audit logs found."
            />

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
