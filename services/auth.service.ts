import api, { apiGet, saveTokens, clearToken, getToken, getRefreshToken, isOnboardingRequiredError, isPasswordChangeRequiredError } from './api-client';
import { Cliente, Usuario } from '@/types/domain';
import axios from 'axios';

const CARGOS_BASE = '/v1/cargos';

interface UsuarioMeDTO {
  id: number;
  username?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  celular?: string | number;
  rol?: string;
  cargo?: string | { nombre?: string };
  empresaId?: number;
  empresaNombre?: string;
}

interface UsuarioClienteDTO {
  id: number;
  nombre: string;
  apellido: string;
  email?: string;
  celular?: string | number;
}

function mapUsuarioCliente(usuario: UsuarioClienteDTO): Cliente {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    celular: usuario.celular === undefined ? undefined : String(usuario.celular),
  };
}

function mapRol(value: unknown): Usuario['rol'] {
  const rol = String(typeof value === 'object' && value !== null && 'nombre' in value
    ? value.nombre
    : value ?? '').toUpperCase();
  if (rol.includes('ADMIN')) return 'ADMINISTRADOR';
  if (rol.includes('ENCARGADO')) return 'ENCARGADO';
  if (rol.includes('CLIENTE')) return 'CLIENTE';
  return 'EMPLEADO';
}

async function fetchCurrentUser(usernameFallback = ''): Promise<Usuario> {
  const usuarioDTO = await apiGet<UsuarioMeDTO>('/v1/usuarios/me');
  if (!usuarioDTO || !Number.isFinite(Number(usuarioDTO.id))) {
    throw new Error('El backend no retornó un usuario válido.');
  }

  return {
    id: Number(usuarioDTO.id),
    username: usuarioDTO.username ?? usernameFallback,
    email: usuarioDTO.email,
    nombre: usuarioDTO.nombre ?? '',
    apellido: usuarioDTO.apellido ?? '',
    celular: usuarioDTO.celular === undefined ? undefined : String(usuarioDTO.celular),
    rol: mapRol(usuarioDTO.rol ?? usuarioDTO.cargo),
    empresaId: usuarioDTO.empresaId ?? 0,
    empresaNombre: usuarioDTO.empresaNombre,
  };
}

function getLoginErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const body: unknown = error.response?.data;
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const response = body as Record<string, unknown>;
    const message = response.message ?? response.error ?? response.mensaje;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return null;
}

export const authService = {
  async login(username: string, password: string): Promise<{ token: string }> {
    let token: string | undefined;
    try {
      const response = await api.post('/login', { username, password });
      const authorization = response.headers.authorization as string | undefined;
      token = authorization?.replace(/^Bearer\s+/i, '').trim();
      const refreshToken = response.headers['x-refresh-token'] as string | undefined;
      if (!token || !refreshToken) throw new Error('El backend no retornó tokens de autenticación válidos.');

      await saveTokens(token, refreshToken);
      return { token };
    } catch (error) {
      if (!isOnboardingRequiredError(error) && !isPasswordChangeRequiredError(error)) await clearToken();
      if (isOnboardingRequiredError(error) || isPasswordChangeRequiredError(error)) throw error;
      const message = getLoginErrorMessage(error);
      if (message) throw new Error(message);
      throw error;
    }
  },

  async getCurrentUser(): Promise<Usuario> {
    return fetchCurrentUser();
  },

  async getRolByEmpresaAndUsuario(usuarioId: number, empresaId: number): Promise<Usuario['rol']> {
    const cargo = await apiGet<unknown>(`${CARGOS_BASE}/${usuarioId}/empresa/${empresaId}`);
    return mapRol(cargo);
  },

  async logout(): Promise<void> {
    const [refreshToken, accessToken] = await Promise.all([getRefreshToken(), getToken()]);
    await clearToken();
    try {
      if (refreshToken) {
        await api.post('/v1/auth/logout', { refreshToken }, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
      }
    } catch {
      // La sesión local debe cerrarse aunque el backend no esté disponible.
    }
  },

  async isSessionValid(): Promise<boolean> {
    const t = await getToken();
    return !!t;
  },

  async buscarClientePorCelular(celular: string): Promise<Cliente | null> {
    try {
      const usuario = await apiGet<UsuarioClienteDTO>('/v1/usuarios/celular', { celular });
      return mapUsuarioCliente(usuario);
    } catch {
      return null;
    }
  },

  async buscarClientePorEmail(email: string): Promise<Cliente | null> {
    try {
      const usuario = await apiGet<UsuarioClienteDTO>('/v1/usuarios/email', { email });
      return mapUsuarioCliente(usuario);
    } catch {
      return null;
    }
  },
};
