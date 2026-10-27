import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiGetBlob,
  USE_MOCK,
} from './api-client';
import {
  Evento,
  EventoAgenda,
  EventoCatering,
  EventoExtra,
  EventoHora,
  EventoReservaDTO,
  EventoVer,
  EstadoEvento,
  CustomResponse,
} from '@/types/domain';
import {
  mockAgenda,
  mockEventosOcupacion,
  mockEstadosEvento,
  mockEstadosForNuevo,
} from './mock-data';

const BASE = '/v1/eventos';

function empresaId() {
  return 1;
}

export const eventoService = {
  async getEventoVer(eventoId: number): Promise<EventoVer> {
    if (USE_MOCK) {
      const item = mockAgenda.find((e) => e.id === eventoId);
      if (!item) throw new Error('Evento no encontrado');
      return {
        id: item.id,
        nombre: item.title,
        codigo: `EVT-${item.id}`,
        inicio: item.start,
        fin: item.end,
        capacidadAdultos: 80,
        capacidadNinos: 20,
        tipoEventoId: 1,
        tipoEventoNombre: 'CASAMIENTO',
        empresaId: empresaId(),
        empresa: 'Salón Real Vista',
        precioTipoEvento: 250000,
        presupuesto: 320000,
        extraOtro: 0,
        cateringOtro: 0,
        cliente: { id: 11, nombre: 'Juan', apellido: 'Pérez', celular: '1155551111', email: 'juanperez@mail.com' },
        encargadoId: 2,
        encargadoNombre: 'Martín Suárez',
        estado: item.estado,
        anotaciones: 'Cliente solicita mesa de honor junto a pista.',
        listaExtra: [],
        listaExtraVariable: [],
        listaExtraTipoCatering: [],
        listaExtraCateringVariable: [],
      };
    }
    return apiGet<EventoVer>(`${BASE}/${eventoId}`);
  },

  async getAgenda(): Promise<EventoAgenda[]> {
    if (USE_MOCK) return mockAgenda;
    return apiGet<EventoAgenda[]>(`${BASE}/empresa/${empresaId()}/agenda`);
  },

  async getAllEventosByFecha(fecha: string): Promise<Evento[]> {
    if (USE_MOCK) {
      return mockAgenda
        .filter((e) => e.start.slice(0, 10) === fecha)
        .map((e) => ({
          id: e.id,
          nombre: e.title,
          codigo: `EVT-${e.id}`,
          inicio: e.start,
          fin: e.end,
          capacidadAdultos: 80,
          capacidadNinos: 20,
          tipoEventoId: 1,
          empresaId: empresaId(),
          precioTipoEvento: 250000,
          presupuesto: 320000,
          extraOtro: 0,
          cateringOtro: 0,
          cliente: { nombre: '', apellido: '' },
          estado: e.estado,
          listaExtra: [],
          listaExtraVariable: [],
          listaExtraTipoCatering: [],
          listaExtraCateringVariable: [],
        }));
    }
    return apiGet<Evento[]>(`${BASE}/empresa/${empresaId()}/por-fecha`, { fecha });
  },

  async getOcupacionDelDia(fechaEvento: string): Promise<string[]> {
    if (USE_MOCK) return mockEventosOcupacion[fechaEvento] ?? [];
    return apiGet<string[]>(`${BASE}/empresa/${empresaId()}/ocupacion-del-dia`, { fechaEvento });
  },

  async getHorarioDisponible(desde: string, hasta: string): Promise<boolean> {
    if (USE_MOCK) {
      const desdeDate = new Date(desde);
      const hastaDate = new Date(hasta);
      return !mockAgenda.some((e) => {
        const s = new Date(e.start);
        const en = new Date(e.end);
        return (
          (desdeDate < en && hastaDate > s) &&
          Math.abs(s.getTime() - hastaDate.getTime()) < 60 * 60 * 1000
        );
      });
    }
    return apiGet<boolean>(`${BASE}/disponibilidad/validar`, {
      empresaId,
      desde,
      hasta,
    });
  },

  async getAllEstados(): Promise<EstadoEvento[]> {
    if (USE_MOCK) return mockEstadosEvento;
    return apiGet<EstadoEvento[]>(`${BASE}/estados`);
  },

  async getAllEstadosForSave(): Promise<EstadoEvento[]> {
    if (USE_MOCK) return mockEstadosForNuevo;
    return apiGet<EstadoEvento[]>(`${BASE}/estados/nuevo`);
  },

  async save(reserva: EventoReservaDTO): Promise<CustomResponse<number>> {
    if (USE_MOCK) {
      const newId = 9000 + Math.floor(Math.random() * 1000);
      return { data: newId, message: 'Evento creado (mock)', status: 200 };
    }
    const res = await apiPost<EventoReservaDTO>(BASE, reserva);
    return { data: res as unknown as number, message: 'Evento creado' };
  },

  async deleteEvento(id: number): Promise<void> {
    if (USE_MOCK) return;
    await apiDelete(`${BASE}/${id}`);
  },

  async editEventoHora(evento: EventoHora): Promise<EventoHora> {
    if (USE_MOCK) return evento;
    return apiPut<EventoHora>(`${BASE}/${evento.id}/hora`, evento);
  },

  async editEventoExtra(evento: EventoExtra): Promise<number> {
    if (USE_MOCK) return evento.id;
    return apiPut<number>(`${BASE}/extra`, evento);
  },

  async editEventoCatering(evento: EventoCatering): Promise<number> {
    if (USE_MOCK) return evento.id;
    return apiPut<number>(`${BASE}/catering`, evento);
  },

  async editEventoAnotaciones(anotacion: string, id: number): Promise<string> {
    if (USE_MOCK) return anotacion;
    return apiPatch<string>(`${BASE}/${id}/anotaciones`, anotacion);
  },

  async editEventoCapacidad(
    eventoId: number,
    capacidadAdultos: number,
    capacidadNinos: number,
  ): Promise<{ capacidadAdultos: number; capacidadNinos: number }> {
    if (USE_MOCK) return { capacidadAdultos, capacidadNinos };
    return apiPatch(`${BASE}/${eventoId}/capacidad`, { capacidadAdultos, capacidadNinos });
  },

  async editEventoNombre(nombre: string, id: number): Promise<string> {
    if (USE_MOCK) return nombre;
    return apiPatch<string>(`${BASE}/${id}/nombre`, nombre);
  },

  async reenviarMail(eventoId: number): Promise<boolean> {
    if (USE_MOCK) return true;
    const r = await apiPost<string>(`${BASE}/${eventoId}/reenviar-mail`, {});
    return r === 'OK';
  },

  async descargarComprobantePdf(eventoId: number): Promise<Blob> {
    if (USE_MOCK) return new Blob(['Mock PDF'], { type: 'application/pdf' });
    return apiGetBlob(`${BASE}/${eventoId}/comprobante/pdf`);
  },
};
