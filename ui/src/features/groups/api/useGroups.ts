import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAPI } from './group';
import { Group, CreateGroupRequest, UpdateGroupRequest, AddGroupMemberRequest, GroupMember } from '../types/group';

// Query Keys
//TODO: Update query based on necessary params
export const groupKeys = {
    all: ['groups'] as const,
    lists: () => [...groupKeys.all, 'list'] as const,
    details: () => [...groupKeys.all, 'detail'] as const,
    detail: (id: string) => [...groupKeys.details(), id] as const,
    members: (id: string) => [...groupKeys.all, 'members', id] as const,
    permissions: (id: string) => [...groupKeys.all, 'permissions', id] as const,
};

export const useGroups = () => {
    return useQuery({
        queryKey: groupKeys.lists(),
        queryFn: async () => {
            const response = await groupAPI.list();
            return response.data.data as Group[];
        },
    });
};

export const useGroup = (id: string) => {
    return useQuery({
        queryKey: groupKeys.detail(id),
        queryFn: async () => {
            const response = await groupAPI.get(id);
            return response.data.data as Group;
        },
        enabled: !!id,
    });
};

export const useGroupMembers = (id: string) => {
    return useQuery({
        queryKey: groupKeys.members(id),
        queryFn: async () => {
            const response = await groupAPI.getMembers(id);
            return response.data.data as GroupMember[];
        },
        enabled: !!id,
    });
};

export const useCreateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateGroupRequest) => groupAPI.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
        },
    });
};

export const useUpdateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateGroupRequest }) =>
            groupAPI.update(id, data),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
            queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.id) });
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => groupAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
        },
    });
};

export const useAddGroupMember = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ groupId, data }: { groupId: string; data: AddGroupMemberRequest }) =>
            groupAPI.addMember(groupId, data),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: groupKeys.members(variables.groupId) });
            queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.groupId) });
        },
    });
};

export const useRemoveGroupMember = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
            groupAPI.removeMember(groupId, userId),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: groupKeys.members(variables.groupId) });
            queryClient.invalidateQueries({ queryKey: groupKeys.detail(variables.groupId) });
        },
    });
};
