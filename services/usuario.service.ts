import { apiGet, apiPost, apiPut } from './api-client';

export interface UsuarioEstado {
  onboardingRequired: boolean;
  passwordChangeRequired: boolean;
}

interface ClienteUpdate {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  celular?: number;
}

export const usuarioService = {
  async getEstado(): Promise<UsuarioEstado> {
    return apiGet<UsuarioEstado>('/v1/usuarios/me/estado');
  },

  async changePassword(password: string): Promise<void> {
    await apiPut<void>('/v1/usuarios/me/password', { password });
  },

  async editCliente(cliente: ClienteUpdate): Promise<void> {
    await apiPost<void>('/v1/usuarios/clientes', cliente);
  },
};