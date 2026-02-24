import client from '@/pkg/api/client';

export const rolesAPI = {
    list: () =>
        client.get('/roles'),

    get: (id: string) =>
        client.get(`/roles/${id}`),

    create: (data: any) =>
        client.post('/roles', data),

    update: (id: string, data: any) =>
        client.put(`/roles/${id}`, data),

    delete: (id: string) =>
        client.delete(`/roles/${id}`),

    getPolicies: (roleId: string) =>
        client.get(`/roles/${roleId}/policies`),

    attachPolicy: (roleId: string, policyId: string) =>
        client.post(`/roles/${roleId}/policies`, { policy_id: policyId }),

    detachPolicy: (roleId: string, policyId: string) =>
        client.delete(`/roles/${roleId}/policies/${policyId}`),

    getAssignments: (roleId: string) =>
        client.get(`/roles/${roleId}/assignments`),

    assign: (roleId: string, userId: string) =>
        client.post(`/roles/${roleId}/assign`, { principal_id: userId, principal_type: 'user' }),

    unassign: (roleId: string, userId: string) =>
        client.delete(`/roles/${roleId}/assign/${userId}`),
};
