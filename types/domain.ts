// Domain types for Agendaza, derived from the Spring Boot + Kotlin backend models.

export type Rol = 'ADMINISTRADOR' | 'ENCARGADO' | 'CLIENTE' | 'EMPLEADO';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  empresaId: number;
  empresaNombre?: string;
}

export interface AuthSession {
  token: string;
  usuario: Usuario;
}

export type Duracion = 'CORTA' | 'MEDIA' | 'LARGA' | 'COMPLETA';

export type TipoExtra =
  | 'FIJO'
  | 'VARIABLE_EVENTO'
  | 'TIPO_CATERING'
  | 'VARIABLE_CATERING';

export interface GenericItem {
  id: number;
  nombre: string;
}

export interface Extra extends GenericItem {
  tipoExtra: TipoExtra;
  empresaId: number;
  precio: number;
  cantidad: number;
  listaTipoEventoId: number[];
}

export interface TipoEvento extends GenericItem {
  duracion: Duracion;
  precioBase: number;
  listaServicio: GenericItem[];
}

export interface Servicio extends GenericItem {}

export interface Empresa extends GenericItem {
  direccion?: string;
  telefono?: string;
}

export interface Cliente {
  id?: number;
  nombre: string;
  apellido: string;
  celular?: string;
  email?: string;
}

export type EstadoEvento =
  | 'COTIZADO'
  | 'RESERVADO'
  | 'CONFIRMADO'
  | 'CANCELADO'
  | 'REALIZADO'
  | 'PENDIENTE';

export interface Evento {
  id: number;
  nombre: string;
  codigo: string;
  inicio: string; // ISO YYYY-MM-DDTHH:mm:ss
  fin: string;
  capacidadAdultos: number;
  capacidadNinos: number;
  tipoEventoId: number;
  tipoEventoNombre?: string;
  empresaId: number;
  empresa?: string;
  precioTipoEvento: number;
  presupuesto: number;
  extraOtro: number;
  extraOtroDescripcion?: string;
  cateringOtro: number;
  cateringOtroDescripcion?: string;
  cliente: Cliente;
  encargadoId?: number;
  encargadoNombre?: string;
  estado: EstadoEvento;
  anotaciones?: string;
  listaExtra: Extra[];
  listaExtraVariable: Extra[];
  listaExtraTipoCatering: Extra[];
  listaExtraCateringVariable: Extra[];
}

export interface EventoReservaDTO {
  id: number;
  nombre: string;
  capacidadAdultos: number;
  capacidadNinos: number;
  codigo: string;
  inicio: string;
  fin: string;
  tipoEventoId: number;
  empresaId: number;
  extraOtro: number;
  extraOtroDescripcion?: string;
  precioTipoEvento: number;
  listaExtra: Array<{
    id: number;
    nombre: string;
    tipoExtra: TipoExtra;
    empresaId: number;
    precio: number;
    cantidad: number;
    listaTipoEventoId: number[];
  }>;
  cateringOtro: number;
  cateringOtroDescripcion?: string;
  cliente: Cliente;
  encargadoId?: number;
  estado: EstadoEvento;
  anotaciones?: string;
}

export interface EventoVer extends Evento {}

export interface EventoAgenda {
  id: number;
  title: string;
  start: string; // ISO
  end: string;
  estado: EstadoEvento;
  color?: string;
}

export interface EventoExtra {
  id: number;
  listaExtra: Extra[];
  listaExtraVariable: Extra[];
}

export interface EventoCatering {
  id: number;
  listaExtraTipoCatering: Extra[];
  listaExtraCateringVariable: Extra[];
  cateringOtro: number;
  cateringOtroDescripcion?: string;
}

export interface EventoHora {
  id: number;
  inicio: string;
  fin: string;
}

export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADO_PAGO' | 'CHEQUE';
export type ConceptoPago = 'INGRESO' | 'EGRESO' | 'SEÑA' | 'SALDO' | 'GASTO' | 'PROVEEDOR';

export interface Pago {
  id: number;
  fecha: string; // ISO
  monto: number;
  medioPago: MedioPago;
  concepto: ConceptoPago;
  descripcion?: string;
  esIngreso: boolean;
  eventoId?: number;
  eventoNombre?: string;
  empresaId: number;
  usuarioId: number;
}

export interface PagoJSON {
  id: number;
  fecha: string;
  monto: number;
  medioPago: MedioPago;
  concepto: ConceptoPago;
  descripcion?: string;
  esIngreso: boolean;
  eventoId?: number;
  eventoNombre?: string;
}

export interface ResumenPagosMes {
  ingresos: number;
  egresos: number;
  balance: number;
  cantidadMovimientos: number;
}

export interface CustomResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
