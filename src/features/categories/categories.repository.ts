import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { idCursorArgs, orderByWithTiebreaker } from '../../shared/pagination/cursor-pagination.js';
import type { SortOrder } from '../../types/api.types.js';

export interface CategoryRow {
  id: number;
  name: string;
}

export interface CategoryListArgs {
  readonly name: string | undefined;
  readonly cursor: number | undefined;
  readonly limit: number;
  readonly sortBy: 'id' | 'name';
  readonly sortOrder: SortOrder;
}

export interface CategoriesRepository {
  list(args: CategoryListArgs): Promise<CategoryRow[]>;
  nameExists(name: string): Promise<boolean>;
  exists(id: number): Promise<boolean>;
  create(name: string): Promise<CategoryRow>;
  delete(id: number): Promise<void>;
}

export class PrismaCategoriesRepository implements CategoriesRepository {
  constructor(private readonly db: PrismaClient) {}

  list(args: CategoryListArgs): Promise<CategoryRow[]> {
    const where: Prisma.CategoryWhereInput = args.name
      ? { name: { contains: args.name, mode: 'insensitive' } }
      : {};
    return this.db.category.findMany({
      where,
      orderBy: orderByWithTiebreaker(args.sortBy, args.sortOrder),
      ...idCursorArgs(args.cursor, args.limit),
      select: { id: true, name: true },
    });
  }

  async nameExists(name: string): Promise<boolean> {
    const found = await this.db.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    return found !== null;
  }

  async exists(id: number): Promise<boolean> {
    return (await this.db.category.findUnique({ where: { id }, select: { id: true } })) !== null;
  }

  create(name: string): Promise<CategoryRow> {
    return this.db.category.create({ data: { name }, select: { id: true, name: true } });
  }

  async delete(id: number): Promise<void> {
    await this.db.category.delete({ where: { id } });
  }
}
