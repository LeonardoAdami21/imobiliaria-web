import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/api';
import { setSessionExpiredHandler, tokenStore } from '@/api/http';
import type { User, UserRole } from '@/api/types';

/**
 * O que cada papel pode fazer. Espelha as permissões da API: a tela só esconde
 * o que o servidor recusaria de qualquer forma, então a regra de verdade continua lá.
 */
const PERMISSIONS = {
  manageUsers: ['ADMIN'],
  listUsers: ['ADMIN', 'MANAGER'],
  editProperties: ['ADMIN', 'MANAGER', 'BROKER'],
  manageRentals: ['ADMIN', 'MANAGER', 'FINANCE'],
  negotiate: ['ADMIN', 'MANAGER', 'BROKER'],
  decideProposals: ['ADMIN', 'MANAGER'],
  payCommissions: ['ADMIN', 'MANAGER', 'FINANCE'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

interface AuthState {
  /** undefined enquanto confere o token salvo; null quando não há sessão. */
  user: User | null | undefined;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  can(permission: Permission): boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear(); // nada do usuário anterior fica em memória
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(logout);
    return () => setSessionExpiredHandler(null);
  }, [logout]);

  // Ao abrir o app com um token salvo, confirma com a API que ele ainda vale.
  useEffect(() => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    let cancelled = false;
    api.auth
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && logout());
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.auth.login(email, password);
    tokenStore.set(session.token);
    setUser(session.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      login,
      logout,
      can: (permission) => !!user && (PERMISSIONS[permission] as readonly UserRole[]).includes(user.role),
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

/** Usuário autenticado. Use só em telas que ficam atrás do login. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('Esta tela exige usuário autenticado.');
  return user;
}
