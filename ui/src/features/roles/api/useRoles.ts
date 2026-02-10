import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesAPI } from './roles';

export interface Role {
    id: string;
    name: string;
    description: string;
    organization_id: string;
    is_system_role: boolean;
    max_members: number;
    priority: number;
    created_at: string;
    updated_at: string;
}

export const roleKeys = {
    all: ['roles'] as const,
    lists: () => [...roleKeys.all, 'list'] as const,
    details: () => [...roleKeys.all, 'detail'] as const,
    detail: (id: string) => [...roleKeys.details(), id] as const,
};

export const useRoles = () => {
    return useQuery({
        queryKey: roleKeys.lists(),
        queryFn: async () => {
            const response = await rolesAPI.list();
            return (response.data.data?.items || []) as Role[];
        },
    });
};

export const useCreateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Role>) => rolesAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
        },
    });
};

export const useDeleteRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => rolesAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Role> }) => rolesAPI.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
            queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) });
        },
    });
};

export const useRole = (id: string | null) => {
    return useQuery({
        queryKey: roleKeys.detail(id || ''),
        queryFn: async () => {
            if (!id) return null;
            const response = await rolesAPI.get(id);
            return response.data.data as Role;
        },
        enabled: !!id,
    });
};

export const useRolePolicies = (roleId: string | null) => {
    return useQuery({
        queryKey: [...roleKeys.detail(roleId || ''), 'policies'],
        queryFn: async () => {
            if (!roleId) return [];
            const response = await rolesAPI.getPolicies(roleId);
            return (response.data.data?.policies || []) as any[];
        },
        enabled: !!roleId,
    });
};

export const useRoleAssignments = (roleId: string | null) => {
    return useQuery({
        queryKey: [...roleKeys.detail(roleId || ''), 'assignments'],
        queryFn: async () => {
            if (!roleId) return [];
            const response = await rolesAPI.getAssignments(roleId);
            return (response.data.data?.assignments || []) as any[];
        },
        enabled: !!roleId,
    });
};

export const useAttachPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, policyId }: { roleId: string, policyId: string }) =>
            rolesAPI.attachPolicy(roleId, policyId),
        onSuccess: (_, { roleId }) => {
            queryClient.invalidateQueries({ queryKey: [...roleKeys.detail(roleId), 'policies'] });
        },
    });
};

export const useDetachPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, policyId }: { roleId: string, policyId: string }) =>
            rolesAPI.detachPolicy(roleId, policyId),
        onSuccess: (_, { roleId }) => {
            queryClient.invalidateQueries({ queryKey: [...roleKeys.detail(roleId), 'policies'] });
        },
    });
};

export const useAssignRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, userId }: { roleId: string, userId: string }) =>
            rolesAPI.assign(roleId, userId),
        onSuccess: (_, { roleId }) => {
            queryClient.invalidateQueries({ queryKey: [...roleKeys.detail(roleId), 'assignments'] });
        },
    });
};

export const useUnassignRole = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, userId }: { roleId: string, userId: string }) =>
            rolesAPI.unassign(roleId, userId),
        onSuccess: (_, { roleId }) => {
            queryClient.invalidateQueries({ queryKey: [...roleKeys.detail(roleId), 'assignments'] });
        },
    });
};
