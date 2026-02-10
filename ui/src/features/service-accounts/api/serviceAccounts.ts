
import client from '@/pkg/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ServiceAccount,
    ServiceAccountListResponse,
    CreateServiceAccountRequest,
    UpdateServiceAccountRequest,
    APIKey,
    CreateAPIKeyRequest,
    GenerateAPIKeyResponse
} from '../types';

export const serviceAccountKeys = {
    all: ['service-accounts'] as const,
    lists: () => [...serviceAccountKeys.all, 'list'] as const,
    details: () => [...serviceAccountKeys.all, 'detail'] as const,
    detail: (id: string) => [...serviceAccountKeys.details(), id] as const,
    keys: (id: string) => [...serviceAccountKeys.detail(id), 'keys'] as const,
};

export const serviceAccountAPI = {
    list: (params?: any) =>
        client.get<ServiceAccountListResponse>('/service-accounts', { params }),

    get: (id: string) =>
        client.get<{ data: ServiceAccount }>(`/service-accounts/${id}`),

    create: (data: CreateServiceAccountRequest) =>
        client.post<{ data: ServiceAccount }>('/service-accounts', data),

    update: (id: string, data: UpdateServiceAccountRequest) =>
        client.put<{ data: ServiceAccount }>(`/service-accounts/${id}`, data),

    delete: (id: string) =>
        client.delete<{ data: { id: string } }>(`/service-accounts/${id}`),

    // API Keys
    listKeys: (saID: string) =>
        client.get<{ data: APIKey[] }>(`/service-accounts/${saID}/keys`),

    generateKey: (saID: string, data: CreateAPIKeyRequest) =>
        client.post<{ data: GenerateAPIKeyResponse['data'] }>(`/service-accounts/${saID}/keys`, data),

    revokeKey: (saID: string, keyID: string) =>
        client.delete<{ data: any }>(`/service-accounts/${saID}/keys/${keyID}`),
};

export const useServiceAccounts = (params?: any) => {
    return useQuery({
        queryKey: [...serviceAccountKeys.lists(), params],
        queryFn: async () => {
            const response = await serviceAccountAPI.list(params);
            // The backend returns { data: { items: [...] } }
            return response.data.data.items || [];
        },
    });
};

export const useServiceAccount = (id: string) => {
    return useQuery({
        queryKey: serviceAccountKeys.detail(id),
        queryFn: async () => {
            const response = await serviceAccountAPI.get(id);
            return response.data.data;
        },
        enabled: !!id,
    });
};

export const useCreateServiceAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: serviceAccountAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceAccountKeys.lists() });
        },
    });
};

export const useDeleteServiceAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: serviceAccountAPI.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceAccountKeys.lists() });
        },
    });
};

export const useUpdateServiceAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateServiceAccountRequest }) =>
            serviceAccountAPI.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceAccountKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: serviceAccountKeys.lists() });
        },
    });
};

export const useServiceAccountKeys = (saID: string) => {
    return useQuery({
        queryKey: serviceAccountKeys.keys(saID),
        queryFn: async () => {
            const response = await serviceAccountAPI.listKeys(saID);
            return response.data.data;
        },
        enabled: !!saID,
    });
};

export const useGenerateAPIKey = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ saID, data }: { saID: string; data: CreateAPIKeyRequest }) =>
            serviceAccountAPI.generateKey(saID, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceAccountKeys.keys(variables.saID) });
        },
    });
};

export const useRevokeAPIKey = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ saID, keyID }: { saID: string; keyID: string }) =>
            serviceAccountAPI.revokeKey(saID, keyID),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceAccountKeys.keys(variables.saID) });
        },
    });
};
