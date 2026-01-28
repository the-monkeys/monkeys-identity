import client from '@/pkg/api/client';

export interface CreatePolicyRequest {
    id: string;
    name: string;
    description: string;
    version: string;
    organization_id: string;
    document: object;
    policy_type: string;
    effect: string;
    is_system_policy: boolean;
    status: string;
}

export const policyAPI = {
    createPolicy: async (data: CreatePolicyRequest) => {
        const response = await client.post('/policies', data);
        return response.data;
    }
};
