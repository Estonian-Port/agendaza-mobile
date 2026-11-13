import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '@/services/auth.service';
import { empresaService, setEmpresaActivaId } from '@/services/empresa.service';
import { clearToken, getToken, isEmailVerificationRequiredError, isOnboardingRequiredError, isPasswordChangeRequiredError, setEmailVerificationRequiredHandler, setOnboardingRequiredHandler, setPasswordChangeRequiredHandler, setUnauthorizedHandler } from '@/services/api-client';
import { usuarioService } from '@/services/usuario.service';
import { Empresa, Rol, Usuario } from '@/types/domain';

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  agendas: Empresa[];
  agendaRevision: number;
  financeRevision: number;
  authReady: boolean;
  loading: boolean;
  error: string | null;
  requiresOnboarding: boolean;
  requiresEmailVerification: boolean;
  requiresPasswordChange: boolean;
  notifyAgendaChanged: () => void;
  notifyFinanceChanged: () => void;
  login: (username: string, password: string) => Promise<'single' | 'multiple' | 'onboarding' | 'email-verification' | 'password-change' | false>;
  completePasswordChange: (password: string) => Promise<'single' | 'multiple' | 'onboarding' | 'email-verification' | 'login'>;
  confirmEmailVerification: (codigo: string) => Promise<'single' | 'multiple' | 'onboarding' | 'email-verification' | 'password-change'>;
  selectAgenda: (agenda: Empresa) => Promise<void>;
  completeOnboarding: (updatedUsuario: Partial<Usuario>, usuarioId: number) => Promise<'single' | 'multiple' | 'onboarding' | 'email-verification' | 'password-change'>;
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
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    setOnboardingRequiredHandler(() => {
      setRequiresOnboarding(true);
      setRequiresEmailVerification(false);
      setRequiresPasswordChange(false);
    });
    setPasswordChangeRequiredHandler(() => {
      setRequiresPasswordChange(true);
    });
    setEmailVerificationRequiredHandler(() => {
      setRequiresEmailVerification(true);
    });
    setUnauthorizedHandler(() => {
      setEmpresaActivaId(null);
      setUsuario(null);
      setToken(null);
      setAgendas([]);
      setRequiresOnboarding(false);
      setRequiresEmailVerification(false);
      setRequiresPasswordChange(false);
      router.replace('/login');
    });
    return () => {
      setOnboardingRequiredHandler(null);
      setPasswordChangeRequiredHandler(null);
      setEmailVerificationRequiredHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [router]);

  const loadApplicationSession = useCallback(async (fallbackUsuario?: Usuario): Promise<'single' | 'multiple'> => {
    const currentUsuario = fallbackUsuario ?? await authService.getCurrentUser();
    const assigned = await empresaService.getAllByUsuarioId(currentUsuario.id);
    if (assigned.length === 0) {
      throw new Error('El usuario no tiene agendas asignadas.');
    }
    const rol = await authService.getRolByEmpresaAndUsuario(currentUsuario.id, assigned[0].id);
    setAgendas(assigned);
    if (assigned.length === 1) {
      const agenda = assigned[0];
      setEmpresaActivaId(agenda.id);
      setUsuario({ ...currentUsuario, rol, empresaId: agenda.id, empresaNombre: agenda.nombre });
      return 'single';
    }
    setEmpresaActivaId(null);
    setUsuario({ ...currentUsuario, rol });
    return 'multiple';
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const savedToken = await getToken();
      if (!active) return;
      if (!savedToken) {
        setAuthReady(true);
        return;
      }

      setToken(savedToken);
      try {
        const estado = await usuarioService.getEstado();
        if (!active) return;
        setRequiresOnboarding(estado.onboardingRequired);
        setRequiresEmailVerification(estado.emailVerificationRequired && !estado.onboardingRequired);
        setRequiresPasswordChange(estado.passwordChangeRequired && !estado.onboardingRequired && !estado.emailVerificationRequired);
        if (!estado.onboardingRequired && !estado.emailVerificationRequired && !estado.passwordChangeRequired) {
          await loadApplicationSession();
        }
      } catch (sessionError) {
        if (!active) return;
        if (isOnboardingRequiredError(sessionError)) {
          setRequiresOnboarding(true);
          setRequiresEmailVerification(false);
          setRequiresPasswordChange(false);
        } else if (isEmailVerificationRequiredError(sessionError)) {
          setRequiresOnboarding(false);
          setRequiresEmailVerification(true);
          setRequiresPasswordChange(false);
        } else if (isPasswordChangeRequiredError(sessionError)) {
          setRequiresOnboarding(false);
          setRequiresEmailVerification(false);
          setRequiresPasswordChange(true);
        } else {
          await clearToken();
          setEmpresaActivaId(null);
          setToken(null);
          setUsuario(null);
          setAgendas([]);
          setRequiresOnboarding(false);
          setRequiresEmailVerification(false);
          setRequiresPasswordChange(false);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadApplicationSession]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    setRequiresOnboarding(false);
    setRequiresEmailVerification(false);
    setRequiresPasswordChange(false);
    try {
      const session = await authService.login(username, password);
      setToken(session.token);
      const estado = await usuarioService.getEstado();
      setRequiresOnboarding(estado.onboardingRequired);
      setRequiresEmailVerification(estado.emailVerificationRequired && !estado.onboardingRequired);
      setRequiresPasswordChange(estado.passwordChangeRequired && !estado.onboardingRequired && !estado.emailVerificationRequired);
      if (estado.onboardingRequired) {
        setUsuario(null);
        return 'onboarding';
      }
      if (estado.emailVerificationRequired) {
        setUsuario(null);
        return 'email-verification';
      }
      if (estado.passwordChangeRequired) {
        setUsuario(null);
        return 'password-change';
      }
      return await loadApplicationSession();
    } catch (e) {
      if (isOnboardingRequiredError(e)) {
        const preservedToken = await getToken();
        if (preservedToken) setToken(preservedToken);
        setRequiresOnboarding(true);
        setRequiresEmailVerification(false);
        setRequiresPasswordChange(false);
        return 'onboarding';
      }
      if (isEmailVerificationRequiredError(e)) {
        const preservedToken = await getToken();
        if (preservedToken) setToken(preservedToken);
        setRequiresEmailVerification(true);
        return 'email-verification';
      }
      if (isPasswordChangeRequiredError(e)) {
        const preservedToken = await getToken();
        if (preservedToken) setToken(preservedToken);
        setRequiresPasswordChange(true);
        return 'password-change';
      }
      await authService.logout();
      setEmpresaActivaId(null);
      setUsuario(null);
      setToken(null);
      setAgendas([]);
      setRequiresOnboarding(false);
      setRequiresEmailVerification(false);
      setRequiresPasswordChange(false);
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadApplicationSession]);

  const completePasswordChange = useCallback(async (password: string) => {
    await usuarioService.changePassword(password);
    const estado = await usuarioService.getEstado();
    setRequiresOnboarding(estado.onboardingRequired);
    setRequiresEmailVerification(estado.emailVerificationRequired && !estado.onboardingRequired);
    setRequiresPasswordChange(estado.passwordChangeRequired && !estado.onboardingRequired && !estado.emailVerificationRequired);
    if (estado.onboardingRequired) return 'onboarding';
    if (estado.emailVerificationRequired) return 'email-verification';
    if (estado.passwordChangeRequired) {
      throw new Error('El cambio de contraseña todavía está pendiente. Intentá nuevamente.');
    }
    return await loadApplicationSession(usuario ?? undefined);
  }, [loadApplicationSession, usuario]);

  const confirmEmailVerification = useCallback(async (codigo: string) => {
    await usuarioService.confirmEmailVerification(codigo);
    const estado = await usuarioService.getEstado();
    setRequiresOnboarding(estado.onboardingRequired);
    setRequiresEmailVerification(estado.emailVerificationRequired && !estado.onboardingRequired);
    setRequiresPasswordChange(estado.passwordChangeRequired && !estado.onboardingRequired && !estado.emailVerificationRequired);
    if (estado.onboardingRequired) return 'onboarding';
    if (estado.emailVerificationRequired) return 'email-verification';
    if (estado.passwordChangeRequired) return 'password-change';
    return await loadApplicationSession();
  }, [loadApplicationSession]);

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
    setRequiresEmailVerification(false);
    setRequiresPasswordChange(false);
  }, []);

  const completeOnboarding = useCallback(async (updatedUsuario: Partial<Usuario>, usuarioId: number) => {
    const existingUsuario = usuario?.id === usuarioId ? usuario : null;
    const updatedSessionUser: Usuario = {
      id: usuarioId,
      username: updatedUsuario.username ?? existingUsuario?.username,
      email: updatedUsuario.email ?? existingUsuario?.email,
      nombre: updatedUsuario.nombre ?? existingUsuario?.nombre ?? '',
      apellido: updatedUsuario.apellido ?? existingUsuario?.apellido ?? '',
      celular: updatedUsuario.celular ?? existingUsuario?.celular,
      rol: existingUsuario?.rol ?? 'EMPLEADO',
      empresaId: 0,
    };
    setUsuario(updatedSessionUser);
    const estado = await usuarioService.getEstado();
    setRequiresOnboarding(estado.onboardingRequired);
    setRequiresEmailVerification(estado.emailVerificationRequired && !estado.onboardingRequired);
    setRequiresPasswordChange(estado.passwordChangeRequired && !estado.onboardingRequired && !estado.emailVerificationRequired);
    if (estado.onboardingRequired) return 'onboarding';
    if (estado.emailVerificationRequired) return 'email-verification';
    if (estado.passwordChangeRequired) return 'password-change';
    return await loadApplicationSession(updatedSessionUser);
  }, [loadApplicationSession, usuario]);

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
      value={{ usuario, token, agendas, agendaRevision, financeRevision, authReady, loading, error, requiresOnboarding, requiresEmailVerification, requiresPasswordChange, notifyAgendaChanged, notifyFinanceChanged, login, completePasswordChange, confirmEmailVerification, selectAgenda, completeOnboarding, logout, canAccess }}
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
