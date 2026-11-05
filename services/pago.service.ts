import { apiGet, apiPost, apiDelete, apiGetArrayBuffer } from './api-client';
import { EstadoCuentaEvento, MedioPago, Pago, ResumenPagosMes } from '@/types/domain';
import { getEmpresaActivaId } from './empresa.service';

const BASE = '/v1/pagos';

export const pagoService = {
  async get(id: number): Promise<Pago> {
    return apiGet<Pago>(`${BASE}/${id}`);
  },

  async getAllByMes(mes: number, anio: number): Promise<Pago[]> {
    return apiGet<Pago[]>(`${BASE}/empresa/${getEmpresaActivaId()}/mes`, {
      mes,
      anio,
    });
  },

  async getAllByEmpresa(pageNumber: number = 0): Promise<Pago[]> {
    return apiGet<Pago[]>(`${BASE}/empresa/${getEmpresaActivaId()}`, { page: pageNumber });
  },

  async getAllByEvento(eventoId: number): Promise<Pago[]> {
    return apiGet<Pago[]>(`${BASE}/evento/${eventoId}`);
  },

  async getEstadoCuentaEvento(eventoId: number): Promise<EstadoCuentaEvento> {
    return apiGet<EstadoCuentaEvento>(`${BASE}/evento/${eventoId}/estado-cuenta`);
  },

  async getResumenMes(mes: number, anio: number): Promise<ResumenPagosMes> {
    return apiGet<ResumenPagosMes>(`${BASE}/empresa/${getEmpresaActivaId()}/resumen`, { mes, anio });
  },

  async getMediosDePago(): Promise<MedioPago[]> {
    return apiGet<MedioPago[]>(`${BASE}/medios-de-pago`);
  },

  async getConceptos(): Promise<string[]> {
    return apiGet<string[]>(`${BASE}/conceptos`);
  },

  async getEventoForSavePago(eventoId: number): Promise<Pago> {
    return apiGet<Pago>(`${BASE}/evento/${eventoId}/datos-para-pago`);
  },

  async save(pago: Pago, usuarioId: number = pago.usuarioId): Promise<Pago> {
    const payload = { ...pago, empresaId: getEmpresaActivaId(), usuarioId };
    return apiPost<Pago>(BASE, payload);
  },

  async delete(id: number): Promise<void> {
    await apiDelete(`${BASE}/${id}`);
  },

  async descargarComprobante(id: number): Promise<ArrayBuffer> {
    return apiGetArrayBuffer(`${BASE}/${id}/comprobante`);
  },

  async enviarEmailPago(pagoId: number, eventoId: number): Promise<boolean> {
    return apiGet<boolean>(`${BASE}/${pagoId}/email/evento/${eventoId}/empresa/${getEmpresaActivaId()}`);
  },
};
