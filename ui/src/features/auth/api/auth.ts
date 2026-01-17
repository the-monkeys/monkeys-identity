import client from '@/pkg/api/client';

export const authAPI = {
    login: (email: string, password: string) =>
        client.post('/auth/login', { email, password }),

    createAdmin: (data: any) =>
        client.post('/auth/create-admin', data),
};
