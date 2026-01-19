export interface Organization {
     id: string;
     name: string;
     slug: string;
     parent_id?: string;
     description?: string;
     metadata?: string; // JSON string
     settings?: string; // JSON string
     billing_tier: string;
     max_users: number;
     max_resources: number;
     status: 'active' | 'suspended' | 'inactive';
     created_at: string;
     updated_at: string;
     deleted_at?: string;
 }
