import client from '@/pkg/api/client';

export const policiesAPI = {
    list: () =>
        client.get('/policies'),

    get: (id: string) =>
        client.get(`/policies/${id}`),

    create: (data: any) =>
        client.post('/policies', data),

    update: (id: string, data: any) =>
        client.put(`/policies/${id}`, data),

    delete: (id: string) =>
        client.delete(`/policies/${id}`),

    simulate: (id: string, data: any) =>
        client.post(`/policies/${id}/simulate`, data),

    getVersions: (id: string) =>
        client.get(`/policies/${id}/versions`),

    approve: (id: string) =>
        client.post(`/policies/${id}/approve`),

    rollback: (id: string) =>
        client.post(`/policies/${id}/rollback`),
};
