import { apiGet, apiPost } from './api-client';
import { Gasto } from '@/types/domain';
import { getEmpresaActivaId } from './empresa.service';

const BASE = '/v1/gastos';

export const gastoService = {
  async getAllTipoGasto(): Promise<string[]> {
    return apiGet<string[]>(`${BASE}/tipos`);
  },

  async get(id: number): Promise<Gasto> {
    return apiGet<Gasto>(`${BASE}/${id}`);
  },

  async getAllByMes(mes: number, anio: number): Promise<Gasto[]> {
    return apiGet<Gasto[]>(`${BASE}/empresa/${getEmpresaActivaId()}/mes`, { mes, anio });
  },

  async save(gasto: Gasto, usuarioId: number): Promise<Gasto> {
    const payload = {
      ...gasto,
      empresaId: getEmpresaActivaId(),
      usuarioId,
      codigoEvento: gasto.codigoEvento?.trim() || undefined,
    };
    return apiPost<Gasto>(BASE, payload);
  },
};