import client from '@/pkg/api/client';
import { User } from '@/features/users/types/user';

export interface UpdateProfileRequest {
    display_name?: string;
    avatar_url?: string;
    attributes?: string; // JSON string
    preferences?: string; // JSON string
}

export const profileAPI = {
    getProfile: (userId: string) =>
        client.get<{ data: User }>(`/users/${userId}/profile`),

    updateProfile: (userId: string, data: UpdateProfileRequest) =>
        client.put(`/users/${userId}/profile`, data),
};
