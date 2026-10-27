import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { empresaService, setEmpresaActivaId } from '@/services/empresa.service';
import { Empresa, Rol, Usuario } from '@/types/domain';

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  agendas: Empresa[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<'single' | 'multiple' | false>;
  selectAgenda: (agenda: Empresa) => void;
  logout: () => Promise<void>;
  canAccess: (roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [agendas, setAgendas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.login(email, password);
      const assigned = await empresaService.getAllByUsuarioId(session.usuario.id);
      const available = assigned.length > 0
        ? assigned
        : [{ id: session.usuario.empresaId, nombre: session.usuario.empresaNombre ?? 'Empresa' }];
      setAgendas(available);
      setToken(session.token);
      if (available.length === 1) {
        const agenda = available[0];
        setEmpresaActivaId(agenda.id);
        setUsuario({ ...session.usuario, empresaId: agenda.id, empresaNombre: agenda.nombre });
        return 'single';
      }
      setEmpresaActivaId(null);
      setUsuario(session.usuario);
      return 'multiple';
    } catch (e) {
      await authService.logout();
      setUsuario(null);
      setToken(null);
      setAgendas([]);
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectAgenda = useCallback((agenda: Empresa) => {
    if (!agendas.some((item) => item.id === agenda.id)) return;
    setEmpresaActivaId(agenda.id);
    setUsuario((current) => current
      ? { ...current, empresaId: agenda.id, empresaNombre: agenda.nombre }
      : current);
  }, [agendas]);

  const logout = useCallback(async () => {
    await authService.logout();
    setEmpresaActivaId(null);
    setUsuario(null);
    setToken(null);
    setAgendas([]);
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
      value={{ usuario, token, agendas, loading, error, login, selectAgenda, logout, canAccess }}
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
