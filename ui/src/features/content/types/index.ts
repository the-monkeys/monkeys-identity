export interface ContentItem {
    id: string;
    content_type: string;
    title: string;
    slug: string;
    body: string;
    summary: string;
    cover_image_url: string;
    parent_id?: string | null;
    owner_id: string;
    organization_id: string;
    status: string; // draft | published | archived
    tags: string;   // JSON string
    metadata: string; // JSON string
    published_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ContentCollaborator {
    content_id: string;
    user_id: string;
    role: string; // owner | co-author
    invited_by: string;
    created_at: string;
    username: string;
    email: string;
    display_name: string;
}

export interface CreateContentRequest {
    content_type: string;
    title: string;
    body?: string;
    summary?: string;
    cover_image_url?: string;
    parent_id?: string;
    tags?: string;
    metadata?: string;
}

export interface UpdateContentRequest {
    title?: string;
    body?: string;
    summary?: string;
    cover_image_url?: string;
    tags?: string;
    metadata?: string;
}

export const CONTENT_TYPES = [
    { value: 'blog', label: 'Blog', color: 'blue' },
    { value: 'video', label: 'Video', color: 'red' },
    { value: 'tweet', label: 'Tweet', color: 'cyan' },
    { value: 'comment', label: 'Comment', color: 'yellow' },
    { value: 'article', label: 'Article', color: 'green' },
    { value: 'post', label: 'Post', color: 'purple' },
] as const;

export type ContentType = typeof CONTENT_TYPES[number]['value'];
