import { apiGet, apiPost, apiDelete, apiGetBlob, USE_MOCK } from './api-client';
import { MedioPago, Pago, ResumenPagosMes } from '@/types/domain';
import { getMockPagosMes, getMockResumenMes, mockConceptosPago, mockMediosDePago, mockPagos } from './mock-data';
import { getEmpresaActivaId } from './empresa.service';
import { eventoService } from './evento.service';

const BASE = '/v1/pagos';

export const pagoService = {
  async get(id: number): Promise<Pago> {
    if (USE_MOCK) {
      const p = mockPagos.find((x) => x.id === id);
      if (!p) throw new Error('Pago no encontrado');
      return p;
    }
    return apiGet<Pago>(`${BASE}/${id}`);
  },

  async getAllByMes(mes: number, anio: number): Promise<Pago[]> {
    if (USE_MOCK) {
      return getMockPagosMes(mes, anio);
    }
    return apiGet<Pago[]>(`${BASE}/empresa/${getEmpresaActivaId()}/mes`, {
      mes,
      anio,
    });
  },

  async getAllByEmpresa(pageNumber: number = 0): Promise<Pago[]> {
    if (USE_MOCK) return mockPagos;
    return apiGet<Pago[]>(`${BASE}/empresa/${getEmpresaActivaId()}`, { page: pageNumber });
  },

  async getResumenMes(mes: number, anio: number): Promise<ResumenPagosMes> {
    if (USE_MOCK) return getMockResumenMes(mes, anio);
    return apiGet<ResumenPagosMes>(`${BASE}/empresa/${getEmpresaActivaId()}/resumen`, { mes, anio });
  },

  async getMediosDePago(): Promise<MedioPago[]> {
    if (USE_MOCK) return mockMediosDePago;
    return apiGet<MedioPago[]>(`${BASE}/medios-de-pago`);
  },

  async getConceptos(): Promise<string[]> {
    if (USE_MOCK) return mockConceptosPago;
    return apiGet<string[]>(`${BASE}/conceptos`);
  },

  async getEventoForSavePago(eventoId: number): Promise<Pago> {
    if (USE_MOCK) {
      const evento = await eventoService.getEventoVer(eventoId);
      return {
        id: 0,
        monto: 0,
        codigo: evento.codigo,
        nombreEvento: evento.nombre,
        fechaEvento: evento.inicio,
        fecha: new Date().toISOString(),
        medioDePago: mockMediosDePago[0],
        concepto: 'INGRESO',
        esIngreso: true,
        eventoId,
        empresaId: getEmpresaActivaId(),
        usuarioId: 0,
      };
    }
    return apiGet<Pago>(`${BASE}/evento/${eventoId}/datos-para-pago`);
  },

  async save(pago: Pago, usuarioId: number = pago.usuarioId): Promise<Pago> {
    const payload = { ...pago, empresaId: getEmpresaActivaId(), usuarioId };
    if (USE_MOCK) {
      const newId = 6000 + Math.floor(Math.random() * 1000);
      const saved = { ...payload, id: newId };
      mockPagos.push(saved);
      return saved;
    }
    return apiPost<Pago>(BASE, payload);
  },

  async delete(id: number): Promise<void> {
    if (USE_MOCK) return;
    await apiDelete(`${BASE}/${id}`);
  },

  async descargarComprobante(id: number): Promise<Blob> {
    if (USE_MOCK) return new Blob(['Mock comprobante pago'], { type: 'application/pdf' });
    return apiGetBlob(`${BASE}/${id}/comprobante`);
  },

  async enviarEmailPago(pagoId: number, eventoId: number): Promise<boolean> {
    if (USE_MOCK) return true;
    return apiGet<boolean>(`${BASE}/${pagoId}/email/evento/${eventoId}/empresa/${getEmpresaActivaId()}`);
  },
};
