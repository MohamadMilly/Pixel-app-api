import { z } from 'zod';
import { paginationQuerySchema, sortBySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';

export const categoryIdParams = idParamsSchema('categoryId');

export const listCategoriesQuery = paginationQuerySchema.extend({
  sortBy: sortBySchema(['id', 'name'], 'name'),
  name: z.string().trim().min(1).max(100).optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuery>;

export const createCategoryDto = z.strictObject({
  name: z.string().trim().min(2).max(100),
});
export type CreateCategoryDto = z.infer<typeof createCategoryDto>;

export interface CategoryView {
  readonly id: number;
  readonly name: string;
}

export function presentCategory(category: { id: number; name: string }): CategoryView {
  return { id: category.id, name: category.name };
}
