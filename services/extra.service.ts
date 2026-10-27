import { Extra, ExtraPrecioDTO, TipoExtra } from '@/types/domain';
import { apiGet, USE_MOCK } from './api-client';
import { getEmpresaActivaId } from './empresa.service';
import {
  mockExtrasCatering,
  mockExtrasFijos,
  mockExtrasVariables,
  mockTipoCatering,
} from './mock-data';

const BASE = '/v1/extras';

const mockExtrasByType: Record<TipoExtra, Extra[]> = {
  EVENTO: mockExtrasFijos,
  VARIABLE_EVENTO: mockExtrasVariables,
  TIPO_CATERING: mockTipoCatering,
  VARIABLE_CATERING: mockExtrasCatering,
};

export const extraService = {
  async getByTipoEventoAndFecha(
    tipoEventoId: number,
    fechaEvento: string,
    tipoExtra: TipoExtra,
  ): Promise<Extra[]> {
    if (USE_MOCK) {
      return mockExtrasByType[tipoExtra].filter((extra) =>
        extra.listaTipoEventoId.length === 0 || extra.listaTipoEventoId.includes(tipoEventoId),
      );
    }

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