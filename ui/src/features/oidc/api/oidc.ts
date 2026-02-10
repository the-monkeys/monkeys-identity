import client from '@/pkg/api/client';

export const oidcAPI = {
    listClients: () =>
        client.get('/oauth2/clients'),

    registerClient: (data: any) =>
        client.post('/oauth2/clients', data),

    deleteClient: (id: string) =>
        client.delete(`/oauth2/clients/${id}`),

    updateClient: (id: string, data: any) =>
        client.put(`/oauth2/clients/${id}`, data),

    getPublicClientInfo: (clientId: string) =>
        client.get(`/oauth2/client-info?client_id=${clientId}`),
};
