import { apiGet } from './api-client';
import { Duracion, Empresa, TipoEvento } from '@/types/domain';

const BASE = '/v1/empresas';
let activeEmpresaId: number | null = null;

export function setEmpresaActivaId(id: number | null) {
  activeEmpresaId = id;
}

export function getEmpresaActivaId(): number {
  if (activeEmpresaId === null) throw new Error('No hay una agenda seleccionada');
  return activeEmpresaId;
}

export const empresaService = {
  async getAllByUsuarioId(usuarioId: number): Promise<Empresa[]> {
    return apiGet<Empresa[]>(`/v1/usuarios/${usuarioId}/empresas`);
  },

  async getEmpresa(): Promise<Empresa> {
    return apiGet<Empresa>(`${BASE}/${getEmpresaActivaId()}`);
  },

  async getTiposEvento(duracion: Duracion): Promise<TipoEvento[]> {
    return apiGet<TipoEvento[]>(`${BASE}/${getEmpresaActivaId()}/tipos-evento`, { duracion });
  },
};
