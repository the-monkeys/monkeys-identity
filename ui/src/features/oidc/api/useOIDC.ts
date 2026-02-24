import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oidcAPI } from './oidc';

export interface OAuthClient {
    id: string;
    organization_id: string;
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    scope: string;
    is_public: boolean;
    logo_url?: string;
    created_at: string;
}

export interface RegisterClientRequest {
    client_name: string;
    redirect_uris: string[];
    scope: string;
    is_public: boolean;
}

export interface UpdateClientRequest {
    client_name?: string;
    redirect_uris?: string[];
    scope?: string;
    is_public?: boolean;
    logo_url?: string;
}

export interface RegisterClientResponse {
    data: {
        data: {
            client_id: string;
            client_secret?: string;
            id: string;
            [key: string]: any;
        };
    };
}

export const oidcKeys = {
    all: ['oidc'] as const,
    clients: () => [...oidcKeys.all, 'clients'] as const,
};

export const useOIDCUnits = () => {
    return useQuery({
        queryKey: oidcKeys.clients(),
        queryFn: async () => {
            const response = await oidcAPI.listClients();
            return (response.data.data || []) as OAuthClient[];
        },
    });
};

export const useRegisterClient = () => {
    const queryClient = useQueryClient();
    return useMutation<RegisterClientResponse, Error, RegisterClientRequest>({
        mutationFn: (data: RegisterClientRequest) => oidcAPI.registerClient(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: oidcKeys.clients() });
        },
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) =>
            oidcAPI.updateClient(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: oidcKeys.clients() });
        },
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => oidcAPI.deleteClient(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: oidcKeys.clients() });
        },
    });
};
