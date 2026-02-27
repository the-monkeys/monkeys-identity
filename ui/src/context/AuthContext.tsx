import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { authAPI } from '@/features/auth/api/auth';
import { User, AuthContextType } from '@/features/auth/types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // TODO: To implement HTTPOnly Cookie to set the acess token, implement SameSite=Strict to prevent CSRF attacks
    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access_token');

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string, organizationID?: string) => {
        try {
            const response = await authAPI.login(email, password, organizationID);
            const { access_token, user: userData, role } = response.data.data;

            // Attach the resolved role to the user object
            const userWithRole = { ...userData, role: role || 'user' };

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user', JSON.stringify(userWithRole));
            setUser(userWithRole);
            return { success: true };
        } catch (error: any) {
            const msg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Login failed';
            return {
                success: false,
                error: msg
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const isAdmin = () => {
        return user?.role === 'admin';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
