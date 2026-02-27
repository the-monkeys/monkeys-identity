import { QueryClient, MutationCache } from '@tanstack/react-query';
import { formatAPIError } from './errorUtils';

// Global toast function reference — set by ToastProvider on mount
let _globalToast: ((type: 'error' | 'success', title: string, message?: string) => void) | null = null;

export function setGlobalToast(fn: typeof _globalToast) {
    _globalToast = fn;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
    mutationCache: new MutationCache({
        onError: (error) => {
            const { title, message } = formatAPIError(error);
            _globalToast?.('error', title, message);
        },
        onSuccess: () => {
            // Optional: show success toast for mutations
            // _globalToast?.('success', 'Success', 'Operation completed');
        },
    }),
});
