import type { Plan } from '../../generated/prisma/client.js';

export type PlanEntity = Plan;

export const PLAN_SORT_FIELDS = ['id', 'name', 'price', 'durationDays', 'createdAt'] as const;
export type PlanSortField = (typeof PLAN_SORT_FIELDS)[number];

export interface PlanListFilter {
  readonly isActive: boolean | undefined;
  readonly name: string | undefined;
  readonly minPrice: number | undefined;
  readonly maxPrice: number | undefined;
}

export interface PlanCreateData {
  readonly name: string;
  readonly description: string | null;
  readonly durationDays: number;
  readonly price: number;
  readonly isActive: boolean;
}

export type PlanUpdateData = Partial<PlanCreateData>;
