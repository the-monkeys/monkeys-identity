import React from 'react';
import { cn } from './utils';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T) => string | number;
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
}

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    isLoading = false,
    emptyMessage = 'No data available',
    onRowClick,
}: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className="w-full bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-gray-400">Loading data...</span>
            </div>
        );
    }

    return (
        <div className="w-full bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-border-color-dark">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={cn("px-4 py-4", col.className)}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color-dark">
                        {data.length > 0 ? (
                            data.map((item) => (
                                <tr
                                    key={keyExtractor(item)}
                                    onClick={() => onRowClick?.(item)}
                                    className={cn(
                                        "hover:bg-slate-800/50 transition-colors group",
                                        onRowClick && "cursor-pointer"
                                    )}
                                >
                                    {columns.map((col, idx) => (
                                        <td key={idx} className="px-4 py-4">
                                            {col.cell
                                                ? col.cell(item)
                                                : (col.accessorKey ? String(item[col.accessorKey]) : '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-6 py-12 text-center text-gray-500 italic"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
