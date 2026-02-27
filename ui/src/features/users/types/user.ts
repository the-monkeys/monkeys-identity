export interface User {
  id: string;
  username: string;
  email: string;
  email_verified: boolean;
  display_name: string;
  avatar_url: string;
  organization_id: string;
  password_hash?: string; // Never sent from backend
  password_changed_at: string;
  mfa_enabled: boolean;
  mfa_methods: string[] | null;
  mfa_secret?: string; // Never sent from backend
  mfa_backup_codes?: string[] | null; // Never sent from backend
  attributes: string; // JSON string
  preferences: string; // JSON string
  last_login: string;
  failed_login_attempts: number;
  locked_until: string;
  status: 'active' | 'suspended' | 'inactive';
  role?: string; // User role (e.g. "admin", "user")
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
