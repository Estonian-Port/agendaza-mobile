import { apiPost } from './api-client';

interface ClienteUpdate {
  id: number;
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  celular?: number;
}

export const usuarioService = {
  async editCliente(cliente: ClienteUpdate): Promise<void> {
    await apiPost<void>('/v1/usuarios/clientes', cliente);
  },
};