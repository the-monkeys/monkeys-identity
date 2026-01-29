import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/pkg/api/client';

const deletePolicy = async (id: string) => {
    await client.delete(`/policies/${id}`);
};

export const useDeletePolicy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deletePolicy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
        },
    });
};
