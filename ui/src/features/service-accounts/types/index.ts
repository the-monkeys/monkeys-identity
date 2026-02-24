
export interface ServiceAccount {
    id: string;
    name: string;
    description?: string;
    organization_id: string;
    key_rotation_policy: number; // days
    allowed_ip_ranges?: string[];
    max_token_lifetime: number; // seconds
    last_key_rotation?: string;
    attributes?: string; // JSON string
    status: string;
    created_at: string;
    updated_at: string;
}

export interface ServiceAccountListResponse {
    data: {
        items: ServiceAccount[];
        total: number;
        limit: number;
        offset: number;
        has_more: boolean;
        total_pages: number;
    };
    message: string;
    status: number;
}

export interface CreateServiceAccountRequest {
    name: string;
    description?: string;
    key_rotation_policy?: number;
    allowed_ip_ranges?: string[];
    max_token_lifetime?: number;
    attributes?: Record<string, any>;
}

export interface UpdateServiceAccountRequest {
    name?: string;
    description?: string;
    key_rotation_policy?: number;
    allowed_ip_ranges?: string[];
    max_token_lifetime?: number;
    attributes?: Record<string, any>;
    status?: string;
}

export interface APIKey {
    id: string;
    name: string;
    key_id: string;
    service_account_id: string;
    organization_id: string;
    scopes?: string[];
    allowed_ip_ranges?: string[];
    rate_limit_per_hour: number;
    last_used_at?: string;
    usage_count: number;
    expires_at: string;
    status: string;
    created_at: string;
    created_by?: string;
}

export interface CreateAPIKeyRequest {
    name: string;
    scopes?: string[];
    allowed_ip_ranges?: string[];
    rate_limit_per_hour?: number;
    expires_at?: string;
}

export interface GenerateAPIKeyResponse {
    data: {
        id: string;
        name: string;
        key_id: string;
        secret: string; // The secret key, only returned once
        service_account_id: string;
        created_at: string;
        expires_at: string;
    }
}
