import client from '@/pkg/api/client';
import type {
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddGroupMemberRequest,
  GroupMember,
} from '../types/group';

export const groupAPI = {
  // Group CRUD

  // TODO: configure list params
  list: (params?: { organization_id?: string }) =>
    client.get<{ data: { items: Group[]; total: number; limit: number; offset: number; has_more: boolean }; meta: any }>('/groups', { params }),

  get: (id: string) =>
    client.get<{ data: Group }>(`/groups/${id}`),

  create: (data: CreateGroupRequest) =>
    client.post<{ data: Group }>('/groups', data),

  update: (id: string, data: UpdateGroupRequest) =>
    client.put<{ data: Group }>(`/groups/${id}`, data),

  delete: (id: string) =>
    client.delete(`/groups/${id}`),

  // Member Management
  getMembers: (id: string) =>
    client.get<{ data: { group_id: string; members: GroupMember[]; count: number } }>(`/groups/${id}/members`),

  addMember: (id: string, data: AddGroupMemberRequest) =>
    client.post(`/groups/${id}/members`, data),

  removeMember: (groupId: string, userId: string) =>
    client.delete(`/groups/${groupId}/members/${userId}`),

  // Permissions
  getPermissions: (id: string) =>
    client.get(`/groups/${id}/permissions`),
};
