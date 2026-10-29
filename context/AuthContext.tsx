import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { empresaService, setEmpresaActivaId } from '@/services/empresa.service';
import { Empresa, Rol, Usuario } from '@/types/domain';

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  agendas: Empresa[];
  agendaRevision: number;
  financeRevision: number;
  loading: boolean;
  error: string | null;
  notifyAgendaChanged: () => void;
  notifyFinanceChanged: () => void;
  login: (username: string, password: string) => Promise<'single' | 'multiple' | false>;
  selectAgenda: (agenda: Empresa) => Promise<void>;
  logout: () => Promise<void>;
  canAccess: (roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [agendas, setAgendas] = useState<Empresa[]>([]);
  const [agendaRevision, setAgendaRevision] = useState(0);
  const [financeRevision, setFinanceRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.login(username, password);
      const assigned = await empresaService.getAllByUsuarioId(session.usuario.id);
      if (assigned.length === 0) {
        throw new Error('El usuario no tiene agendas asignadas.');
      }
      const rol = await authService.getRolByEmpresaAndUsuario(session.usuario.id, assigned[0].id);
      setAgendas(assigned);
      setToken(session.token);
      if (assigned.length === 1) {
        const agenda = assigned[0];
        setEmpresaActivaId(agenda.id);
        setUsuario({ ...session.usuario, rol, empresaId: agenda.id, empresaNombre: agenda.nombre });
        return 'single';
      }
      setEmpresaActivaId(null);
      setUsuario({ ...session.usuario, rol });
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

  const selectAgenda = useCallback(async (agenda: Empresa) => {
    if (!agendas.some((item) => item.id === agenda.id)) return;
    if (!usuario) return;
    setLoading(true);
    try {
      const rol = await authService.getRolByEmpresaAndUsuario(usuario.id, agenda.id);
      setEmpresaActivaId(agenda.id);
      setUsuario({ ...usuario, rol, empresaId: agenda.id, empresaNombre: agenda.nombre });
    } finally {
      setLoading(false);
    }
  }, [agendas, usuario]);

  const logout = useCallback(async () => {
    await authService.logout();
    setEmpresaActivaId(null);
    setUsuario(null);
    setToken(null);
    setAgendas([]);
  }, []);

  const notifyAgendaChanged = useCallback(() => {
    setAgendaRevision((revision) => revision + 1);
  }, []);

  const notifyFinanceChanged = useCallback(() => {
    setFinanceRevision((revision) => revision + 1);
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
      value={{ usuario, token, agendas, agendaRevision, financeRevision, loading, error, notifyAgendaChanged, notifyFinanceChanged, login, selectAgenda, logout, canAccess }}
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
