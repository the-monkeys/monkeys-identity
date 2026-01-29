export interface AuditEvent {
    id: string;
    event_id: string;
    timestamp: string;
    organization_id: string;
    principal_id: string;
    principal_type: string;
    session_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_arn: string;
    result: string;
    error_message?: string;
    ip_address: string;
    user_agent: string;
    request_id: string;
    severity: string;
    additional_context?: string;
}

export interface AuditLogFilters {
    organization_id?: string;
    principal_id?: string;
    action?: string;
    resource_type?: string;
    result?: string;
    severity?: string;
    start_time?: string;
    end_time?: string;
}

export interface AuditLogResponse {
    status: number;
    data: {
        events: AuditEvent[];
        total_count: number;
        limit: number;
        offset: number;
    };
    message: string;
}
