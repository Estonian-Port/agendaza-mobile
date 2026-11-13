import { apiGet, apiPost, apiPut } from './api-client';

const BASE = '/v1/usuarios';

export interface UsuarioEstado {
  onboardingRequired: boolean;
  passwordChangeRequired: boolean;
  emailVerificationRequired: boolean;
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
    return apiGet<UsuarioEstado>(`${BASE}/me/estado`);
  },

  async requestEmailVerification(): Promise<void> {
    await apiPost<void>(`${BASE}/verificacion-email`);
  },

  async confirmEmailVerification(codigo: string): Promise<void> {
    await apiPost<void>(`${BASE}/verificacion-email/confirmar`, { codigo });
  },

  async changePassword(password: string): Promise<void> {
    await apiPut<void>(`${BASE}/me/password`, { password });
  },

  async editCliente(cliente: ClienteUpdate): Promise<void> {
    await apiPost<void>(`${BASE}/clientes`, cliente);
  },
};