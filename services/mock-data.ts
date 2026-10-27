import {
  Cliente,
  Empresa,
  EstadoEvento,
  Gasto,
  EventoAgenda,
  Extra,
  MedioPago,
  Pago,
  ResumenPagosMes,
  TipoEvento,
  Usuario,
} from '@/types/domain';

export const mockUsuarios: (Usuario & { password: string })[] = [
  {
    id: 1,
    username: 'srodriguez',
    email: '',
    password: '',
    nombre: 'Sebastian',
    apellido: 'Rodriguez',
    rol: 'ADMINISTRADOR',
    empresaId: 1,
    empresaNombre: 'Salón Real Vista',
  },
  {
    id: 2,
    email: 'encargado@agendaza.com',
    password: 'encargado123',
    nombre: 'Martín',
    apellido: 'Suárez',
    rol: 'ENCARGADO',
    empresaId: 1,
    empresaNombre: 'Salón Real Vista',
  },
  {
    id: 3,
    email: 'cliente@agendaza.com',
    password: 'cliente123',
    nombre: 'Juan',
    apellido: 'Pérez',
    rol: 'CLIENTE',
    empresaId: 1,
    empresaNombre: 'Salón Real Vista',
  },
  {
    id: 4,
    email: 'empleado@agendaza.com',
    password: 'empleado123',
    nombre: 'Carla',
    apellido: 'Díaz',
    rol: 'EMPLEADO',
    empresaId: 1,
    empresaNombre: 'Salón Real Vista',
  },
];

export const mockEmpresa: Empresa = {
  id: 1,
  nombre: 'Salón Real Vista',
  direccion: 'Av. Siempre Viva 742',
  telefono: '+54 11 5555-5555',
};

export const mockEmpresasAsignadas: Record<number, Empresa[]> = {
  1: [
    mockEmpresa,
    { id: 2, nombre: 'Jardín Los Álamos', direccion: 'Los Álamos 1280', telefono: '+54 11 5555-1280' },
  ],
  2: [mockEmpresa],
  3: [mockEmpresa],
  4: [mockEmpresa],
};

export const mockTipoEventos: TipoEvento[] = [
  {
    id: 1,
    nombre: 'CASAMIENTO',
    duracion: 'LARGO',
    precioBase: 250000,
    listaServicio: [
      { id: 1, nombre: 'Salón principal' },
      { id: 2, nombre: 'Catering base' },
      { id: 3, nombre: 'Música en vivo' },
      { id: 4, nombre: 'Decoración floral' },
    ],
  },
  {
    id: 2,
    nombre: 'CUMPLEAÑOS',
    duracion: 'MEDIO',
    precioBase: 120000,
    listaServicio: [
      { id: 1, nombre: 'Salón principal' },
      { id: 5, nombre: 'Animación infantil' },
      { id: 6, nombre: 'Torta y mesas dulces' },
    ],
  },
  {
    id: 3,
    nombre: 'EMPRESARIAL',
    duracion: 'CORTO',
    precioBase: 80000,
    listaServicio: [
      { id: 1, nombre: 'Salón principal' },
      { id: 7, nombre: 'Coffee break' },
      { id: 8, nombre: 'Proyector y pantalla' },
    ],
  },
  {
    id: 4,
    nombre: 'FIESTA DE 15',
    duracion: 'LARGO',
    precioBase: 180000,
    listaServicio: [
      { id: 1, nombre: 'Salón principal' },
      { id: 2, nombre: 'Catering base' },
      { id: 9, nombre: 'DJ profesional' },
      { id: 10, nombre: 'Cabezales y luces' },
    ],
  },
];

export const mockExtrasFijos: Extra[] = [
  { id: 101, nombre: 'Pista de baile LED', tipoExtra: 'EVENTO', empresaId: 1, precio: 35000, cantidad: 1, listaTipoEventoId: [1, 4] },
  { id: 102, nombre: 'Fotocabina', tipoExtra: 'EVENTO', empresaId: 1, precio: 18000, cantidad: 1, listaTipoEventoId: [1, 2, 4] },
  { id: 103, nombre: 'Barra de tragos', tipoExtra: 'EVENTO', empresaId: 1, precio: 28000, cantidad: 1, listaTipoEventoId: [1, 4] },
  { id: 104, nombre: 'Living lounge', tipoExtra: 'EVENTO', empresaId: 1, precio: 22000, cantidad: 1, listaTipoEventoId: [1, 2, 3, 4] },
];

