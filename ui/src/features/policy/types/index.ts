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
    type: 'Managed' | 'Customer' | 'Inline';
    usageCount: number;
    json: PolicyDocument;
    created_at: string;
    updated_at: string;
}
