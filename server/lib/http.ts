import type { Context } from 'hono';
import type { PagedResponse } from '../contracts.js';

export const parsePagination = (c: Context) => {
  const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(c.req.query('pageSize') ?? '20', 10)));
  const search = c.req.query('search')?.trim().toLowerCase();
  return { page, pageSize, search };
};

export const paginate = <T>(items: T[], page: number, pageSize: number): PagedResponse<T> => {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length
  };
};
