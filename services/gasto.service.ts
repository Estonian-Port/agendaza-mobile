import { apiGet, USE_MOCK } from './api-client';
import { Gasto } from '@/types/domain';
import { getEmpresaActivaId } from './empresa.service';
import { apiPost } from './api-client';
import { mockGastos, mockTiposGasto } from './mock-data';

const BASE = '/v1/gastos';

export const gastoService = {
  async getAllTipoGasto(): Promise<string[]> {
    if (USE_MOCK) return mockTiposGasto;
    return apiGet<string[]>(`${BASE}/tipos`);
  },

  async get(id: number): Promise<Gasto> {
    if (USE_MOCK) {
      const gasto = mockGastos.find((item) => item.id === id);
      if (!gasto) throw new Error('Gasto no encontrado');
      return gasto;
    }
    return apiGet<Gasto>(`${BASE}/${id}`);
  },

  async getAllByMes(mes: number, anio: number): Promise<Gasto[]> {
    if (USE_MOCK) {
      return mockGastos.filter((gasto) => {
        const fecha = new Date(gasto.fecha);
        return fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio;
      });
    }
    return apiGet<Gasto[]>(`${BASE}/empresa/${getEmpresaActivaId()}/mes`, { mes, anio });
  },

  async save(gasto: Gasto, usuarioId: number): Promise<Gasto> {
    const payload = {
      ...gasto,
      empresaId: getEmpresaActivaId(),
      usuarioId,
      codigoEvento: gasto.codigoEvento?.trim() || undefined,
    };
    if (USE_MOCK) {
      const saved = { ...payload, id: Date.now() };
      mockGastos.push(saved);
      return saved;
    }
    return apiPost<Gasto>(BASE, payload);
  },
};