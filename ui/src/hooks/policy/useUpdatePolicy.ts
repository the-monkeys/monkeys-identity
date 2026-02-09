import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/pkg/api/client';

const updatePolicy = async ({ id, data }: { id: string; data: any }) => {
    await client.put(`/policies/${id}`, data);
};

export const useUpdatePolicy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updatePolicy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
};