import { AxiosError } from 'axios';

interface APIErrorData {
    success?: boolean;
    error?: string;
    message?: string;
    status?: number;
}

/**
 * Extracts a human-readable error message from an API error response.
 * Handles all three backend response formats:
 *   Format A: { status, error, message }
 *   Format B: { success, error, message }
 *   Format C: { error }
 */
export function extractErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
    if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as APIErrorData;
        // Prefer `message` (human-readable) over `error` (code)
        return data.message || data.error || fallback;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

/**
 * Extracts the HTTP status code from an API error.
 */
export function extractErrorStatus(error: unknown): number | undefined {
    if (error instanceof AxiosError) {
        return error.response?.status;
    }
    return undefined;
}

/**
 * Returns a descriptive label for the HTTP status code.
 */
export function getStatusLabel(status: number): string {
    switch (status) {
        case 400: return 'Bad Request';
        case 401: return 'Unauthorized';
        case 403: return 'Forbidden';
        case 404: return 'Not Found';
        case 409: return 'Conflict';
        case 422: return 'Validation Error';
        case 429: return 'Too Many Requests';
        case 500: return 'Server Error';
        case 502: return 'Bad Gateway';
        case 503: return 'Service Unavailable';
        default: return 'Error';
    }
}

/**
 * Returns formatted error title and message from an error object.
 */
export function formatAPIError(error: unknown, fallbackTitle = 'Error'): { title: string; message: string } {
    const status = extractErrorStatus(error);
    const message = extractErrorMessage(error);
    const title = status ? getStatusLabel(status) : fallbackTitle;
    return { title, message };
}
