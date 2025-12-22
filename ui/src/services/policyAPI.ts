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

// Policy APIs
export const policyAPI = {
    // List all policies
    list: (params: any = {}) =>
        api.get('/policies', { params }),

    // Get specific policy
    get: (id: string) =>
        api.get(`/policies/${id}`),

    // Create new policy
    create: (data: any) =>
        api.post('/policies', data),

    // Update policy
    update: (id: string, data: any) =>
        api.put(`/policies/${id}`, data),

    // Delete policy
    delete: (id: string) =>
        api.delete(`/policies/${id}`),

    // Get policy versions
    getVersions: (id: string) =>
        api.get(`/policies/${id}/versions`),

    // Simulate policy
    simulate: (id: string, data: any) =>
        api.post(`/policies/${id}/simulate`, data),

    // Approve policy
    approve: (id: string) =>
        api.post(`/policies/${id}/approve`),

    // Rollback policy
    rollback: (id: string, data: any) =>
        api.post(`/policies/${id}/rollback`, data),
};

export default policyAPI;
