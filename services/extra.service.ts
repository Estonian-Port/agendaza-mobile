import { Extra, ExtraPrecioDTO, TipoExtra } from '@/types/domain';
import { apiGet } from './api-client';
import { getEmpresaActivaId } from './empresa.service';

const BASE = '/v1/extras';

export const extraService = {
  async getByTipoEventoAndFecha(
    tipoEventoId: number,
    fechaEvento: string,
    tipoExtra: TipoExtra,
  ): Promise<Extra[]> {
    const empresaId = getEmpresaActivaId();
    const fechaEventoDateTime = fechaEvento.includes('T') ? fechaEvento : `${fechaEvento}T00:00:00`;
    const extras = await apiGet<ExtraPrecioDTO[]>(
      `${BASE}/empresa/${empresaId}/tipo-evento/${tipoEventoId}/precio`,
      { fechaEvento: fechaEventoDateTime, tipoExtra },
    );

    return extras.map((extra) => ({
      ...extra,
      empresaId,
      cantidad: 1,
      listaTipoEventoId: [],
    }));
  },
};