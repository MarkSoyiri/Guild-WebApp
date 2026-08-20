export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFoundError(resource: string): AppError {
  return new AppError(404, 'NOT_FOUND', `${resource} not found`);
}