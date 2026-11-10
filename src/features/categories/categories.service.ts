import type { AdminAuthContext, AuthContext } from '../../shared/auth/index.js';
import { ConflictError, NotFoundError } from '../../shared/errors/index.js';
import { buildPage, mapPage } from '../../shared/pagination/cursor-pagination.js';
import type { Paginated } from '../../types/api.types.js';
import {
  presentCategory,
  type CategoryView,
  type CreateCategoryDto,
  type ListCategoriesQuery,
} from './categories.dto.js';
import type { CategoriesRepository } from './categories.repository.js';

export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async list(_actor: AuthContext, query: ListCategoriesQuery): Promise<Paginated<CategoryView>> {
    const rows = await this.repository.list({
      name: query.name,
      cursor: query.cursor,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return mapPage(buildPage(rows, query.limit, (c) => c.id), presentCategory);
  }

  async create(_admin: AdminAuthContext, dto: CreateCategoryDto): Promise<CategoryView> {
    if (await this.repository.nameExists(dto.name)) {
      throw new ConflictError('A category with this name already exists', 'CATEGORY_NAME_TAKEN');
    }
    return presentCategory(await this.repository.create(dto.name));
  }

  async delete(_admin: AdminAuthContext, categoryId: number): Promise<void> {
    if (!(await this.repository.exists(categoryId))) {
      throw new NotFoundError('Category');
    }
    // Deleting a category only removes its book associations (implicit M2M), not the books.
    await this.repository.delete(categoryId);
  }
}
