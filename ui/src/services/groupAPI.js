import api from './api';

/**
 * Group Management API Service
 * Handles all group-related API calls
 */
export const groupAPI = {
    // List all groups
    list: (params = {}) =>
        api.get('/groups', { params }),

    // Create a new group
    create: (data) =>
        api.post('/groups', data),

    // Get a specific group by ID
    get: (id) =>
        api.get(`/groups/${id}`),

    // Update a group
    update: (id, data) =>
        api.put(`/groups/${id}`, data),

    // Delete a group
    delete: (id) =>
        api.delete(`/groups/${id}`),

    // Get group members
    getMembers: (id) =>
        api.get(`/groups/${id}/members`),

    // Add a member to a group
    addMember: (id, memberData) =>
        api.post(`/groups/${id}/members`, memberData),

    // Remove a member from a group
    removeMember: (groupId, userId) =>
        api.delete(`/groups/${groupId}/members/${userId}`),

    // Get group permissions
    getPermissions: (id) =>
        api.get(`/groups/${id}/permissions`),
};

export default groupAPI;
