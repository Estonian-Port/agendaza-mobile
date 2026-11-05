import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Asterisk, ArrowLeft, DollarSign, Receipt, Save, UserRound, Utensils } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { Checkbox, PriceEditor } from '@/components/ui/Checkbox';
import { Colors, Radius } from '@/constants/theme';
import { eventoService } from '@/services/evento.service';
import { EventoUsuario, EventoVer, Extra } from '@/types/domain';
import { extraService } from '@/services/extra.service';
import { empresaService } from '@/services/empresa.service';
import { getEmpresaActivaId } from '@/services/empresa.service';
import { usuarioService } from '@/services/usuario.service';

type EditorSection = 'EXTRAS' | 'CATERING';

interface EventDetailSheetProps {
  open: boolean;
  eventId: number | null;
  accountOpen: boolean;
  showAccountBackButton: boolean;
  accountTitle: string;
  accountContent: React.ReactNode;
  onClose: () => void;
  onCloseAccount: () => void;
  onUpdated: (date?: string) => void;
  onOpenAccount: (event: EventoVer) => void;
}

function localDateKey(value: string) {
  return value.slice(0, 10);
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function formatEventDate(value?: string) {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
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
  const [editingClient, setEditingClient] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientSurname, setClientSurname] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientEvents, setClientEvents] = useState<EventoUsuario[]>([]);
  const [loadingClientEvents, setLoadingClientEvents] = useState(false);
  const [clientEventsError, setClientEventsError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || eventId === null) return;
    let active = true;
    setLoading(true);
    setError('');
    setEvent(null);
    setEditingSection(null);
    setEditingClient(false);
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

  useEffect(() => {
    if (!editingClient || !event?.cliente.id) return;
    let active = true;
    setLoadingClientEvents(true);
    setClientEventsError('');
    const loadClientEvents = async () => {
      try {
        const events = await eventoService.getEventosByUsuario(event.cliente.id!, getEmpresaActivaId());
        if (active) setClientEvents(events);
      } catch (cause) {
        if (active) setClientEventsError(errorText(cause));
      } finally {
        if (active) setLoadingClientEvents(false);
      }
    };
    void loadClientEvents();
    return () => {
      active = false;
    };
  }, [editingClient, event?.cliente.id]);

  const openEditor = async (section: EditorSection) => {
    if (!event) return;
    setEditingSection(section);
    setLoadingOptions(true);
    setOptionsLoaded(false);
    setError('');
    try {
      let tipoEventoId = event.tipoEventoId;
      if (tipoEventoId === undefined && event.tipoEventoNombre) {
        if (!event.duracion) {
          throw new Error('No se pudo identificar la duración del evento para cargar las opciones.');
        }
        const tipos = await empresaService.getTiposEvento(event.duracion);
        const eventTypeName = normalizeTypeName(event.tipoEventoNombre);
        tipoEventoId = tipos.find((tipo) => normalizeTypeName(tipo.nombre) === eventTypeName)?.id;
      }
      if (tipoEventoId === undefined) {
        throw new Error('No se pudo identificar el tipo de evento para cargar las opciones.');
      }

      const eventDate = localDateKey(event.inicio);
      if (section === 'EXTRAS') {
        const extras = await extraService.getByTipoEventoAndFecha(tipoEventoId, eventDate, [
          'EVENTO',
          'VARIABLE_EVENTO',
        ]);
        setFixedExtras(extras.filter((extra) => extra.tipoExtra === 'EVENTO'));
        setVariableExtras(extras.filter((extra) => extra.tipoExtra === 'VARIABLE_EVENTO'));
      } else {
        const extras = await extraService.getByTipoEventoAndFecha(tipoEventoId, eventDate, [
          'TIPO_CATERING',
          'VARIABLE_CATERING',
        ]);
        setCateringTypes(extras.filter((extra) => extra.tipoExtra === 'TIPO_CATERING'));
        setCateringExtras(extras.filter((extra) => extra.tipoExtra === 'VARIABLE_CATERING'));
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
        eventoService.editEventoHora({
          id: event.id,
          nombre: name.trim(),
          codigo: event.codigo,
          inicio: start,
          fin: end,
        }),
        eventoService.editEventoCapacidad(event.id, adultCount, childCount),
        ...(description !== (event.anotaciones ?? '')
          ? [eventoService.editEventoAnotaciones(description, event.id)]
          : []),
      ]);
      setEvent({ ...event, nombre: name.trim(), inicio: start, fin: end, capacidadAdultos: adultCount, capacidadNinos: childCount, anotaciones: description });
      onUpdated(start.slice(0, 10));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSaving(false);
    }
  };

  const openClientEditor = () => {
    if (!event || event.cliente.username?.trim()) return;
    setClientName(event.cliente.nombre);
    setClientSurname(event.cliente.apellido);
    setClientPhone(String(event.cliente.celular ?? ''));
    setClientEmail(event.cliente.email ?? '');
    setClientEvents([]);
    setClientEventsError('');
    setError('');
    setEditingClient(true);
  };

  const saveClient = async () => {
    if (!event || event.cliente.username?.trim()) return;
    const clientId = event.cliente.id;
    const trimmedName = clientName.trim();
    const trimmedSurname = clientSurname.trim();
    const trimmedPhone = clientPhone.trim();
    if (clientId === undefined) {
      setError('No se pudo identificar al cliente.');
      return;
    }
    if (!trimmedName || !trimmedSurname) {
      setError('Ingresá el nombre y apellido del cliente.');
      return;
    }
    if (trimmedPhone && !/^\d+$/.test(trimmedPhone)) {
      setError('Ingresá un teléfono válido.');
      return;
    }

    const updatedClient = {
      id: clientId,
      nombre: trimmedName,
      apellido: trimmedSurname,
      username: event.cliente.username ?? '',
      email: clientEmail.trim(),
      celular: trimmedPhone || undefined,
    };
    setError('');
    setSaving(true);
    try {
      await usuarioService.editCliente({
        ...updatedClient,
        celular: trimmedPhone ? Number(trimmedPhone) : undefined,
      });
      setEvent((current) => current ? { ...current, cliente: { ...current.cliente, ...updatedClient } } : current);
      setEditingClient(false);
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
    <BottomSheet open={open} onClose={onClose} title={accountOpen ? accountTitle : editingClient ? 'Editar cliente' : editingSection ? (editingSection === 'EXTRAS' ? 'Editar extras' : 'Editar catering') : 'Ver evento'} height="94%">
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
      ) : editingClient ? (
        <>
          <Button
            label="Volver al evento"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} color={Colors.primary} />}
            onPress={() => { setEditingClient(false); setError(''); }}
          />
          <Input label="Nombre" value={clientName} onChangeText={setClientName} />
          <Input label="Apellido" value={clientSurname} onChangeText={setClientSurname} />
          <Input label="Teléfono" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
          <Input label="Email" value={clientEmail} onChangeText={setClientEmail} keyboardType="email-address" />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button
            label="Guardar cliente"
            icon={<Save size={17} color={Colors.white} />}
            onPress={() => void saveClient()}
            loading={saving}
            fullWidth
            style={styles.saveButton}
          />
          <Text style={styles.sectionTitle}>Eventos del cliente</Text>
          {loadingClientEvents ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : clientEventsError ? (
            <Text style={styles.error}>{clientEventsError}</Text>
          ) : clientEvents.length === 0 ? (
            <Text style={styles.emptyExtras}>No hay eventos para mostrar.</Text>
          ) : clientEvents.map((clientEvent) => (
            <View key={clientEvent.id} style={styles.clientEventRow}>
              <View style={styles.clientEventInfo}>
                <Text style={styles.clientEventName}>{clientEvent.nombre}</Text>
                <Text style={styles.clientMeta}>{clientEvent.codigo}</Text>
              </View>
              <Text style={styles.clientEventDate}>{formatEventDate(clientEvent.fechaEvento)}</Text>
            </View>
          ))}
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
          <Button
            label="Estado de cuenta"
            variant="outline"
            icon={(
              <View style={styles.accountIcon}>
                <Receipt size={19} color={Colors.primary} />
                <DollarSign size={10} color={Colors.primary} style={styles.accountIconCurrency} />
              </View>
            )}
            onPress={() => onOpenAccount(event)}
            fullWidth
            style={styles.movementActions}
          />

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
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button label="Guardar cambios" icon={<Save size={17} color={Colors.white} />} onPress={() => void save()} loading={saving} fullWidth style={styles.saveButton} />

          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.clientPanel}>
            <Text style={styles.clientName}>{event.cliente.nombre} {event.cliente.apellido}</Text>
            {!!event.cliente.celular && <Text style={styles.clientMeta}>{String(event.cliente.celular)}</Text>}
            {!!event.cliente.email && (
              <Text style={styles.clientMeta}>
                {event.cliente.email.startsWith('sin-email') ? 'Sin email' : event.cliente.email}
              </Text>
            )}
          </View>
          {!event.cliente.username?.trim() && (
            <Button
              label="Editar cliente"
              variant="outline"
              icon={<UserRound size={17} color={Colors.primary} />}
              onPress={openClientEditor}
              fullWidth
            />
          )}

          <Text style={styles.sectionTitle}>Extras</Text>
          <SelectedExtraList title="Fijos" items={event.listaExtra} />
          <SelectedExtraList title="Variables" items={event.listaExtraVariable} />
          {(event.extraOtroDescripcion || event.extraOtro > 0) && (
            <View style={styles.selectedGroup}>
              <Text style={styles.groupTitle}>Otro</Text>
              <View style={styles.selectedExtra}>
                <Text style={styles.extraName}>{event.extraOtroDescripcion || 'Otro extra'}</Text>
                <Text style={styles.extraPrice}>{formatCurrency(event.extraOtro)}</Text>
              </View>
            </View>
          )}
          <Button
            label="Editar extras"
            variant="outline"
            icon={<Asterisk size={17} color={Colors.primary} />}
            onPress={() => void openEditor('EXTRAS')}
            fullWidth
          />

          <Text style={styles.sectionTitle}>Catering</Text>
          <SelectedExtraList title="Tipo de catering" items={event.listaExtraTipoCatering} />
          <SelectedExtraList title="Extras de catering" items={event.listaExtraCateringVariable} />
          {(event.cateringOtroDescripcion || event.cateringOtro > 0) && (
            <View style={styles.selectedGroup}>
              <Text style={styles.groupTitle}>Otro</Text>
              <View style={styles.selectedExtra}>
                <Text style={styles.extraName}>{event.cateringOtroDescripcion || 'Catering personalizado'}</Text>
                <Text style={styles.extraPrice}>{formatCurrency(event.cateringOtro)}</Text>
              </View>
            </View>
          )}
          <Button
            label="Editar catering"
            variant="outline"
            icon={<Utensils size={17} color={Colors.primary} />}
            onPress={() => void openEditor('CATERING')}
            fullWidth
          />

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
          <Text style={styles.extraName}>{item.nombre}{item.cantidad > 1 ? ` · x${item.cantidad}` : ''}</Text>
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
  accountIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
  },
  accountIconCurrency: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    backgroundColor: Colors.white,
  },
  loader: { marginVertical: 36 },
  identity: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eventCode: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.text },
  budget: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.primary },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textDark, marginTop: 16, marginBottom: 10 },
  timeRow: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  clientPanel: { padding: 12, borderWidth: 1, borderColor: Colors.neutralBorder, borderRadius: Radius.button, backgroundColor: Colors.neutralBg, marginBottom: 8 },
  clientName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark },
  clientMeta: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text, marginTop: 4 },
  clientEventRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutralBorder },
  clientEventInfo: { flex: 1 },
  clientEventName: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textDark },
  clientEventDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  groupTitle: { backgroundColor: '#eef5ff', borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 7, fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textDark, marginBottom: 2 },
  selectedGroup: { marginBottom: 12 },
  selectedExtra: { minHeight: 40, marginLeft: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutralBorder },
  emptyExtras: { marginLeft: 10, paddingVertical: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.disabledText },
  extraOption: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },  extraCheckbox: { flex: 1 },
  variableDescription: { flex: 1 },
  extraName: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textDark },
  extraPrice: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.text },
  error: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.danger },
  saveButton: { marginTop: 18 },
  movementActions: { marginTop: 10, marginBottom: 12 },
});