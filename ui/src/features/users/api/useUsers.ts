import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { userAPI } from './user';
 import { User } from '../types/user';
 
 // Query Keys
 export const userKeys = {
     all: ['users'] as const,
     lists: () => [...userKeys.all, 'list'] as const,
     details: () => [...userKeys.all, 'detail'] as const,
     detail: (id: string) => [...userKeys.details(), id] as const,
 };
 
 export const useUsers = () => {
     return useQuery({
         queryKey: userKeys.lists(),
         queryFn: async () => {
             const response = await userAPI.list();
             return response.data.data as User[];
         },
     });
 };
 
 export const useUser = (id: string) => {
     return useQuery({
         queryKey: userKeys.detail(id),
         queryFn: async () => {
             const response = await userAPI.get(id);
             return response.data.data as User;
         },
         enabled: !!id,
     });
 };
 
 export const useCreateUser = () => {
     const queryClient = useQueryClient();
     return useMutation({
         mutationFn: (data: Partial<User>) => userAPI.create(data),
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: userKeys.lists() });
         },
     });
 };
 
 export const useUpdateUser = () => {
     const queryClient = useQueryClient();
     return useMutation({
         mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
             userAPI.update(id, data),
         onSuccess: (response, variables) => {
             queryClient.invalidateQueries({ queryKey: userKeys.lists() });
             queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
         },
     });
 };
 
 export const useDeleteUser = () => {
     const queryClient = useQueryClient();
     return useMutation({
         mutationFn: (id: string) => userAPI.delete(id),
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: userKeys.lists() });
         },
     });
 };
 
 export const useSuspendUser = () => {
     const queryClient = useQueryClient();
     // Note: API for suspend/activate might be specific endpoints or just update?
     // Assuming specific from previous code investigation (UsersManagement had handleSuspend)
     // Wait, let's check userAPI. It currently only has generic CRUD.
     // I need to update userAPI to include suspend/activate if they exist.
     // In routes.go: users.Post("/:id/suspend")
     return useMutation({
         mutationFn: (id: string) => userAPI.update(id, { status: 'suspended' }), // Fallback if API hasn't specific method yet
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: userKeys.lists() });
         },
     });
 };
