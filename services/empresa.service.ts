import { apiGet, USE_MOCK } from './api-client';
import { Empresa, Extra, TipoEvento } from '@/types/domain';
import { mockEmpresa, mockEmpresasAsignadas, mockExtrasCatering, mockExtrasFijos, mockExtrasVariables, mockTipoCatering, mockTipoEventos } from './mock-data';

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

  async getTiposEvento(): Promise<TipoEvento[]> {
    if (USE_MOCK) return mockTipoEventos;
    return apiGet<TipoEvento[]>(`${BASE}/${getEmpresaActivaId()}/tipos-evento`);
  },

  async getExtrasFijos(): Promise<Extra[]> {
    if (USE_MOCK) return mockExtrasFijos;
    return apiGet<Extra[]>(`${BASE}/${getEmpresaActivaId()}/extras/fijos`);
  },

  async getExtrasVariables(): Promise<Extra[]> {
    if (USE_MOCK) return mockExtrasVariables;
    return apiGet<Extra[]>(`${BASE}/${getEmpresaActivaId()}/extras/variables`);
  },

  async getTiposCatering(): Promise<Extra[]> {
    if (USE_MOCK) return mockTipoCatering;
    return apiGet<Extra[]>(`${BASE}/${getEmpresaActivaId()}/tipos-catering`);
  },

  async getExtrasCatering(): Promise<Extra[]> {
    if (USE_MOCK) return mockExtrasCatering;
    return apiGet<Extra[]>(`${BASE}/${getEmpresaActivaId()}/extras/catering`);
  },
};
