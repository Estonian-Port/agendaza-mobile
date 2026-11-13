import { apiGet, apiPost, apiPut } from './api-client';

const BASE = '/v1/usuarios';

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
    return apiGet<UsuarioEstado>(`${BASE}/me/estado`);
  },

  async changePassword(password: string): Promise<void> {
    await apiPut<void>(`${BASE}/me/password`, { password });
  },

  async editCliente(cliente: ClienteUpdate): Promise<void> {
    await apiPost<void>(`${BASE}/clientes`, cliente);
  },
};