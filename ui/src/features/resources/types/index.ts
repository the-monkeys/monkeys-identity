
export interface Resource {
    id: string;
    arn: string;
    name: string;
    description?: string;
    type: string;
    organization_id: string;
    parent_resource_id?: string;
    owner_id?: string;
    owner_type?: string;
    attributes?: string; // JSON string
    tags?: string; // JSON string
    status: string;
    created_at: string;
    updated_at: string;
}

export interface ResourceListResponse {
    data: Resource[];
    meta: {
        total: number;
        page: number;
        per_page: number;
    };
}

export interface CreateResourceRequest {
    name: string;
    type: string;
    description?: string;
    parent_resource_id?: string;
    attributes?: Record<string, any>;
    tags?: Record<string, string>;
}

export interface UpdateResourceRequest {
    name?: string;
    description?: string;
    attributes?: Record<string, any>;
    tags?: Record<string, string>;
}

export interface ResourceAccessLog {
    id: string;
    resource_id: string;
    principal_id: string;
    action: string;
    status: string;
    ip_address: string;
    user_agent?: string;
    accessed_at: string;
}

export interface ShareResourceRequest {
    principal_id: string;
    principal_type: string;
    access_level: string;
    shared_by?: string;
    expires_at?: string;
}
