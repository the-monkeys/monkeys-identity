
import client from '@/pkg/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Resource, ResourceListResponse, CreateResourceRequest, UpdateResourceRequest, ShareResourceRequest, ResourceAccessLog } from '../types';

export const resourceKeys = {
    all: ['resources'] as const,
    lists: () => [...resourceKeys.all, 'list'] as const,
    details: () => [...resourceKeys.all, 'detail'] as const,
    detail: (id: string) => [...resourceKeys.details(), id] as const,
    permissions: (id: string) => [...resourceKeys.detail(id), 'permissions'] as const,
    accessLogs: (id: string) => [...resourceKeys.detail(id), 'accessLogs'] as const,
};

export const resourceAPI = {
    list: (params?: any) =>
        client.get<ResourceListResponse>('/resources', { params }),

    get: (id: string) =>
        client.get<{ data: Resource }>(`/resources/${id}`),

    create: (data: CreateResourceRequest) =>
        client.post<{ data: Resource }>('/resources', data),

    update: (id: string, data: UpdateResourceRequest) =>
        client.put<{ data: Resource }>(`/resources/${id}`, data),

    delete: (id: string) =>
        client.delete(`/resources/${id}`),

    getPermissions: (id: string) =>
        client.get<{ data: any[] }>(`/resources/${id}/permissions`),

    setPermissions: (id: string, permissions: any[]) =>
        client.post(`/resources/${id}/permissions`, { permissions }),

    // Convenient sharing endpoints
    share: (id: string, data: ShareResourceRequest) =>
        client.post(`/resources/${id}/share`, data),

    unshare: (id: string, data: { principal_id: string; principal_type: string }) =>
        client.delete(`/resources/${id}/share`, { data }),

    getAccessLog: (id: string, params?: any) =>
        client.get<{ data: ResourceAccessLog[] }>(`/resources/${id}/access-log`, { params }),
};

export const useResources = (params?: any) => {
    return useQuery({
        queryKey: [...resourceKeys.lists(), params],
        queryFn: async () => {
            const response = await resourceAPI.list(params);
            const result = response.data as any;
            // Backend returns SuccessResponse { data: ListResult { items: Resource[] } }
            return (result?.data?.items ?? result?.items ?? result?.data ?? []) as Resource[];
        },
    });
};

export const useResource = (id: string) => {
    return useQuery({
        queryKey: resourceKeys.detail(id),
        queryFn: async () => {
            const response = await resourceAPI.get(id);
            return response.data.data;
        },
        enabled: !!id,
    });
};

export const useCreateResource = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resourceAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
        },
    });
};

export const useUpdateResource = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateResourceRequest }) =>
            resourceAPI.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: resourceKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
        },
    });
};

export const useDeleteResource = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resourceAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
        },
    });
};

export const useResourcePermissions = (id: string) => {
    return useQuery({
        queryKey: resourceKeys.permissions(id),
        queryFn: async () => {
            const response = await resourceAPI.getPermissions(id);
            return response.data.data;
        },
        enabled: !!id,
    });
};

export const useShareResource = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: ShareResourceRequest }) =>
            resourceAPI.share(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: resourceKeys.permissions(variables.id) });
        },
    });
};

export const useUnshareResource = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { principal_id: string; principal_type: string } }) =>
            resourceAPI.unshare(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: resourceKeys.permissions(variables.id) });
        },
    });
};

export const useResourceAccessLog = (id: string, params?: any) => {
    return useQuery({
        queryKey: [...resourceKeys.accessLogs(id), params],
        queryFn: async () => {
            const response = await resourceAPI.getAccessLog(id, params);
            return response.data.data;
        },
        enabled: !!id,
    });
};
