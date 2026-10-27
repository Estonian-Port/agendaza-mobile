import { apiGet } from './api-client';
import { getEmpresaActivaId } from './empresa.service';
import { GenericItem } from '@/types/domain';

const PRICE_BASE = '/v1/tipos-evento';
const SERVICE_BASE = '/v1/servicios';

export const tipoEventoService = {
  async getPrecioPorFecha(tipoEventoId: number, fechaEvento: string): Promise<number> {
    const empresaId = getEmpresaActivaId();
    const fechaEventoDateTime = fechaEvento.includes('T') ? fechaEvento : `${fechaEvento}T00:00:00`;
    return apiGet<number>(
      `${PRICE_BASE}/${tipoEventoId}/empresa/${empresaId}/precio-por-fecha`,
      { fechaEvento: fechaEventoDateTime },
    );
  },

  async getServiciosIncluidos(tipoEventoId: number): Promise<GenericItem[]> {
    return apiGet<GenericItem[]>(`${SERVICE_BASE}/tipo-evento/${tipoEventoId}`);
  },
};