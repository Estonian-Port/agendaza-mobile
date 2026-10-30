import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiGetBlob,
} from './api-client';
import {
  Evento,
  EventoAgenda,
  EventoCatering,
  EventoExtra,
  EventoHoraDTO,
  EventoReservaDTO,
  EventoVer,
  EventoUsuario,
  EstadoEvento,
  CustomResponse,
} from '@/types/domain';
import { getEmpresaActivaId } from './empresa.service';

const BASE = '/v1/eventos';

export const eventoService = {
  async getEventoIdByCodigo(codigo: string): Promise<number> {
    return apiGet<number>(`${BASE}/codigo/${encodeURIComponent(codigo)}/empresa/${getEmpresaActivaId()}`);
  },

  async getEventoVer(eventoId: number): Promise<EventoVer> {
    const evento = await apiGet<EventoVer & { tipoEvento?: number | { id?: number } }>(`${BASE}/${eventoId}`);
    const extras = evento.listaExtra ?? [];
    const tipoEventoId = evento.tipoEventoId ?? (
      typeof evento.tipoEvento === 'number' ? evento.tipoEvento : evento.tipoEvento?.id
    );
    return {
      ...evento,
      tipoEventoId,
      listaExtra: extras.filter((extra) => extra.tipoExtra === 'EVENTO'),
      listaExtraVariable: evento.listaExtraVariable ?? extras.filter((extra) => extra.tipoExtra === 'VARIABLE_EVENTO'),
      listaExtraTipoCatering: evento.listaExtraTipoCatering ?? extras.filter((extra) => extra.tipoExtra === 'TIPO_CATERING'),
      listaExtraCateringVariable: evento.listaExtraCateringVariable ?? extras.filter((extra) => extra.tipoExtra === 'VARIABLE_CATERING'),
    };
  },

  async getEventosByUsuario(usuarioId: number, empresaId: number): Promise<EventoUsuario[]> {
    const result = await apiGet<{ eventos: EventoUsuario[]; cantidad: number }>(
      `${BASE}/usuario/${usuarioId}/empresa/${empresaId}`,
    );
    return result.eventos;
  },

  async getAgenda(): Promise<EventoAgenda[]> {
    return apiGet<EventoAgenda[]>(`${BASE}/empresa/${getEmpresaActivaId()}/agenda`);
  },

  async getAllEventosByFecha(fecha: string): Promise<Evento[]> {
    return apiGet<Evento[]>(`${BASE}/empresa/${getEmpresaActivaId()}/por-fecha`, { fecha });
  },

  async getOcupacionDelDia(fechaEvento: string): Promise<string[]> {
    return apiGet<string[]>(`${BASE}/empresa/${getEmpresaActivaId()}/ocupacion-del-dia`, { fechaEvento });
  },

  async getHorarioDisponible(desde: string, hasta: string): Promise<boolean> {
    return apiGet<boolean>(`${BASE}/disponibilidad/validar`, {
      empresaId: getEmpresaActivaId(),
      desde,
      hasta,
    });
  },

  async getAllEstados(): Promise<EstadoEvento[]> {
    return apiGet<EstadoEvento[]>(`${BASE}/estados`);
  },

  async getAllEstadosForSave(): Promise<EstadoEvento[]> {
    return apiGet<EstadoEvento[]>(`${BASE}/estados/nuevo`);
  },

  async save(reserva: EventoReservaDTO): Promise<CustomResponse<EventoHoraDTO>> {
    const res = await apiPost<EventoHoraDTO>(BASE, reserva);
    return { data: res, message: 'Evento creado' };
  },

  async deleteEvento(id: number): Promise<void> {
    await apiDelete(`${BASE}/${id}`);
  },

  async editEventoHora(evento: EventoHoraDTO): Promise<EventoHoraDTO> {
    return apiPut<EventoHoraDTO>(`${BASE}/${evento.id}/hora`, evento);
  },

  async editEventoExtra(evento: EventoExtra): Promise<number> {
    return apiPut<number>(`${BASE}/extra`, evento);
  },

  async editEventoCatering(evento: EventoCatering): Promise<number> {
    return apiPut<number>(`${BASE}/catering`, evento);
  },

  async editEventoAnotaciones(anotacion: string, id: number): Promise<string> {
    return apiPatch<string>(`${BASE}/${id}/anotaciones`, anotacion, {
      headers: { 'Content-Type': 'text/plain' },
    });
  },

  async editEventoCapacidad(
    eventoId: number,
    capacidadAdultos: number,
    capacidadNinos: number,
  ): Promise<{ capacidadAdultos: number; capacidadNinos: number }> {
    return apiPatch(`${BASE}/${eventoId}/capacidad`, { capacidadAdultos, capacidadNinos });
  },

  async editEventoNombre(nombre: string, id: number): Promise<string> {
    return apiPatch<string>(`${BASE}/${id}/nombre`, nombre, {
      headers: { 'Content-Type': 'text/plain' },
    });
  },

  async reenviarMail(eventoId: number): Promise<boolean> {
    const r = await apiPost<string>(`${BASE}/${eventoId}/reenviar-mail`, {});
    return r === 'OK';
  },

  async descargarComprobantePdf(eventoId: number): Promise<Blob> {
    return apiGetBlob(`${BASE}/${eventoId}/comprobante/pdf`);
  },
};
