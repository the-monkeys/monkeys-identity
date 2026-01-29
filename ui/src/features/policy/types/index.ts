export interface PolicyStatement {
    Effect: 'Allow' | 'Deny';
    Action: string | string[];
    Resource: string | string[];
    Condition?: Record<string, any>;
}

export interface PolicyDocument {
    Version: string;
    Statement: PolicyStatement[];
}

export interface Policy {
    id: string;
    name: string;
    description: string;
    version: string;
    organization_id: string;
    document: PolicyDocument | string;
    policy_type: string;
    effect: string;
    is_system_policy: boolean;
    created_by: string;
    approved_by: string;
    approved_at: string;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: string;
}

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

export interface PolicyListProps {
    policies: Policy[];
    selectedPolicy: Policy | null;
    onSelectPolicy: (policy: Policy) => void;
    onPolicyClick?: (id: string) => void;
}