import { z } from 'zod';
 
 // Generic API Response Wrapper
 export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
     z.object({
         status: z.number().optional(),
         message: z.string().optional(),
         data: dataSchema,
     });
 
 export const errorResponseSchema = z.object({
     status: z.number(),
     message: z.string(),
     errors: z.any().optional(),
 });
 
 export type APIResponse<T> = {
     status?: number;
     message?: string;
     data: T;
 };
 
 export type PaginatedList<T> = {
     items: T[];
     total: number;
     limit: number;
     offset: number;
     has_more: boolean;
     total_pages: number;
 };

