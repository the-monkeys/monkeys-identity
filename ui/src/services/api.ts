import axios from 'axios';

const API_BASE_URL = 'http://localhost:8085/api/v1';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),

    createAdmin: (data: any) =>
        api.post('/auth/create-admin', data),
};

// Organization APIs
export const organizationAPI = {
    list: (params: any = {}) =>
        api.get('/organizations', { params }),

    get: (id: string) =>
        api.get(`/organizations/${id}`),

    create: (data: any) =>
        api.post('/organizations', data),

    update: (id: string, data: any) =>
        api.put(`/organizations/${id}`, data),

    delete: (id: string) =>
        api.delete(`/organizations/${id}`),

    getSettings: (id: string) =>
        api.get(`/organizations/${id}/settings`),

    updateSettings: (id: string, settings: any) =>
        api.put(`/organizations/${id}/settings`, { settings: JSON.stringify(settings) }),

    getUsers: (id: string) =>
        api.get(`/organizations/${id}/users`),

    getGroups: (id: string) =>
        api.get(`/organizations/${id}/groups`),

    getRoles: (id: string) =>
        api.get(`/organizations/${id}/roles`),

    getPolicies: (id: string) =>
        api.get(`/organizations/${id}/policies`),

    getPolicy: (orgId: string, policyId: string) =>
        api.get(`/policies/${policyId}`),

    updatePolicy: (orgId: string, policyId: string, data: any) =>
        api.put(`/policies/${policyId}`, data),

    getResources: (id: string) =>
        api.get(`/organizations/${id}/resources`),
};

// User APIs
export const userAPI = {
    list: () =>
        api.get('/users'),

    get: (id: string) =>
        api.get(`/users/${id}`),

    create: (data: any) =>
        api.post('/users', data),

    update: (id: string, data: any) =>
        api.put(`/users/${id}`, data),

    delete: (id: string) =>
        api.delete(`/users/${id}`),
};

export default api;
