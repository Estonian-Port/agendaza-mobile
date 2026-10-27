import { apiGet, USE_MOCK } from './api-client';
import { Empresa, Extra, TipoEvento } from '@/types/domain';
import { mockEmpresa, mockExtrasCatering, mockExtrasFijos, mockExtrasVariables, mockTipoCatering, mockTipoEventos } from './mock-data';

const BASE = '/v1/empresas';

function empresaId() {
  return 1;
}

export const empresaService = {
  async getEmpresa(): Promise<Empresa> {
    if (USE_MOCK) return mockEmpresa;
    return apiGet<Empresa>(`${BASE}/${empresaId()}`);
  },

  async getTiposEvento(): Promise<TipoEvento[]> {
    if (USE_MOCK) return mockTipoEventos;
    return apiGet<TipoEvento[]>(`${BASE}/${empresaId()}/tipos-evento`);
  },

  async getExtrasFijos(): Promise<Extra[]> {
    if (USE_MOCK) return mockExtrasFijos;
    return apiGet<Extra[]>(`${BASE}/${empresaId()}/extras/fijos`);
  },

  async getExtrasVariables(): Promise<Extra[]> {
    if (USE_MOCK) return mockExtrasVariables;
    return apiGet<Extra[]>(`${BASE}/${empresaId()}/extras/variables`);
  },

  async getTiposCatering(): Promise<Extra[]> {
    if (USE_MOCK) return mockTipoCatering;
    return apiGet<Extra[]>(`${BASE}/${empresaId()}/tipos-catering`);
  },

  async getExtrasCatering(): Promise<Extra[]> {
    if (USE_MOCK) return mockExtrasCatering;
    return apiGet<Extra[]>(`${BASE}/${empresaId()}/extras/catering`);
  },
};
