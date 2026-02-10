import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesAPI } from './policies';

export interface Policy {
    id: string;
    name: string;
    description: string;
    document: string;
    effect: string;
    organization_id: string;
    version: number;
    status: string;
    created_at: string;
    updated_at: string;
    policy_type?: string;
    is_system_policy?: boolean;
    created_by?: string | null;
    approved_by?: string | null;
    approved_at?: string | null;
    deleted_at?: string | null;
}

export const policyKeys = {
    all: ['policies'] as const,
    lists: () => [...policyKeys.all, 'list'] as const,
    details: () => [...policyKeys.all, 'detail'] as const,
    detail: (id: string) => [...policyKeys.details(), id] as const,
};

export const usePolicies = () => {
    return useQuery({
        queryKey: policyKeys.lists(),
        queryFn: async () => {
            const response = await policiesAPI.list();
            return (response.data.items || []) as Policy[];
        },
    });
};

export const usePolicy = (id: string) => {
    return useQuery({
        queryKey: policyKeys.detail(id),
        queryFn: async () => {
            const response = await policiesAPI.get(id);
            return response.data as Policy;
        },
        enabled: !!id,
    });
};

export const useCreatePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Policy>) => policiesAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
        },
    });
};

export const useDeletePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => policiesAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
        },
    });
};

export const useUpdatePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Policy> }) => policiesAPI.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: policyKeys.detail(id) });
        },
    });
};

export const useSimulatePolicy = () => {
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => policiesAPI.simulate(id, data),
    });
};

export const usePolicyVersions = (id: string, isOpen: boolean) => {
    return useQuery({
        queryKey: [...policyKeys.detail(id), 'versions'],
        queryFn: async () => {
            const response = await policiesAPI.getVersions(id);
            return response.data as Policy[];
        },
        enabled: !!id && isOpen,
    });
};

export const useApprovePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => policiesAPI.approve(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: policyKeys.detail(id) });
        },
    });
};

export const useRollbackPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => policiesAPI.rollback(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
            queryClient.invalidateQueries({ queryKey: policyKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: [...policyKeys.detail(id), 'versions'] });
        },
    });
};
