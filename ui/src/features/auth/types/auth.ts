import { User } from '@/features/users/types/user';
export type { User };

export interface SignupFormData {
  email: string;
  username: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface SignupFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  organization_id?: string;
}

export type LoginType = 'admin' | 'user';

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, organizationID?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
  isAdmin: () => boolean;
}
