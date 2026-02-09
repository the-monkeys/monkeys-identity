import { useQuery } from '@tanstack/react-query';
import client from '@/pkg/api/client';
import { Policy } from '@/features/policy/types';

const fetchPolicies = async (): Promise<Policy[]> => {
    const { data } = await client.get('/policies');
    return data.items || [];
};

export const useGetAllPolicy = () => {
    return useQuery({
        queryKey: ['policies'],
        queryFn: fetchPolicies,
    });
};
