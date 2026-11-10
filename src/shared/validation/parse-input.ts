import { z } from 'zod';
import { ValidationError } from '../errors/index.js';

/** Validate untrusted input (body / query / params) against a DTO schema. */
export function parseInput<TSchema extends z.ZodType>(schema: TSchema, input: unknown): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ValidationError.fromZod(result.error);
  }
  return result.data;
}

/** Common route-param schema: `/:id` style positive integer. */
export const idParam = z.coerce.number().int().positive();

export function idParamsSchema<const TKey extends string>(key: TKey) {
  return z.object({ [key]: idParam } as Record<TKey, typeof idParam>);
}