export const mockExtrasVariables: Extra[] = [
  { id: 201, nombre: 'Horas adicionales', tipoExtra: 'VARIABLE_EVENTO', empresaId: 1, precio: 15000, cantidad: 1, listaTipoEventoId: [] },
  { id: 202, nombre: 'Sillas extra (por unidad)', tipoExtra: 'VARIABLE_EVENTO', empresaId: 1, precio: 1200, cantidad: 1, listaTipoEventoId: [] },
  { id: 203, nombre: 'Estacionamiento VIP', tipoExtra: 'VARIABLE_EVENTO', empresaId: 1, precio: 9000, cantidad: 1, listaTipoEventoId: [] },
];

export const mockTipoCatering: Extra[] = [
  { id: 301, nombre: 'Menú clásico', tipoExtra: 'TIPO_CATERING', empresaId: 1, precio: 8500, cantidad: 1, listaTipoEventoId: [1, 2, 4] },
  { id: 302, nombre: 'Menú premium', tipoExtra: 'TIPO_CATERING', empresaId: 1, precio: 14000, cantidad: 1, listaTipoEventoId: [1, 4] },
  { id: 303, nombre: 'Menú infantil', tipoExtra: 'TIPO_CATERING', empresaId: 1, precio: 5500, cantidad: 1, listaTipoEventoId: [2] },
];

export const mockExtrasCatering: Extra[] = [
  { id: 401, nombre: 'Mesa de quesos', tipoExtra: 'VARIABLE_CATERING', empresaId: 1, precio: 12000, cantidad: 1, listaTipoEventoId: [] },
  { id: 402, nombre: 'Sushi table', tipoExtra: 'VARIABLE_CATERING', empresaId: 1, precio: 22000, cantidad: 1, listaTipoEventoId: [] },
  { id: 403, nombre: 'Open bar premium', tipoExtra: 'VARIABLE_CATERING', empresaId: 1, precio: 35000, cantidad: 1, listaTipoEventoId: [] },
];

export const mockClientes: Cliente[] = [
  { id: 11, nombre: 'Juan', apellido: 'Pérez', celular: '1155551111', email: 'juanperez@mail.com' },
  { id: 12, nombre: 'María', apellido: 'Gómez', celular: '1166662222', email: 'maria.gomez@mail.com' },
  { id: 13, nombre: 'Diego', apellido: 'López', celular: '1177773333', email: 'diego.lopez@mail.com' },
  { id: 14, nombre: 'Sofía', apellido: 'Ruiz', celular: '1188884444', email: 'sofia.ruiz@mail.com' },
];

const today = new Date();
const iso = (d: Date, h = 20, m = 0) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};

export const mockAgenda: EventoAgenda[] = [
  { id: 1001, title: 'Casamiento González', start: iso(addDays(2), 20, 0), end: iso(addDays(3), 4, 0), estado: 'CONFIRMADO', color: '#0d6efd' },
  { id: 1002, title: 'Cumple 30 - Ferrari', start: iso(addDays(5), 21, 0), end: iso(addDays(5), 23, 30), estado: 'RESERVADO', color: 'dodgerblue' },
  { id: 1003, title: 'Evento corporativo TechCo', start: iso(addDays(8), 14, 0), end: iso(addDays(8), 18, 0), estado: 'CONFIRMADO', color: '#0d6efd' },
  { id: 1004, title: 'Fiesta de 15 - Álvarez', start: iso(addDays(12), 19, 0), end: iso(addDays(13), 2, 0), estado: 'COTIZADO', color: 'dodgerblue' },
  { id: 1005, title: 'Cumple infantil 5', start: iso(addDays(15), 16, 0), end: iso(addDays(15), 19, 0), estado: 'RESERVADO', color: 'dodgerblue' },
  { id: 1006, title: 'Casamiento Torres', start: iso(addDays(20), 20, 0), end: iso(addDays(21), 4, 0), estado: 'CONFIRMADO', color: '#0d6efd' },
  { id: 1007, title: 'Aniversario 25 años', start: iso(addDays(-3), 21, 0), end: iso(addDays(-3), 23, 30), estado: 'REALIZADO', color: '#198754' },
  { id: 1008, title: 'Bautismo Rojas', start: iso(addDays(-6), 13, 0), end: iso(addDays(-6), 17, 0), estado: 'REALIZADO', color: '#198754' },
];

export const mockEventosOcupacion: Record<string, string[]> = {
  // keyed by YYYY-MM-DD
};

mockAgenda.forEach((e) => {
  const key = e.start.slice(0, 10);
  if (!mockEventosOcupacion[key]) mockEventosOcupacion[key] = [];
  mockEventosOcupacion[key].push(`${e.title} · ${e.start.slice(11, 16)} a ${e.end.slice(11, 16)}`);
});

export const mockEstadosEvento: EstadoEvento[] = [
  'COTIZADO',
  'RESERVADO',
  'CONFIRMADO',
  'CANCELADO',
  'REALIZADO',
];

export const mockEstadosForNuevo: EstadoEvento[] = ['COTIZADO', 'RESERVADO', 'CONFIRMADO'];

