import { apiGet, USE_MOCK } from './api-client';
import { Duracion, Empresa, TipoEvento } from '@/types/domain';
import { mockEmpresa, mockEmpresasAsignadas, mockTipoEventos } from './mock-data';

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
    if (USE_MOCK) return mockEmpresasAsignadas[usuarioId] ?? [mockEmpresa];
    return apiGet<Empresa[]>(`/v1/usuarios/${usuarioId}/empresas`);
  },

  async getEmpresa(): Promise<Empresa> {
    if (USE_MOCK) {
      return Object.values(mockEmpresasAsignadas)
        .flat()
        .find((empresa) => empresa.id === getEmpresaActivaId()) ?? mockEmpresa;
    }
    return apiGet<Empresa>(`${BASE}/${getEmpresaActivaId()}`);
  },

  async getTiposEvento(duracion: Duracion): Promise<TipoEvento[]> {
    if (USE_MOCK) return mockTipoEventos.filter((tipo) => tipo.duracion === duracion);
    return apiGet<TipoEvento[]>(`${BASE}/${getEmpresaActivaId()}/tipos-evento`, { duracion });
  },
};
