export interface CreatePolicyRequest {
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