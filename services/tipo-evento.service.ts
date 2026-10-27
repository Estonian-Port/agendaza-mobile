import { apiGet, USE_MOCK } from './api-client';
import { getEmpresaActivaId } from './empresa.service';
import { mockTipoEventos } from './mock-data';
import { GenericItem } from '@/types/domain';

const PRICE_BASE = '/v1/tipos-evento';
const SERVICE_BASE = '/v1/servicios';

export const tipoEventoService = {
  async getPrecioPorFecha(tipoEventoId: number, fechaEvento: string): Promise<number> {
    if (USE_MOCK) {
      return mockTipoEventos.find((tipo) => tipo.id === tipoEventoId)?.precioBase ?? 0;
    }

    const empresaId = getEmpresaActivaId();
    const fechaEventoDateTime = fechaEvento.includes('T') ? fechaEvento : `${fechaEvento}T00:00:00`;
    return apiGet<number>(
      `${PRICE_BASE}/${tipoEventoId}/empresa/${empresaId}/precio-por-fecha`,
      { fechaEvento: fechaEventoDateTime },
    );
  },

  async getServiciosIncluidos(tipoEventoId: number): Promise<GenericItem[]> {
    if (USE_MOCK) {
      return mockTipoEventos.find((tipo) => tipo.id === tipoEventoId)?.listaServicio ?? [];
    }
    return apiGet<GenericItem[]>(`${SERVICE_BASE}/tipo-evento/${tipoEventoId}`);
  },
};