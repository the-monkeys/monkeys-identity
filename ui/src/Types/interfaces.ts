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
    email: string;
    status: string;
    [key: string]: any;
}

export interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    loading: boolean;
    isAdmin: () => boolean;
}