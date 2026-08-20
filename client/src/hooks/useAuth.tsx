import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../lib/api';
import { QUERY_KEYS } from '../lib/constants';
import type { Me } from '../lib/types';

interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

interface AuthContextValue {
  me: Me | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMember: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: () => get<Me>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      post<{ id: string }>('/auth/login', { identifier, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) => post<{ id: string }>('/auth/register', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.me });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => post<{ ok: boolean }>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const login = useCallback(
    async (identifier: string, password: string) => {
      await loginMutation.mutateAsync({ identifier, password });
    },
    [loginMutation],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await registerMutation.mutateAsync(input);
    },
    [registerMutation],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const value = useMemo<AuthContextValue>(
    () => ({
      me: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      isMember: Boolean(meQuery.data?.membership),
      isAdmin: meQuery.data?.role === 'SUPER_ADMIN' || meQuery.data?.role === 'ADMIN',
      login,
      register,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}