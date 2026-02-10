import client from '@/pkg/api/client';

export const authAPI = {
    login: (email: string, password: string, organization_id?: string) =>
        client.post('/auth/login', { email, password, organization_id }),

    createAdmin: (data: any) =>
        client.post('/auth/create-admin', data),

    getPublicOrganizations: () =>
        client.get('/public/organizations'),

    registerOrganization: (data: any) =>
        client.post('/auth/register-org', data),

    generateBackupCodes: () =>
        client.post('/auth/mfa/backup-codes'),
};
