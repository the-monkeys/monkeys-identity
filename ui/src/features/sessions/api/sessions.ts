import client from '@/pkg/api/client';

export const sessionsAPI = {
    list: () =>
        client.get('/sessions'),

    getCurrent: () =>
        client.get('/sessions/current'),

    get: (id: string) =>
        client.get(`/sessions/${id}`),

    revoke: (id: string) =>
        client.delete(`/sessions/${id}`),

    revokeCurrent: () =>
        client.delete('/sessions/current'),

    extend: (id: string) =>
        client.post(`/sessions/${id}/extend`),
};
