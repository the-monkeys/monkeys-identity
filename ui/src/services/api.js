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
    login: (email, password) =>
        api.post('/auth/login', { email, password }),

    createAdmin: (data) =>
        api.post('/auth/create-admin', data),
};

// Organization APIs
export const organizationAPI = {
    list: (params = {}) =>
        api.get('/organizations', { params }),

    get: (id) =>
        api.get(`/organizations/${id}`),

    create: (data) =>
        api.post('/organizations', data),

    update: (id, data) =>
        api.put(`/organizations/${id}`, data),

    delete: (id) =>
        api.delete(`/organizations/${id}`),

    getSettings: (id) =>
        api.get(`/organizations/${id}/settings`),

    updateSettings: (id, settings) =>
        api.put(`/organizations/${id}/settings`, { settings: JSON.stringify(settings) }),

    getUsers: (id) =>
        api.get(`/organizations/${id}/users`),

    getGroups: (id) =>
        api.get(`/organizations/${id}/groups`),

    getRoles: (id) =>
        api.get(`/organizations/${id}/roles`),

    getPolicies: (id) =>
        api.get(`/organizations/${id}/policies`),

    getPolicy: (orgId, policyId) =>
        api.get(`/policies/${policyId}`),

    updatePolicy: (orgId, policyId, data) =>
        api.put(`/policies/${policyId}`, data),

    getResources: (id) =>
        api.get(`/organizations/${id}/resources`),
};

// User APIs
export const userAPI = {
    list: () =>
        api.get('/users'),

    get: (id) =>
        api.get(`/users/${id}`),

    create: (data) =>
        api.post('/users', data),

    update: (id, data) =>
        api.put(`/users/${id}`, data),

    delete: (id) =>
        api.delete(`/users/${id}`),
};

export default api;
