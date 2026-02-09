import api from '@/pkg/api/client';
import { AuditLogFilters, AuditLogResponse } from '../types/audit';

export const fetchAuditLogs = async (
    filters: AuditLogFilters,
    page: number = 1,
    limit: number = 50
): Promise<AuditLogResponse> => {
    const offset = (page - 1) * limit;
    
    // Clean up undefined filters
    const validFilters: Record<string, string | number> = {
        limit,
        offset,
        ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
        ),
    };

    const response = await api.get<AuditLogResponse>('/audit/events', {
        params: validFilters,
    });
    return response.data;
};
