import client from '@/pkg/api/client';
 import { APIResponse, PaginatedList } from '@/pkg/api/schema';
 import { Organization } from '../types/organization';
 
 export const organizationAPI = {
     list: () => client.get<APIResponse<PaginatedList<Organization>>>('/organizations'),
     get: (id: string) => client.get<APIResponse<Organization>>(`/organizations/${id}`),

     create: (data: Partial<Organization>) => client.post<APIResponse<Organization>>('/organizations', data),
     update: (id: string, data: Partial<Organization>) => client.put<APIResponse<Organization>>(`/organizations/${id}`, data),
     delete: (id: string) => client.delete(`/organizations/${id}`),

     // Origins CORS management
     getOrigins: (id: string) => client.get<APIResponse<{ organization_id: string; allowed_origins: string[] }>>(`/organizations/${id}/origins`),
     updateOrigins: (id: string, origins: string[]) => client.put<APIResponse<{ organization_id: string; allowed_origins: string[] }>>(`/organizations/${id}/origins`, { allowed_origins: origins }),
 };
