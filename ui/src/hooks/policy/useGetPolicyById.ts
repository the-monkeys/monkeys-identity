import { useQuery } from '@tanstack/react-query';
import client from '@/pkg/api/client';
import { Policy } from '@/features/policy/types';

const fetchPolicy = async (id: string): Promise<Policy> => {
    const { data } = await client.get(`/policies/${id}`);
    return data;
};

export const useGetPolicyById = (id?: string) => {
    return useQuery({
        queryKey: ['policy', id],
        queryFn: () => fetchPolicy(id!),
        enabled: !!id,
    });
};
