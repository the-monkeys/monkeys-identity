import client from '@/pkg/api/client';

export const userAPI = {
    list: () =>
        client.get('/users'),

    get: (id: string) =>
        client.get(`/users/${id}`),

    create: (data: any) =>
        client.post('/users', data),

    update: (id: string, data: any) =>
        client.put(`/users/${id}`, data),

    delete: (id: string) =>
        client.delete(`/users/${id}`),
};
