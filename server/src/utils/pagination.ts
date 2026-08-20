import type { Request } from 'express';

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginate(req: Request): { take: number; skip: number; page: number; pageSize: number } {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
  return { take: pageSize, skip: (page - 1) * pageSize, page, pageSize };
}

export function toPageResult<T>(items: T[], total: number, page: number, pageSize: number): PageResult<T> {
  return { items, page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}