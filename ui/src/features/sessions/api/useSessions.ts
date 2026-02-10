import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsAPI } from './sessions';

export interface Session {
    id: string;
    principal_id: string;
    principal_type: string;
    organization_id: string;
    ip_address: string;
    user_agent: string;
    device_fingerprint: string;
    status: string;       // 'active' | 'expired' | 'revoked'
    last_used_at: string;
    expires_at: string;
    issued_at: string;
    // joined from users
    username?: string;
    email?: string;
}

export const sessionKeys = {
    all: ['sessions'] as const,
    lists: () => [...sessionKeys.all, 'list'] as const,
    current: () => [...sessionKeys.all, 'current'] as const,
    detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
};

// GET /sessions — List all sessions
export const useSessions = () => {
    return useQuery({
        queryKey: sessionKeys.lists(),
        queryFn: async () => {
            const response = await sessionsAPI.list();
            // Backend returns { items: [...] }
            return (response.data.items || response.data.data || []) as Session[];
        },
    });
};

// GET /sessions/current — Get the caller's current session
export const useCurrentSession = () => {
    return useQuery({
        queryKey: sessionKeys.current(),
        queryFn: async () => {
            const response = await sessionsAPI.getCurrent();
            return response.data as Session;
        },
        retry: false,           // don't retry on 401
        throwOnError: false,    // don't propagate error to axios interceptor
    });
};

// GET /sessions/:id — Get a specific session
export const useSession = (id: string) => {
    return useQuery({
        queryKey: sessionKeys.detail(id),
        queryFn: async () => {
            const response = await sessionsAPI.get(id);
            return response.data as Session;
        },
        enabled: !!id,
    });
};

// DELETE /sessions/:id — Admin revoke a specific session
export const useRevokeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => sessionsAPI.revoke(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        },
    });
};

// DELETE /sessions/current — Revoke the caller's own current session
export const useRevokeCurrentSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => sessionsAPI.revokeCurrent(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: sessionKeys.current() });
        },
    });
};

// POST /sessions/:id/extend — Extend a session
export const useExtendSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => sessionsAPI.extend(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) });
        },
    });
};
