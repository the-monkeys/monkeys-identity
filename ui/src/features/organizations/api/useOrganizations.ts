import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { organizationAPI } from './organization';
 import { Organization } from '../types/organization';
 
 export const organizationKeys = {
     all: ['organizations'] as const,
     lists: () => [...organizationKeys.all, 'list'] as const,
     details: () => [...organizationKeys.all, 'detail'] as const,
     detail: (id: string) => [...organizationKeys.details(), id] as const,
 };
 
 export const useOrganizations = () => {
     return useQuery({
         queryKey: organizationKeys.lists(),
         queryFn: async () => {
             const response = await organizationAPI.list();
             return response.data.data.items;
         },
     });

 };
 
 export const useOrganization = (id: string) => {
     return useQuery({
         queryKey: organizationKeys.detail(id),
         queryFn: async () => {
             const response = await organizationAPI.get(id);
             return response.data.data;
         },
         enabled: !!id,
     });
 };
 
 export const useCreateOrganization = () => {
     const queryClient = useQueryClient();
     return useMutation({
         mutationFn: (data: Partial<Organization>) => organizationAPI.create(data),
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
         },
     });
 };
 
 export const useUpdateOrganization = () => {
     const queryClient = useQueryClient();
     return useMutation({
         mutationFn: ({ id, data }: { id: string; data: Partial<Organization> }) =>
             organizationAPI.update(id, data),
         onSuccess: (response, variables) => {
             queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
             queryClient.invalidateQueries({ queryKey: organizationKeys.detail(variables.id) });
         },
     });
 };
 
 export const useDeleteOrganization = () => {
     const queryClient = useQueryClient();
     return useMutation({
         mutationFn: (id: string) => organizationAPI.delete(id),
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
         },
     });
 };