export const mockMediosDePago: MedioPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MERCADO_PAGO', 'CHEQUE'];
export const mockConceptosPago = ['INGRESO', 'SEÑA', 'SALDO', 'CUOTA'];
export const mockTiposGasto = ['EVENTO', 'INSUMOS', 'MANTENIMIENTO', 'SERVICIOS', 'OTROS'];
export const mockGastos: Gasto[] = [];

const pagosBase: Array<Omit<Pago, 'id'>> = [
  { fecha: iso(addDays(-6), 12, 0), monto: 125000, medioPago: 'TRANSFERENCIA', concepto: 'INGRESO', descripcion: 'Seña casamiento Torres', esIngreso: true, eventoId: 1006, eventoNombre: 'Casamiento Torres', empresaId: 1, usuarioId: 2 },
  { fecha: iso(addDays(-6), 15, 0), monto: 38000, medioPago: 'EFECTIVO', concepto: 'GASTO', descripcion: 'Compra insumos decoración', esIngreso: false, empresaId: 1, usuarioId: 2 },
  { fecha: iso(addDays(-3), 22, 0), monto: 86000, medioPago: 'TARJETA', concepto: 'SALDO', descripcion: 'Saldo aniversario 25', esIngreso: true, eventoId: 1007, eventoNombre: 'Aniversario 25 años', empresaId: 1, usuarioId: 2 },
  { fecha: iso(addDays(-1), 10, 0), monto: 15000, medioPago: 'EFECTIVO', concepto: 'GASTO', descripcion: 'Reparación equipo de audio', esIngreso: false, empresaId: 1, usuarioId: 2 },
  { fecha: iso(today, 9, 0), monto: 60000, medioPago: 'TRANSFERENCIA', concepto: 'SEÑA', descripcion: 'Seña cumple Ferrari', esIngreso: true, eventoId: 1002, eventoNombre: 'Cumple 30 Ferrari', empresaId: 1, usuarioId: 2 },
  { fecha: iso(addDays(1), 11, 0), monto: 42000, medioPago: 'MERCADO_PAGO', concepto: 'PROVEEDOR', descripcion: 'Pago proveedor catering', esIngreso: false, empresaId: 1, usuarioId: 2 },
  { fecha: iso(addDays(3), 16, 0), monto: 180000, medioPago: 'TRANSFERENCIA', concepto: 'SALDO', descripcion: 'Saldo corporativo TechCo', esIngreso: true, eventoId: 1003, eventoNombre: 'Evento corporativo TechCo', empresaId: 1, usuarioId: 2 },
  { fecha: iso(addDays(4), 8, 0), monto: 25000, medioPago: 'EFECTIVO', concepto: 'GASTO', descripcion: 'Limpieza profesional', esIngreso: false, empresaId: 1, usuarioId: 2 },
];

const pagosRelativos: Pago[] = pagosBase.map((p, i) => ({ ...p, id: 5000 + i }));
const anioMockOctubre = today.getFullYear();
const pagosOctubre: Pago[] = Array.from({ length: 31 }, (_, index) => {
  const esIngreso = index % 2 === 0;
  return {
    id: 5100 + index,
    fecha: iso(new Date(anioMockOctubre, 9, index + 1), 9 + (index % 10)),
    monto: 25000 + index * 1500,
    medioPago: mockMediosDePago[index % mockMediosDePago.length],
    concepto: esIngreso ? 'INGRESO' : 'GASTO',
    descripcion: `${esIngreso ? 'Pago' : 'Gasto'} de prueba ${String(index + 1).padStart(2, '0')}`,
    esIngreso,
    empresaId: 1,
    usuarioId: 2,
  };
});

export const mockPagos: Pago[] = [
  ...pagosRelativos.filter((pago) => {
    const fecha = new Date(pago.fecha);
    return fecha.getFullYear() !== anioMockOctubre || fecha.getMonth() !== 9;
  }),
  ...pagosOctubre,
];

export function getMockResumenMes(mes: number, anio: number): ResumenPagosMes {
  const filtrados = mockPagos.filter((p) => {
    const d = new Date(p.fecha);
    return d.getMonth() + 1 === mes && d.getFullYear() === anio;
  });
  const ingresos = filtrados.filter((p) => p.esIngreso).reduce((s, p) => s + p.monto, 0);
  const egresos = filtrados.filter((p) => !p.esIngreso).reduce((s, p) => s + p.monto, 0);
  return {
    ingresos,
    egresos,
    balance: ingresos - egresos,
    cantidadMovimientos: filtrados.length,
  };
}

export function getMockPagosMes(mes: number, anio: number): Pago[] {
  return mockPagos.filter((p) => {
    const d = new Date(p.fecha);
    return d.getMonth() + 1 === mes && d.getFullYear() === anio;
  });
}
