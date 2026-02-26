import client from '@/pkg/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentItem, ContentCollaborator, CreateContentRequest, UpdateContentRequest } from '../types';

export const contentKeys = {
    all: ['content'] as const,
    lists: () => [...contentKeys.all, 'list'] as const,
    list: (params: Record<string, any>) => [...contentKeys.lists(), params] as const,
    details: () => [...contentKeys.all, 'detail'] as const,
    detail: (id: string) => [...contentKeys.details(), id] as const,
    collaborators: (id: string) => [...contentKeys.detail(id), 'collaborators'] as const,
};

export const contentAPI = {
    list: (params?: Record<string, any>) =>
        client.get<any>('/content', { params }),

    get: (id: string) =>
        client.get<any>(`/content/${id}`),

    create: (data: CreateContentRequest) =>
        client.post<any>('/content', data),

    update: (id: string, data: UpdateContentRequest) =>
        client.put<any>(`/content/${id}`, data),

    delete: (id: string) =>
        client.delete(`/content/${id}`),

    updateStatus: (id: string, status: string) =>
        client.patch(`/content/${id}/status`, { status }),

    inviteCollaborator: (id: string, userId: string) =>
        client.post(`/content/${id}/collaborators`, { user_id: userId }),

    removeCollaborator: (id: string, userId: string) =>
        client.delete(`/content/${id}/collaborators/${userId}`),

    listCollaborators: (id: string) =>
        client.get<any>(`/content/${id}/collaborators`),
};

// ── Hooks ──────────────────────────────────────────────────────────────

export const useContentList = (params?: Record<string, any>) => {
    return useQuery({
        queryKey: contentKeys.list(params || {}),
        queryFn: async () => {
            const response = await contentAPI.list(params);
            const result = response.data as any;
            return {
                items: (result?.data?.items ?? []) as ContentItem[],
                total: result?.data?.total ?? 0,
                limit: result?.data?.limit ?? 20,
                offset: result?.data?.offset ?? 0,
                has_more: result?.data?.has_more ?? false,
                total_pages: result?.data?.total_pages ?? 0,
            };
        },
    });
};

export const useContent = (id: string) => {
    return useQuery({
        queryKey: contentKeys.detail(id),
        queryFn: async () => {
            const response = await contentAPI.get(id);
            const result = response.data as any;
            return {
                content: result?.data?.content as ContentItem,
                role: result?.data?.role as string,
            };
        },
        enabled: !!id,
    });
};

export const useCreateContent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: contentAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
        },
    });
};

export const useUpdateContent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateContentRequest }) =>
            contentAPI.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: contentKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
        },
    });
};

export const useDeleteContent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: contentAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
        },
    });
};

export const useUpdateContentStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            contentAPI.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
        },
    });
};

export const useContentCollaborators = (id: string) => {
    return useQuery({
        queryKey: contentKeys.collaborators(id),
        queryFn: async () => {
            const response = await contentAPI.listCollaborators(id);
            const result = response.data as any;
            return (result?.data ?? []) as ContentCollaborator[];
        },
        enabled: !!id,
    });
};

export const useInviteCollaborator = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ contentId, userId }: { contentId: string; userId: string }) =>
            contentAPI.inviteCollaborator(contentId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: contentKeys.collaborators(variables.contentId) });
        },
    });
};

export const useRemoveCollaborator = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ contentId, userId }: { contentId: string; userId: string }) =>
            contentAPI.removeCollaborator(contentId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: contentKeys.collaborators(variables.contentId) });
        },
    });
};
