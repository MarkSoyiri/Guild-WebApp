import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export interface ApiErrorDetails {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails[];

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'X-CSRF-Protection': '1' },
});

let refreshing: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = http
      .post('/auth/refresh', {})
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

interface ErrorPayload {
  error?: { code: string; message: string; details?: ApiErrorDetails[] };
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorPayload>) => {
    const response = error.response;
    const url = error.config?.url ?? '';
    if (response?.status === 401 && !url.includes('/auth/') && !error.config?.headers?.X_KO_RETRIED) {
      error.config!.headers.X_KO_RETRIED = '1';
      const ok = await tryRefresh();
      if (ok) return http(error.config as AxiosRequestConfig);
    }
    if (response?.data?.error) {
      throw new ApiError(
        response.status,
        response.data.error.code,
        response.data.error.message,
        response.data.error.details,
      );
    }
    throw new ApiError(
      response?.status ?? 0,
      'NETWORK_ERROR',
      response?.status ? 'Something went wrong' : 'Cannot reach the server. Check your connection.',
    );
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.get<{ data: T }>(url, config);
  return response.data.data;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.post<{ data: T }>(url, data ?? {}, config);
  return response.data.data;
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.patch<{ data: T }>(url, data ?? {}, config);
  return response.data.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.delete<{ data: T }>(url, config);
  return response.data.data;
}

export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('avatar', file);
  return post('/upload/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
}