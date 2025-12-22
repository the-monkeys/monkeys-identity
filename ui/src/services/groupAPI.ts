import api from './api';

/**
 * Group Management API Service
 * Handles all group-related API calls
 */
export const groupAPI = {
    // List all groups
    list: (params: any = {}) =>
        api.get('/groups', { params }),

    // Create a new group
    create: (data: any) =>
        api.post('/groups', data),

    // Get a specific group by ID
    get: (id: string) =>
        api.get(`/groups/${id}`),

    // Update a group
    update: (id: string, data: any) =>
        api.put(`/groups/${id}`, data),

    // Delete a group
    delete: (id: string) =>
        api.delete(`/groups/${id}`),

    // Get group members
    getMembers: (id: string) =>
        api.get(`/groups/${id}/members`),

    // Add a member to a group
    addMember: (id: string, memberData: any) =>
        api.post(`/groups/${id}/members`, memberData),

    // Remove a member from a group
    removeMember: (groupId: string, userId: string) =>
        api.delete(`/groups/${groupId}/members/${userId}`),

    // Get group permissions
    getPermissions: (id: string) =>
        api.get(`/groups/${id}/permissions`),
};

export default groupAPI;
