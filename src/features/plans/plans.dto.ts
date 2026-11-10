import { z } from 'zod';
import { paginationQuerySchema, sortBySchema } from '../../shared/pagination/cursor-pagination.js';
import { idParamsSchema } from '../../shared/validation/parse-input.js';
import { PLAN_SORT_FIELDS, type PlanEntity } from './plans.entity.js';

/* ───────────────────────────── Input DTOs ───────────────────────────── */

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const planIdParams = idParamsSchema('planId');

export const listPlansQuery = paginationQuerySchema
  .extend({
    sortBy: sortBySchema(PLAN_SORT_FIELDS, 'price'),
    isActive: booleanQuery.optional(),
    name: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  });
export type ListPlansQuery = z.infer<typeof listPlansQuery>;

const planFields = {
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullable(),
  durationDays: z.number().int().min(1).max(3650),
  price: z.number().int().nonnegative(),
  isActive: z.boolean(),
};

export const createPlanDto = z.object({
  ...planFields,
  description: planFields.description.optional().default(null),
  isActive: planFields.isActive.optional().default(true),
});
export type CreatePlanDto = z.infer<typeof createPlanDto>;

export const updatePlanDto = z
  .object(planFields)
  .partial()
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdatePlanDto = z.infer<typeof updatePlanDto>;

/* ──────────────────────────── Output presenters ──────────────────────────── */

export interface PlanView {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly durationDays: number;
  readonly price: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export function presentPlan(plan: PlanEntity): PlanView {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    durationDays: plan.durationDays,
    price: plan.price,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
  };
}
