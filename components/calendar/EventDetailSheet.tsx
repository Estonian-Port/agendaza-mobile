import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Check, Save } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { Checkbox, PriceEditor } from '@/components/ui/Checkbox';
import { Colors, Radius } from '@/constants/theme';
import { eventoService } from '@/services/evento.service';
import { Duracion, EventoVer, Extra } from '@/types/domain';
import { extraService } from '@/services/extra.service';
import { empresaService } from '@/services/empresa.service';

type EditorSection = 'EXTRAS' | 'CATERING';
const EVENT_DURATIONS: Duracion[] = ['CORTO', 'MEDIO', 'LARGO'];

interface EventDetailSheetProps {
  open: boolean;
  eventId: number | null;
  accountOpen: boolean;
  showAccountBackButton: boolean;
  accountTitle: string;
  accountContent: React.ReactNode;
  onClose: () => void;
  onCloseAccount: () => void;
  onUpdated: () => void;
  onOpenAccount: (event: EventoVer) => void;
}

function localDateKey(value: string) {
  return value.slice(0, 10);
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function makeDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

function normalizeTypeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
}

export function EventDetailSheet({ open, eventId, accountOpen, showAccountBackButton, accountTitle, accountContent, onClose, onCloseAccount, onUpdated, onOpenAccount }: EventDetailSheetProps) {
  const [event, setEvent] = useState<EventoVer | null>(null);
  const [fixedExtras, setFixedExtras] = useState<Extra[]>([]);
  const [variableExtras, setVariableExtras] = useState<Extra[]>([]);
  const [cateringTypes, setCateringTypes] = useState<Extra[]>([]);
  const [cateringExtras, setCateringExtras] = useState<Extra[]>([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<EditorSection | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || eventId === null) return;
    let active = true;
    setLoading(true);
    setError('');
    setEvent(null);
    setEditingSection(null);
    const load = async () => {
      try {
        const loadedEvent = await eventoService.getEventoVer(eventId);
        if (!active) return;
        setEvent(loadedEvent);
        setName(loadedEvent.nombre);
        setDate(localDateKey(loadedEvent.inicio));
        setStartTime(formatTime(loadedEvent.inicio));
        setEndTime(formatTime(loadedEvent.fin));
        setAdults(String(loadedEvent.capacidadAdultos));
        setChildren(String(loadedEvent.capacidadNinos));
        setDescription(loadedEvent.anotaciones ?? '');
      } catch (cause) {
        if (active) setError(errorText(cause));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [open, eventId]);

  const openEditor = async (section: EditorSection) => {
    if (!event) return;
    setEditingSection(section);
    setLoadingOptions(true);
    setOptionsLoaded(false);
    setError('');
    try {
      let tipoEventoId = event.tipoEventoId;
      if (tipoEventoId === undefined && event.tipoEventoNombre) {
        const tiposPorDuracion = await Promise.all(
          EVENT_DURATIONS.map((duracion) => empresaService.getTiposEvento(duracion)),
        );
        const tipos = tiposPorDuracion.flat();
        const eventTypeName = normalizeTypeName(event.tipoEventoNombre);
        tipoEventoId = tipos.find((tipo) => normalizeTypeName(tipo.nombre) === eventTypeName)?.id;
      }
      if (tipoEventoId === undefined) {
        throw new Error('No se pudo identificar el tipo de evento para cargar las opciones.');
      }

      const eventDate = localDateKey(event.inicio);
      if (section === 'EXTRAS') {
        const [fixed, variable] = await Promise.all([
          extraService.getByTipoEventoAndFecha(tipoEventoId, eventDate, 'EVENTO'),
          extraService.getByTipoEventoAndFecha(tipoEventoId, eventDate, 'VARIABLE_EVENTO'),
        ]);
        setFixedExtras(fixed);
        setVariableExtras(variable);
      } else {
        const [types, catering] = await Promise.all([
          extraService.getByTipoEventoAndFecha(tipoEventoId, eventDate, 'TIPO_CATERING'),
          extraService.getByTipoEventoAndFecha(tipoEventoId, eventDate, 'VARIABLE_CATERING'),
        ]);
        setCateringTypes(types);
        setCateringExtras(catering);
      }
      setOptionsLoaded(true);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoadingOptions(false);
    }
  };

  const toggleExtra = (list: keyof Pick<EventoVer, 'listaExtra' | 'listaExtraVariable' | 'listaExtraTipoCatering' | 'listaExtraCateringVariable'>, option: Extra) => {
    setEvent((current) => {
      if (!current) return current;
      const currentItems = current[list];
      const selected = currentItems.some((item) => item.id === option.id);
      const defaultQuantity = list === 'listaExtraTipoCatering'
        ? Number(adults || 0) + Number(children || 0)
        : 1;
      return {
        ...current,
        [list]: selected
          ? currentItems.filter((item) => item.id !== option.id)
          : [...currentItems, { ...option, cantidad: defaultQuantity }],
      };
    });
  };

  const setExtraQuantity = (
    list: 'listaExtraVariable' | 'listaExtraCateringVariable',
    option: Extra,
    quantity: number,
  ) => {
    setEvent((current) => {
      if (!current) return current;
      const currentItems = current[list];
      const selected = currentItems.some((item) => item.id === option.id);
      return {
        ...current,
        [list]: quantity === 0
          ? currentItems.filter((item) => item.id !== option.id)
          : selected
            ? currentItems.map((item) => item.id === option.id ? { ...item, cantidad: quantity } : item)
            : [...currentItems, { ...option, cantidad: quantity }],
      };
    });
  };

  const setExtraPrice = (
    list: keyof Pick<EventoVer, 'listaExtra' | 'listaExtraVariable' | 'listaExtraTipoCatering' | 'listaExtraCateringVariable'>,
    extraId: number,
    price: number,
  ) => {
    setEvent((current) => current ? {
      ...current,
      [list]: current[list].map((item) => item.id === extraId ? { ...item, precio: price } : item),
    } : current);
    const updateCatalog = (items: Extra[]) => items.map((item) => item.id === extraId ? { ...item, precio: price } : item);
    if (list === 'listaExtra') setFixedExtras(updateCatalog);
    if (list === 'listaExtraVariable') setVariableExtras(updateCatalog);
    if (list === 'listaExtraTipoCatering') setCateringTypes(updateCatalog);
    if (list === 'listaExtraCateringVariable') setCateringExtras(updateCatalog);
  };

  const save = async () => {
    if (!event) return;
    setError('');
    if (!name.trim()) {
      setError('Ingresá el nombre del evento.');
      return;
    }
    if (!validDate(date)) {
      setError('Ingresá una fecha válida con formato AAAA-MM-DD.');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      setError('Ingresá los horarios con formato HH:MM.');
      return;
    }
    const adultCount = Number(adults);
    const childCount = Number(children);
    if (!Number.isInteger(adultCount) || adultCount < 0 || !Number.isInteger(childCount) || childCount < 0) {
      setError('Las cantidades deben ser números enteros iguales o mayores a cero.');
      return;
    }

    let start = makeDateTime(date, startTime);
    let end = makeDateTime(date, endTime);
    if (end <= start) {
      const nextDay = new Date(`${date}T12:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDate = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
      end = makeDateTime(nextDate, endTime);
    }

    setSaving(true);
    try {
      await Promise.all([
        eventoService.editEventoNombre(name.trim(), event.id),
        eventoService.editEventoHora({ id: event.id, inicio: start, fin: end }),
        eventoService.editEventoCapacidad(event.id, adultCount, childCount),
        eventoService.editEventoAnotaciones(description, event.id),
      ]);
      setEvent({ ...event, nombre: name.trim(), inicio: start, fin: end, capacidadAdultos: adultCount, capacidadNinos: childCount, anotaciones: description });
      onUpdated();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSaving(false);
    }
  };

  const saveEditor = async () => {
    if (!event || !editingSection) return;
    setError('');
    setSaving(true);
    try {
      if (editingSection === 'EXTRAS') {
        if (event.tipoEventoId === undefined) {
          throw new Error('No se pudo identificar el tipo de evento para guardar los extras.');
        }
        await eventoService.editEventoExtra({
          id: event.id,
          nombre: event.nombre,
          codigo: event.codigo,
          extraOtro: event.extraOtro,
          extraOtroDescripcion: event.extraOtroDescripcion,
          listaEventoExtra: [...event.listaExtra, ...event.listaExtraVariable],
          tipoEventoExtra: {
            id: event.tipoEventoId,
            nombre: event.tipoEventoNombre ?? '',
            precio: event.precioTipoEvento,
          },
          fechaEvento: event.inicio,
        });
      } else {
        if (event.tipoEventoId === undefined) {
          throw new Error('No se pudo identificar el tipo de evento para guardar el catering.');
        }
        await eventoService.editEventoCatering({
          id: event.id,
          nombre: event.nombre,
          codigo: event.codigo,
          cateringOtro: event.cateringOtro,
          cateringOtroDescripcion: event.cateringOtroDescripcion,
          listaExtra: [...event.listaExtraTipoCatering, ...event.listaExtraCateringVariable],
          tipoEventoId: event.tipoEventoId,
          fechaEvento: event.inicio,
          capacidadAdultos: event.capacidadAdultos,
          capacidadNinos: event.capacidadNinos,
        });
      }
      setEditingSection(null);
      onUpdated();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={accountOpen ? accountTitle : editingSection ? (editingSection === 'EXTRAS' ? 'Editar extras' : 'Editar catering') : 'Ver evento'} height="94%">
      {loading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : !event ? (
        <Text style={styles.error}>{error || 'No se pudo cargar el evento.'}</Text>
      ) : accountOpen ? (
        <>
          {showAccountBackButton && (
            <Button
              label="Volver al evento"
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={16} color={Colors.primary} />}
              onPress={onCloseAccount}
            />
          )}
          {accountContent}
        </>
      ) : editingSection ? (
        <>
          <Button
            label="Volver al evento"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} color={Colors.primary} />}
            onPress={() => { setEditingSection(null); setError(''); }}
          />
          {loadingOptions ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : (
            editingSection === 'EXTRAS' ? (
              <>
                <Text style={styles.sectionTitle}>Fijos</Text>
                {fixedExtras.map((extra) => {
                  const selectedExtra = event.listaExtra.find((item) => item.id === extra.id);
                  return <ExtraOption
                    key={extra.id}
                    extra={selectedExtra ?? extra}
                    selected={!!selectedExtra}
                    onPriceChange={(price) => setExtraPrice('listaExtra', extra.id, price)}
                    onPress={() => toggleExtra('listaExtra', extra)}
                  />;
                })}
                <Text style={styles.sectionTitle}>Variables</Text>
                {variableExtras.map((extra) => {
                  const selectedExtra = event.listaExtraVariable.find((item) => item.id === extra.id);
                  return (
                    <VariableExtraOption
                      key={extra.id}
                      extra={selectedExtra ?? extra}
                      quantity={selectedExtra?.cantidad ?? 0}
                      onPriceChange={(price) => setExtraPrice('listaExtraVariable', extra.id, price)}
                      onQuantityChange={(quantity) => setExtraQuantity('listaExtraVariable', selectedExtra ?? extra, quantity)}
                    />
                  );
                })}
                <Text style={styles.sectionTitle}>Otro extra</Text>
                <Input
                  label="Importe"
                  value={String(event.extraOtro || '')}
                  onChangeText={(value) => setEvent((current) => current ? { ...current, extraOtro: Number(value.replace(',', '.')) || 0 } : current)}
                  keyboardType="numeric"
                />
                <Input
                  label="Descripción"
                  value={event.extraOtroDescripcion ?? ''}
                  onChangeText={(value) => setEvent((current) => current ? { ...current, extraOtroDescripcion: value } : current)}
                  placeholder="Descripción"
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Menú</Text>
                {cateringTypes.map((extra) => {
                  const selectedExtra = event.listaExtraTipoCatering.find((item) => item.id === extra.id);
                  return <ExtraOption
                    key={extra.id}
                    extra={selectedExtra ?? extra}
                    selected={!!selectedExtra}
                    priceMultiplier={selectedExtra?.cantidad}
                    onPriceChange={(price) => setExtraPrice('listaExtraTipoCatering', extra.id, price)}
                    onPress={() => toggleExtra('listaExtraTipoCatering', extra)}
                  />;
                })}
                <Text style={styles.sectionTitle}>Extras de catering</Text>
                {cateringExtras.map((extra) => {
                  const selectedExtra = event.listaExtraCateringVariable.find((item) => item.id === extra.id);
                  return (
                    <VariableExtraOption
                      key={extra.id}
                      extra={selectedExtra ?? extra}
                      quantity={selectedExtra?.cantidad ?? 0}
                      onPriceChange={(price) => setExtraPrice('listaExtraCateringVariable', extra.id, price)}
                      onQuantityChange={(quantity) => setExtraQuantity('listaExtraCateringVariable', selectedExtra ?? extra, quantity)}
                    />
                  );
                })}
                <Input
                  label="Catering personalizado"
                  value={event.cateringOtroDescripcion ?? ''}
                  onChangeText={(value) => setEvent((current) => current ? { ...current, cateringOtroDescripcion: value } : current)}
                  placeholder="Descripción"
                />
                <Input
                  label="Precio de catering personalizado"
                  value={String(event.cateringOtro || '')}
                  onChangeText={(value) => setEvent((current) => current ? { ...current, cateringOtro: Number(value.replace(',', '.')) || 0 } : current)}
                  keyboardType="numeric"
                />
              </>
            )
          )}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button
            label="Guardar cambios"
            icon={<Save size={17} color={Colors.white} />}
            onPress={() => void saveEditor()}
            loading={saving}
            disabled={!optionsLoaded}
            fullWidth
            style={styles.saveButton}
          />
        </>
      ) : (
        <>
          <View style={styles.identity}>
            <Text style={styles.eventCode}>{event.codigo} · {event.estado}</Text>
            <Text style={styles.budget}>{formatCurrency(event.presupuesto)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Evento</Text>
          <Input label="Nombre" value={name} onChangeText={setName} />
          <Input label="Fecha (AAAA-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-10-27" />
          <View style={styles.timeRow}>
            <View style={styles.half}><Input label="Hora inicio" value={startTime} onChangeText={setStartTime} placeholder="20:00" /></View>
            <View style={styles.half}><Input label="Hora final" value={endTime} onChangeText={setEndTime} placeholder="23:00" /></View>
          </View>
          <View style={styles.timeRow}>
            <View style={styles.half}><Input label="Adultos" value={adults} onChangeText={setAdults} keyboardType="numeric" /></View>
            <View style={styles.half}><Input label="Niños" value={children} onChangeText={setChildren} keyboardType="numeric" /></View>
          </View>
          <Input label="Descripción / anotaciones" value={description} onChangeText={setDescription} />

          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.clientPanel}>
            <Text style={styles.clientName}>{event.cliente.nombre} {event.cliente.apellido}</Text>
            {!!event.cliente.celular && <Text style={styles.clientMeta}>{event.cliente.celular}</Text>}
            {!!event.cliente.email && (
              <Text style={styles.clientMeta}>
                {event.cliente.email.startsWith('sin-email') ? 'Sin email' : event.cliente.email}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Extras</Text>
          <SelectedExtraList title="Fijos" items={event.listaExtra} />
          <SelectedExtraList title="Variables" items={event.listaExtraVariable} />
          {(event.extraOtroDescripcion || event.extraOtro > 0) && (
            <View style={styles.customCatering}>
              <Text style={styles.extraName}>{event.extraOtroDescripcion || 'Otro extra'}</Text>
              <Text style={styles.extraPrice}>{formatCurrency(event.extraOtro)}</Text>
            </View>
          )}
          <Button label="Editar extras" variant="outline" onPress={() => void openEditor('EXTRAS')} fullWidth />

          <Text style={styles.sectionTitle}>Catering</Text>
          <SelectedExtraList title="Tipo de catering" items={event.listaExtraTipoCatering} />
          <SelectedExtraList title="Extras de catering" items={event.listaExtraCateringVariable} />
          {(event.cateringOtroDescripcion || event.cateringOtro > 0) && (
            <View style={styles.customCatering}>
              <Text style={styles.extraName}>{event.cateringOtroDescripcion || 'Catering personalizado'}</Text>
              <Text style={styles.extraPrice}>{formatCurrency(event.cateringOtro)}</Text>
            </View>
          )}
          <Button label="Editar catering" variant="outline" onPress={() => void openEditor('CATERING')} fullWidth />

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button label="Guardar cambios" icon={<Save size={17} color={Colors.white} />} onPress={() => void save()} loading={saving} fullWidth style={styles.saveButton} />
          <Button label="Estado de cuenta" variant="outline" onPress={() => onOpenAccount(event)} fullWidth style={styles.movementActions} />
        </>
      )}
    </BottomSheet>
  );
}

function SelectedExtraList({ title, items }: { title: string; items: Extra[] }) {
  return (
    <View style={styles.selectedGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      {items.length === 0 ? <Text style={styles.emptyExtras}>Sin opciones seleccionadas</Text> : items.map((item) => (
        <View key={item.id} style={styles.selectedExtra}>
          <Text style={styles.extraName}>{item.nombre}{item.cantidad > 1 ? ` · ${item.cantidad}` : ''}</Text>
          <Text style={styles.extraPrice}>{formatCurrency(item.precio * item.cantidad)}</Text>
        </View>
      ))}
    </View>
  );
}

function ExtraOption({ extra, selected, quantity, priceMultiplier, onPress, onPriceChange, onQuantityChange }: {
  extra: Extra;
  selected: boolean;
  quantity?: number;
  priceMultiplier?: number;
  onPress: () => void;
  onPriceChange?: (price: number) => void;
  onQuantityChange?: (quantity: number) => void;
}) {
  return (
    <View style={styles.extraOption}>
      <View style={styles.extraCheckbox}>
        <Checkbox
          label={extra.nombre}
          description={quantity !== undefined ? 'Precio por unidad' : 'Precio unitario'}
          checked={selected}
          onChange={onPress}
          priceValue={extra.precio}
          priceMultiplier={priceMultiplier ?? quantity}
          onPriceChange={onPriceChange}
        />
      </View>
      {selected && quantity !== undefined && onQuantityChange && (
        <Stepper label="" value={quantity} min={1} onChange={onQuantityChange} />
      )}
    </View>
  );
}

function VariableExtraOption({ extra, quantity, onPriceChange, onQuantityChange }: {
  extra: Extra;
  quantity: number;
  onPriceChange: (price: number) => void;
  onQuantityChange: (quantity: number) => void;
}) {
  return (
    <View style={styles.extraOption}>
      <View style={styles.variableDescription}>
        <Text style={styles.extraName}>{extra.nombre}</Text>
      </View>
      <PriceEditor value={extra.precio} onChange={onPriceChange} />
      <Stepper label="" value={quantity} min={0} max={500} onChange={onQuantityChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 36 },
  identity: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eventCode: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.text },
  budget: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.primary },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textDark, marginTop: 16, marginBottom: 10 },
  timeRow: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  clientPanel: { padding: 12, borderWidth: 1, borderColor: Colors.neutralBorder, borderRadius: Radius.button, backgroundColor: Colors.neutralBg },
  clientName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark },
  clientMeta: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text, marginTop: 4 },
  groupTitle: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text, marginTop: 4, marginBottom: 2 },
  selectedGroup: { marginBottom: 8 },
  selectedExtra: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutralBorder },
  emptyExtras: { paddingVertical: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.disabledText },
  customCatering: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  extraOption: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },  extraCheckbox: { flex: 1 },
  variableDescription: { flex: 1 },
  extraName: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textDark },
  extraPrice: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.text },
  error: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.danger },
  saveButton: { marginTop: 18 },
  movementActions: { marginTop: 10, marginBottom: 12 },
});