import api, { apiGet, saveToken, clearToken, getToken } from './api-client';
import { AuthSession, Cliente, Usuario } from '@/types/domain';
import axios from 'axios';

interface UsuarioMeDTO {
  id: number;
  username?: string;
  email?: string;
  nombre?: string;
  apellido?: string;
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
  async login(username: string, password: string): Promise<AuthSession> {
    let token: string | undefined;
    try {
      const response = await api.post('/login', { username, password });
      const authorization = response.headers.authorization as string | undefined;
      token = authorization?.replace(/^Bearer\s+/i, '').trim();
      if (!token) throw new Error('El backend no retornó un token de autenticación.');

      await saveToken(token);
      const usuarioDTO = await apiGet<UsuarioMeDTO>('/v1/usuarios/me');
      if (!usuarioDTO || !Number.isFinite(Number(usuarioDTO.id))) {
        throw new Error('El backend no retornó un usuario válido.');
      }

      const usuario: Usuario = {
        id: Number(usuarioDTO.id),
        username: usuarioDTO.username ?? username,
        email: usuarioDTO.email,
        nombre: usuarioDTO.nombre ?? '',
        apellido: usuarioDTO.apellido ?? '',
        rol: mapRol(usuarioDTO.rol ?? usuarioDTO.cargo),
        empresaId: usuarioDTO.empresaId ?? 0,
        empresaNombre: usuarioDTO.empresaNombre,
      };
      return { token, usuario };
    } catch (error) {
      await clearToken();
      const message = getLoginErrorMessage(error);
      if (message) throw new Error(message);
      throw error;
    }
  },

  async getRolByEmpresaAndUsuario(usuarioId: number, empresaId: number): Promise<Usuario['rol']> {
    const cargo = await apiGet<unknown>(`/v1/cargos/${usuarioId}/empresa/${empresaId}`);
    return mapRol(cargo);
  },

  async logout(): Promise<void> {
    await clearToken();
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
