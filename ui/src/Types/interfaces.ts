export interface SignupFormData {
  email: string;
  organisation_id: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface SignupFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

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
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isAdmin: () => boolean;
}

export interface SidebarProps {
  activeView: string;
  collapsed: boolean;
}

export interface Identity {
  id: string;
  name: string;
  type: 'User' | 'Role' | 'Group';
  arn: string;
  lastModified: string;
  status: 'Active' | 'Pending' | 'Disabled';
}

export interface SummaryMetric {
  label: string;
  value: string | number;
  change: number;
  data: number[];
}