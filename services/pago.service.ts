import { apiGet, apiPost, apiDelete, apiGetBlob } from './api-client';
import { MedioPago, Pago, ResumenPagosMes } from '@/types/domain';
import { getEmpresaActivaId } from './empresa.service';
import { eventoService } from './evento.service';

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

  async descargarComprobante(id: number): Promise<Blob> {
    return apiGetBlob(`${BASE}/${id}/comprobante`);
  },

  async enviarEmailPago(pagoId: number, eventoId: number): Promise<boolean> {
    return apiGet<boolean>(`${BASE}/${pagoId}/email/evento/${eventoId}/empresa/${getEmpresaActivaId()}`);
  },
};
