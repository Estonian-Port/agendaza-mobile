import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { Rol, Usuario } from '@/types/domain';

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  canAccess: (roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.login(email, password);
      setUsuario(session.usuario);
      setToken(session.token);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUsuario(null);
    setToken(null);
  }, []);

  const canAccess = useCallback(
    (roles: Rol[]) => {
      if (!usuario) return false;
      return roles.includes(usuario.rol);
    },
    [usuario],
  );

  return (
    <AuthContext.Provider
      value={{ usuario, token, loading, error, login, logout, canAccess }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
