import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, CalendarDays, Check } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EventCard } from '@/components/calendar/EventCard';
import { EventSearchFields } from '@/components/calendar/EventSearchFields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Colors, Radius } from '@/constants/theme';
import { eventoService } from '@/services/evento.service';
import { gastoService } from '@/services/gasto.service';
import { pagoService } from '@/services/pago.service';
import { Evento, Gasto, Pago, Usuario } from '@/types/domain';

type TipoMovimiento = 'PAGO' | 'GASTO';
type TipoBusqueda = 'CODIGO' | 'FECHA';

interface MovementSheetProps {
  open: boolean;
  initialType: TipoMovimiento;
  initialEvent?: Evento | null;
  initialPago?: Pago | null;
  initialGasto?: Gasto | null;
  embedded?: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSaved: () => void;
}

function fechaLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fechaHoy() {
  return fechaLocal().slice(0, 10);
}

function formatOption(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export function MovementSheet({ open, initialType, initialEvent = null, initialPago = null, initialGasto = null, embedded = false, usuario, onClose, onSaved }: MovementSheetProps) {
  const [tipo, setTipo] = useState<TipoMovimiento>(initialType);
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>('FECHA');
  const [codigo, setCodigo] = useState('');
  const [fecha, setFecha] = useState(fechaHoy);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [pagoBase, setPagoBase] = useState<Pago | null>(null);
  const [monto, setMonto] = useState('');
  const [medioDePago, setMedioDePago] = useState('');
  const [concepto, setConcepto] = useState('');
  const [numeroCuota, setNumeroCuota] = useState('');
  const [gasto, setGasto] = useState<Gasto>(() => ({
    id: 0,
    monto: 0,
    tipoGasto: '',
    descripcion: '',
    fecha: fechaLocal(),
    empresaId: usuario.empresaId,
    usuarioId: usuario.id,
  }));
  const [mediosPago, setMediosPago] = useState<string[]>([]);
  const [conceptos, setConceptos] = useState<string[]>([]);
  const [tiposGasto, setTiposGasto] = useState<string[]>([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [cargandoEvento, setCargandoEvento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const isEditing = initialPago !== null || initialGasto !== null;

  useEffect(() => {
    if (!open) return;
    const activeType = initialPago ? 'PAGO' : initialGasto ? 'GASTO' : initialType;
    setTipo(activeType);
    setTipoBusqueda('FECHA');
    setCodigo('');
    setFecha(fechaHoy());
    setEventos([]);
    setEvento(initialEvent);
    setPagoBase(initialPago);
    setMonto(initialPago ? String(initialPago.monto) : initialGasto ? String(initialGasto.monto) : '');
    setMedioDePago(initialPago?.medioDePago || initialPago?.medioPago || initialGasto?.medioDePago || '');
    setConcepto(initialPago?.concepto || '');
    setNumeroCuota(initialPago?.numeroCuota ?? '');
    setGasto(initialGasto ? { ...initialGasto } : {
      id: 0,
      monto: 0,
      tipoGasto: '',
      descripcion: '',
      fecha: fechaLocal(),
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      codigoEvento: initialEvent?.codigo,
      eventoId: initialEvent?.id,
      nombreEvento: initialEvent?.nombre,
    });
    setError('');
    setCargandoOpciones(true);
    Promise.all([
      pagoService.getMediosDePago(),
      pagoService.getConceptos(),
      gastoService.getAllTipoGasto(),
    ])
      .then(async ([medios, conceptosDisponibles, tiposDisponibles]) => {
        setMediosPago(medios);
        setConceptos(conceptosDisponibles);
        setTiposGasto(tiposDisponibles);
        setMedioDePago((current) => current || medios[0] || '');
        setConcepto((current) => current || conceptosDisponibles[0] || '');
        setGasto((actual) => ({
          ...actual,
          tipoGasto: initialGasto ? actual.tipoGasto : tiposDisponibles[0] ?? 'OTROS',
          medioDePago: actual.medioDePago || medios[0],
        }));
        if (initialEvent && activeType === 'PAGO' && !initialPago) {
          const basePago = await pagoService.getEventoForSavePago(initialEvent.id);
          setPagoBase(basePago);
          setMonto(basePago.monto > 0 ? String(basePago.monto) : '');
          setMedioDePago(basePago.medioDePago || basePago.medioPago || medios[0] || '');
          setConcepto(basePago.concepto || conceptosDisponibles[0] || '');
          setNumeroCuota(basePago.numeroCuota || '');
        }
      })
      .catch((cause) => setError(errorText(cause)))
      .finally(() => setCargandoOpciones(false));
  }, [open, initialType, initialEvent?.id, initialPago?.id, initialGasto?.id, usuario.empresaId, usuario.id]);

  const cambiarTipo = (nuevoTipo: TipoMovimiento) => {
    setTipo(nuevoTipo);
    setTipoBusqueda('FECHA');
    setEventos([]);
    setEvento(null);
    setPagoBase(null);
    setError('');
  };

  const seleccionarEvento = async (seleccionado: Evento) => {
    setError('');
    setEventos([]);
    setCargandoEvento(true);
    try {
      if (tipo === 'PAGO') {
        const basePago = await pagoService.getEventoForSavePago(seleccionado.id);
        setPagoBase(basePago);
        setMonto(basePago.monto > 0 ? String(basePago.monto) : '');
        setMedioDePago(basePago.medioDePago || basePago.medioPago || mediosPago[0] || '');
        setConcepto(basePago.concepto || conceptos[0] || '');
        setNumeroCuota(basePago.numeroCuota || '');
      } else {
        setGasto((actual) => ({
          ...actual,
          codigoEvento: seleccionado.codigo,
          eventoId: seleccionado.id,
          nombreEvento: seleccionado.nombre,
        }));
      }
      setEvento(seleccionado);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setCargandoEvento(false);
    }
  };

  const buscarEvento = async () => {
    setError('');
    setEventos([]);
    if (tipoBusqueda === 'CODIGO' && !codigo.trim()) {
      setError('Ingresá el código del evento.');
      return;
    }
    if (tipoBusqueda === 'FECHA' && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError('Ingresá la fecha con formato AAAA-MM-DD.');
      return;
    }

    setBuscando(true);
    try {
      if (tipoBusqueda === 'CODIGO') {
        const eventoId = await eventoService.getEventoIdByCodigo(codigo.trim());
        const resultado = await eventoService.getEventoVer(eventoId);
        await seleccionarEvento(resultado);
      } else {
        const resultados = await eventoService.getAllEventosByFecha(fecha);
        setEventos(resultados);
        if (resultados.length === 0) setError('No hay eventos para esa fecha.');
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBuscando(false);
    }
  };

  const quitarEvento = () => {
    setEvento(null);
    setPagoBase(null);
    setEventos([]);
    setCodigo('');
    setGasto((actual) => ({ ...actual, codigoEvento: undefined, eventoId: undefined, nombreEvento: undefined }));
    setMonto('');
    setError('');
  };

  const guardar = async () => {
    setError('');
    const montoNumerico = Number(monto.replace(',', '.'));
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      setError('Ingresá un monto mayor a cero.');
      return;
    }

    if (tipo === 'PAGO') {
      if (!evento || !pagoBase) {
        setError('Buscá y seleccioná el evento del pago.');
        return;
      }
      if (!medioDePago || !concepto) {
        setError('Seleccioná el medio de pago y el concepto.');
        return;
      }
      setGuardando(true);
      try {
        await pagoService.save({
          ...pagoBase,
          eventoId: evento.id,
          monto: montoNumerico,
          medioDePago,
          concepto,
          numeroCuota: concepto === 'CUOTA' ? numeroCuota.trim() : undefined,
          usuarioId: usuario.id,
        }, usuario.id);
        onSaved();
        onClose();
      } catch (cause) {
        setError(errorText(cause));
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (!gasto.tipoGasto || !gasto.descripcion.trim()) {
      setError('Completá el tipo y la descripción del gasto.');
      return;
    }
    if (gasto.tipoGasto === 'EVENTO' && !evento) {
      setError('El tipo EVENTO requiere vincular un evento.');
      return;
    }
    if (!gasto.medioDePago) {
      setError('Seleccioná el medio de pago.');
      return;
    }

    setGuardando(true);
    try {
      await gastoService.save({ ...gasto, monto: montoNumerico, usuarioId: usuario.id }, usuario.id);
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setGuardando(false);
    }
  };

  const conceptosOptions: SelectOption[] = conceptos.map((value) => ({ label: formatOption(value), value }));
  const mediosOptions: SelectOption[] = mediosPago.map((value) => ({ label: formatOption(value), value }));
  const tiposOptions: SelectOption[] = tiposGasto.map((value) => ({ label: formatOption(value), value }));

  const content = (
    <>
      {embedded && <Button
        label="Volver a estado de cuenta"
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={16} color={Colors.primary} />}
        onPress={onClose}
      />}
      {!isEditing && <View style={styles.typeSwitch}>
        {(['PAGO', 'GASTO'] as const).map((value) => {
          const selected = tipo === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => cambiarTipo(value)}
              style={[styles.typeOption, selected && styles.typeOptionSelected]}
            >
              <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                {value === 'PAGO' ? 'Pago' : 'Gasto'}
              </Text>
            </Pressable>
          );
        })}
      </View>}

      {cargandoOpciones ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.sectionHeading}>
            <CalendarDays size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{tipo === 'PAGO' ? 'Evento del pago' : 'Vincular evento'}</Text>
            {tipo === 'GASTO' && gasto.tipoGasto !== 'EVENTO' && <Text style={styles.optional}>Opcional</Text>}
          </View>

          {evento ? (
            <EventCard
              title={evento.nombre}
              code={evento.codigo}
              start={evento.inicio}
              end={evento.fin}
              status={evento.estado}
              accessory={!isEditing ? <Text style={styles.changeEventText}>Cambiar</Text> : undefined}
              onPress={isEditing ? () => undefined : quitarEvento}
            />
          ) : (
            <>
              <View style={styles.searchSwitch}>
                {(['FECHA', 'CODIGO'] as const).map((value) => {
                  const selected = tipoBusqueda === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => { setTipoBusqueda(value); setEventos([]); setError(''); }}
                      style={[styles.searchOption, selected && styles.searchOptionSelected]}
                    >
                      <Text style={[styles.searchLabel, selected && styles.searchLabelSelected]}>
                        {value === 'CODIGO' ? 'Código' : 'Fecha'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <EventSearchFields
                searchType={tipoBusqueda}
                value={tipoBusqueda === 'CODIGO' ? codigo : fecha}
                onChangeText={tipoBusqueda === 'CODIGO' ? setCodigo : setFecha}
                dateLabel="Fecha del evento"
                datePlaceholder="AAAA-MM-DD"
                loading={buscando || cargandoEvento}
                onSearch={() => void buscarEvento()}
              />
              {eventos.map((item) => (
                <EventCard
                  key={item.id}
                  title={item.nombre}
                  code={item.codigo}
                  start={item.inicio}
                  end={item.fin}
                  status={item.estado}
                  accessory={<Check size={18} color={Colors.primary} />}
                  onPress={() => void seleccionarEvento(item)}
                />
              ))}
            </>
          )}

          {tipo === 'PAGO' ? (
            evento && pagoBase ? (
              <View style={styles.formFields}>
                <Input label="Monto" value={monto} onChangeText={setMonto} placeholder="0" keyboardType="numeric" />
                <Select label="Medio de pago" value={medioDePago} options={mediosOptions} onChange={(value) => setMedioDePago(String(value))} placeholder="Seleccionar medio" />
                <Select label="Concepto" value={concepto} options={conceptosOptions} onChange={(value) => setConcepto(String(value))} placeholder="Seleccionar concepto" />
                {concepto === 'CUOTA' && <Input label="Número de cuota" value={numeroCuota} onChangeText={setNumeroCuota} placeholder="Ej. 2 de 6" />}
              </View>
            ) : null
          ) : (
            <View style={styles.formFields}>
              <Input label="Fecha y hora" value={gasto.fecha} onChangeText={(value) => setGasto((actual) => ({ ...actual, fecha: value }))} placeholder="AAAA-MM-DDTHH:mm" />
              <Select label="Tipo de gasto" value={gasto.tipoGasto} options={tiposOptions} onChange={(value) => setGasto((actual) => ({ ...actual, tipoGasto: String(value) }))} placeholder="Seleccionar tipo" />
              <Input label="Descripción" value={gasto.descripcion} onChangeText={(value) => setGasto((actual) => ({ ...actual, descripcion: value }))} placeholder="Detalle del gasto" />
              <Input label="Monto" value={monto} onChangeText={setMonto} placeholder="0" keyboardType="numeric" />
              <Select label="Medio de pago" value={gasto.medioDePago || ''} options={mediosOptions} onChange={(value) => setGasto((actual) => ({ ...actual, medioDePago: String(value) }))} placeholder="Seleccionar medio" />
            </View>
          )}

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button
            label={isEditing ? 'Guardar cambios' : tipo === 'PAGO' ? 'Guardar pago' : 'Guardar gasto'}
            icon={<Check size={17} color={Colors.white} />}
            onPress={() => void guardar()}
            loading={guardando}
            disabled={cargandoEvento || (tipo === 'PAGO' && !evento) || (tipo === 'GASTO' && gasto.tipoGasto === 'EVENTO' && !evento)}
            fullWidth
            style={styles.saveButton}
          />
        </>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <BottomSheet open={open} onClose={onClose} title={isEditing ? (tipo === 'PAGO' ? 'Editar pago' : 'Editar gasto') : tipo === 'PAGO' ? 'Registrar pago' : 'Registrar gasto'} height="92%">
      {content}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  typeSwitch: { flexDirection: 'row', gap: 4, padding: 4, marginBottom: 20, backgroundColor: Colors.neutralInput, borderRadius: Radius.button },
  typeOption: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 6 },
  typeOptionSelected: { backgroundColor: Colors.white },
  typeLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  typeLabelSelected: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark },
  optional: { marginLeft: 'auto', fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  searchSwitch: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchOption: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: Radius.button, borderWidth: 1, borderColor: Colors.neutralBorder },
  searchOptionSelected: { borderColor: Colors.primary, backgroundColor: '#edf4ff' },
  searchLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.text },
  searchLabelSelected: { color: Colors.primary },
  changeEventText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.primary },
  formFields: { marginTop: 16 },
  loader: { marginVertical: 36 },
  error: { marginTop: 8, marginBottom: 12, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.danger },
  saveButton: { marginTop: 20, marginBottom: 10 },
});
