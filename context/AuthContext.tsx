import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '@/services/auth.service';
import { empresaService, setEmpresaActivaId } from '@/services/empresa.service';
import { getToken, isOnboardingRequiredError, isPasswordChangeRequiredError, setOnboardingRequiredHandler, setPasswordChangeRequiredHandler, setUnauthorizedHandler } from '@/services/api-client';
import { usuarioService } from '@/services/usuario.service';
import { Empresa, Rol, Usuario } from '@/types/domain';

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  agendas: Empresa[];
  agendaRevision: number;
  financeRevision: number;
  loading: boolean;
  error: string | null;
  requiresOnboarding: boolean;
  requiresPasswordChange: boolean;
  notifyAgendaChanged: () => void;
  notifyFinanceChanged: () => void;
  login: (username: string, password: string) => Promise<'single' | 'multiple' | 'onboarding' | 'password-change' | false>;
  completePasswordChange: (password: string) => Promise<'single' | 'multiple' | 'login'>;
  selectAgenda: (agenda: Empresa) => Promise<void>;
  completeOnboarding: (updatedUsuario: Partial<Usuario>, usuarioId: number) => Promise<'single' | 'multiple'>;
  logout: () => Promise<void>;
  canAccess: (roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [agendas, setAgendas] = useState<Empresa[]>([]);
  const [agendaRevision, setAgendaRevision] = useState(0);
  const [financeRevision, setFinanceRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    setOnboardingRequiredHandler(() => {
      setRequiresOnboarding(true);
      router.replace('/complete-profile');
    });
    setPasswordChangeRequiredHandler(() => {
      setRequiresPasswordChange(true);
      router.replace('/cambiar-contrasena');
    });
    setUnauthorizedHandler(() => {
      setEmpresaActivaId(null);
      setUsuario(null);
      setToken(null);
      setAgendas([]);
      setRequiresOnboarding(false);
      setRequiresPasswordChange(false);
      router.replace('/login');
    });
    return () => {
      setOnboardingRequiredHandler(null);
      setPasswordChangeRequiredHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [router]);

  useEffect(() => {
    let active = true;
    void getToken().then(async (savedToken) => {
      if (!savedToken) return;
      try {
        const estado = await usuarioService.getEstado();
        if (active) setRequiresPasswordChange(estado.passwordChangeRequired);
      } catch {
        // The response interceptor handles required password changes and expired sessions.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await authService.login(username, password);
      setToken(session.token);
      const estado = await usuarioService.getEstado();
      setRequiresPasswordChange(estado.passwordChangeRequired);
      if (estado.passwordChangeRequired) {
        setUsuario(session.usuario);
        return 'password-change';
      }
      setUsuario(session.usuario);
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
      if (isOnboardingRequiredError(e)) {
        const preservedToken = await getToken();
        if (preservedToken) setToken(preservedToken);
        setRequiresOnboarding(true);
        return 'onboarding';
      }
      if (isPasswordChangeRequiredError(e)) {
        const preservedToken = await getToken();
        if (preservedToken) setToken(preservedToken);
        setRequiresPasswordChange(true);
        return 'password-change';
      }
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

  const completePasswordChange = useCallback(async (password: string) => {
    await usuarioService.changePassword(password);
    const estado = await usuarioService.getEstado();
    setRequiresPasswordChange(estado.passwordChangeRequired);
    if (estado.passwordChangeRequired) {
      throw new Error('El cambio de contraseña todavía está pendiente. Intentá nuevamente.');
    }

    const updatedUsuario = usuario ?? await authService.getCurrentUser();
    setUsuario(updatedUsuario);
    const assigned = await empresaService.getAllByUsuarioId(updatedUsuario.id);
    if (assigned.length === 0) {
      throw new Error('El usuario no tiene agendas asignadas.');
    }
    const rol = await authService.getRolByEmpresaAndUsuario(updatedUsuario.id, assigned[0].id);
    setAgendas(assigned);
    if (assigned.length === 1) {
      const agenda = assigned[0];
      setEmpresaActivaId(agenda.id);
      setUsuario({ ...updatedUsuario, rol, empresaId: agenda.id, empresaNombre: agenda.nombre });
      return 'single';
    }
    setEmpresaActivaId(null);
    setUsuario({ ...updatedUsuario, rol });
    return 'multiple';
  }, [usuario]);

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
    setRequiresOnboarding(false);
    setRequiresPasswordChange(false);
  }, []);

  const completeOnboarding = useCallback(async (updatedUsuario: Partial<Usuario>, usuarioId: number) => {
    const assigned = await empresaService.getAllByUsuarioId(usuarioId);
    if (assigned.length === 0) {
      throw new Error('El usuario no tiene agendas asignadas.');
    }

    const existingUsuario = usuario?.id === usuarioId ? usuario : null;
    let updatedSessionUser: Usuario = {
      id: usuarioId,
      username: updatedUsuario.username ?? existingUsuario?.username,
      email: updatedUsuario.email ?? existingUsuario?.email,
      nombre: updatedUsuario.nombre ?? existingUsuario?.nombre ?? '',
      apellido: updatedUsuario.apellido ?? existingUsuario?.apellido ?? '',
      celular: updatedUsuario.celular ?? existingUsuario?.celular,
      rol: existingUsuario?.rol ?? 'EMPLEADO',
      empresaId: 0,
    };

    if (assigned.length === 1) {
      const agenda = assigned[0];
      const rol = await authService.getRolByEmpresaAndUsuario(usuarioId, agenda.id);
      setEmpresaActivaId(agenda.id);
      updatedSessionUser = {
        ...updatedSessionUser,
        rol,
        empresaId: agenda.id,
        empresaNombre: agenda.nombre,
      };
    } else {
      setEmpresaActivaId(null);
    }

    setAgendas(assigned);
    setUsuario(updatedSessionUser);
    setRequiresOnboarding(false);
    return assigned.length > 1 ? 'multiple' : 'single';
  }, [usuario]);

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
      value={{ usuario, token, agendas, agendaRevision, financeRevision, loading, error, requiresOnboarding, requiresPasswordChange, notifyAgendaChanged, notifyFinanceChanged, login, completePasswordChange, selectAgenda, completeOnboarding, logout, canAccess }}
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
