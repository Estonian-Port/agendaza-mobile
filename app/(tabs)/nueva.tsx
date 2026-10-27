import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { FormikErrors, useFormik } from 'formik';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  Search,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Stepper } from '@/components/ui/Stepper';
import { globalStyles } from '@/constants/styles';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { empresaService } from '@/services/empresa.service';
import { eventoService } from '@/services/evento.service';
import {
  Cliente,
  Duracion,
  EstadoEvento,
  EventoReservaDTO,
  Extra,
  TipoEvento,
} from '@/types/domain';

const STEPS = ['Tipo', 'Evento', 'Cotización', 'Catering', 'Contacto'];
const DURATIONS: { label: string; value: Duracion }[] = [
  { label: 'Corta', value: 'CORTA' },
  { label: 'Media', value: 'MEDIA' },
  { label: 'Larga', value: 'LARGA' },
  { label: 'Completa', value: 'COMPLETA' },
];
const EVENT_STATUSES: EstadoEvento[] = ['COTIZADO', 'RESERVADO', 'CONFIRMADO'];
const TIMES: SelectOption[] = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  const minute = index % 2 === 0 ? '00' : '30';
  return { label: `${hour}:${minute}`, value: `${hour}:${minute}` };
});

type ReservationValues = {
  duration: Duracion | '';
  tipoEventoId: number | '';
  capacidadAdultos: number;
  capacidadNinos: number;
  nombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  extrasFijos: number[];
  extrasVariables: Record<number, number>;
  cateringActivo: boolean;
  tiposCatering: number[];
  extrasCatering: number[];
  cateringOtro: string;
  cateringOtroDescripcion: string;
  cliente: Cliente;
  estado: EstadoEvento;
  anotaciones: string;
};

const initialValues: ReservationValues = {
  duration: DURATIONS[0].value,
  tipoEventoId: '',
  capacidadAdultos: 80,
  capacidadNinos: 0,
  nombre: '',
  fecha: '',
  horaInicio: '',
  horaFin: '',
  extrasFijos: [],
  extrasVariables: {},
  cateringActivo: false,
  tiposCatering: [],
  extrasCatering: [],
  cateringOtro: '',
  cateringOtroDescripcion: '',
  cliente: { nombre: '', apellido: '', celular: '', email: '' },
  estado: 'RESERVADO',
  anotaciones: '',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function makeDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStepErrors(values: ReservationValues, step: number): FormikErrors<ReservationValues> {
  const errors: FormikErrors<ReservationValues> = {};
  if (step === 0) {
    if (!values.duration) errors.duration = 'Seleccioná una duración.';
    if (values.tipoEventoId === '') errors.tipoEventoId = 'Seleccioná un tipo de evento.';
  }
  if (step === 1) {
    if (!values.nombre.trim()) errors.nombre = 'Ingresá el nombre del evento.';
    if (!values.fecha) errors.fecha = 'Seleccioná una fecha.';
    if (!values.horaInicio) errors.horaInicio = 'Seleccioná el horario de inicio.';
    if (!values.horaFin) errors.horaFin = 'Seleccioná el horario de finalización.';
  }
  if (step === 4) {
    if (!values.cliente.nombre.trim()) errors.cliente = { ...errors.cliente, nombre: 'Ingresá el nombre del cliente.' };
    if (!values.cliente.apellido.trim()) errors.cliente = { ...errors.cliente, apellido: 'Ingresá el apellido del cliente.' };
    if (!values.cliente.celular?.trim() && !values.cliente.email?.trim()) {
      errors.cliente = {
        ...errors.cliente,
        celular: 'Ingresá un teléfono o un email.',
        email: 'Ingresá un teléfono o un email.',
      };
    }
  }
  return errors;
}

export default function NuevaReservaScreen() {
  const { usuario } = useAuth();
  const [step, setStep] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [extrasFijos, setExtrasFijos] = useState<Extra[]>([]);
  const [extrasVariables, setExtrasVariables] = useState<Extra[]>([]);
  const [tiposCatering, setTiposCatering] = useState<Extra[]>([]);
  const [extrasCatering, setExtrasCatering] = useState<Extra[]>([]);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'busy' | 'error'>('idle');
  const [clientSearch, setClientSearch] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [savedId, setSavedId] = useState<number | null>(null);

  const formik = useFormik<ReservationValues>({
    initialValues,
    validate: (values) => getStepErrors(values, step),
    onSubmit: async (values) => {
      setSubmitError('');
      const selectedTipo = tiposEvento.find((tipo) => tipo.id === values.tipoEventoId);
      if (!selectedTipo || !usuario) {
        setSubmitError('No se pudo identificar el tipo de evento o la empresa.');
        return;
      }

      const inicio = makeDateTime(values.fecha, values.horaInicio);
      const start = new Date(inicio);
      const end = new Date(makeDateTime(values.fecha, values.horaFin));
      if (end <= start) end.setDate(end.getDate() + 1);

      const selectedExtras = [
        ...extrasFijos.filter((extra) => values.extrasFijos.includes(extra.id)),
        ...extrasVariables
          .filter((extra) => (values.extrasVariables[extra.id] ?? 0) > 0)
          .map((extra) => ({ ...extra, cantidad: values.extrasVariables[extra.id] })),
        ...(values.cateringActivo
          ? [
              ...tiposCatering
                .filter((extra) => values.tiposCatering.includes(extra.id))
                .map((extra) => ({
                  ...extra,
                  cantidad: values.capacidadAdultos + values.capacidadNinos,
                })),
              ...extrasCatering.filter((extra) => values.extrasCatering.includes(extra.id)),
            ]
          : []),
      ];

      const payload: EventoReservaDTO = {
        id: 0,
        nombre: values.nombre.trim(),
        capacidadAdultos: values.capacidadAdultos,
        capacidadNinos: values.capacidadNinos,
        codigo: '',
        inicio,
        fin: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T${values.horaFin}:00`,
        tipoEventoId: selectedTipo.id,
        empresaId: usuario.empresaId,
        extraOtro: 0,
        precioTipoEvento: selectedTipo.precioBase,
        listaExtra: selectedExtras,
        cateringOtro: values.cateringActivo ? Number(values.cateringOtro || 0) : 0,
        cateringOtroDescripcion: values.cateringActivo ? values.cateringOtroDescripcion.trim() : undefined,
        cliente: {
          ...values.cliente,
          nombre: values.cliente.nombre.trim(),
          apellido: values.cliente.apellido.trim(),
        },
        encargadoId: usuario.id,
        estado: values.estado,
        anotaciones: values.anotaciones.trim() || undefined,
      };

      try {
        const response = await eventoService.save(payload);
        setSavedId(response.data);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar la reserva.');
      }
    },
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      empresaService.getTiposEvento(),
      empresaService.getExtrasFijos(),
      empresaService.getExtrasVariables(),
      empresaService.getTiposCatering(),
      empresaService.getExtrasCatering(),
    ])
      .then(([tipos, fijos, variables, catering, extras]) => {
        if (!active) return;
        setTiposEvento(tipos);
        const firstDuration = DURATIONS.find((duration) => tipos.some((tipo) => tipo.duracion === duration.value));
        const selectedDuration = firstDuration?.value ?? DURATIONS[0].value;
        const firstTipo = tipos.find((tipo) => tipo.duracion === selectedDuration);
        void formik.setFieldValue('duration', selectedDuration, false);
        if (firstTipo) void formik.setFieldValue('tipoEventoId', firstTipo.id, false);
        setExtrasFijos(fijos);
        setExtrasVariables(variables);
        setTiposCatering(catering);
        setExtrasCatering(extras);
      })
      .catch(() => {
        if (active) setCatalogError('No se pudieron cargar las opciones de reserva.');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const { fecha, horaInicio, horaFin } = formik.values;
    if (!fecha || !horaInicio || !horaFin) {
      setAvailability('idle');
      return () => {
        active = false;
      };
    }

    const desde = new Date(makeDateTime(fecha, horaInicio));
    const hasta = new Date(makeDateTime(fecha, horaFin));
    if (hasta <= desde) hasta.setDate(hasta.getDate() + 1);
    const hastaDateTime = `${hasta.getFullYear()}-${String(hasta.getMonth() + 1).padStart(2, '0')}-${String(hasta.getDate()).padStart(2, '0')}T${horaFin}:00`;
    setAvailability('checking');
    eventoService
      .getHorarioDisponible(makeDateTime(fecha, horaInicio), hastaDateTime)
      .then((available) => {
        if (active) setAvailability(available ? 'available' : 'busy');
      })
      .catch(() => {
        if (active) setAvailability('error');
      });

    return () => {
      active = false;
    };
  }, [formik.values.fecha, formik.values.horaInicio, formik.values.horaFin]);

  const selectedTipo = tiposEvento.find((tipo) => tipo.id === formik.values.tipoEventoId);
  const eventTypesByDuration = useMemo(
    () => tiposEvento.filter((tipo) => !formik.values.duration || tipo.duracion === formik.values.duration),
    [tiposEvento, formik.values.duration],
  );
  const guestCount = formik.values.capacidadAdultos + formik.values.capacidadNinos;
  const budget = useMemo(() => {
    const fixedTotal = extrasFijos
      .filter((extra) => formik.values.extrasFijos.includes(extra.id))
      .reduce((sum, extra) => sum + extra.precio * extra.cantidad, 0);
    const variableTotal = extrasVariables.reduce(
      (sum, extra) => sum + extra.precio * (formik.values.extrasVariables[extra.id] ?? 0),
      0,
    );
    const cateringTotal = formik.values.cateringActivo
      ? tiposCatering
          .filter((extra) => formik.values.tiposCatering.includes(extra.id))
          .reduce((sum, extra) => sum + extra.precio * guestCount, 0) +
        extrasCatering
          .filter((extra) => formik.values.extrasCatering.includes(extra.id))
          .reduce((sum, extra) => sum + extra.precio * extra.cantidad, 0) +
        Number(formik.values.cateringOtro || 0) * guestCount
      : 0;
    return (selectedTipo?.precioBase ?? 0) + fixedTotal + variableTotal + cateringTotal;
  }, [
    extrasCatering,
    extrasFijos,
    extrasVariables,
    formik.values.cateringActivo,
    formik.values.cateringOtro,
    formik.values.extrasCatering,
    formik.values.extrasFijos,
    formik.values.extrasVariables,
    formik.values.tiposCatering,
    guestCount,
    selectedTipo?.precioBase,
    tiposCatering,
  ]);

  const searchClient = async () => {
    const { celular, email } = formik.values.cliente;
    const queryPhone = celular?.trim();
    const queryEmail = email?.trim();
    if (!queryPhone && !queryEmail) {
      setClientSearch('not-found');
      return;
    }
    setClientSearch('loading');
    try {
      const client = queryPhone
        ? await authService.buscarClientePorCelular(queryPhone)
        : await authService.buscarClientePorEmail(queryEmail!);
      if (client) {
        formik.setFieldValue('cliente', {
          ...formik.values.cliente,
          ...client,
          celular: client.celular || queryPhone || '',
          email: client.email || queryEmail || '',
        });
        setClientSearch('found');
      } else {
        setClientSearch('not-found');
      }
    } catch {
      setClientSearch('error');
    }
  };

  const toggleId = (field: 'extrasFijos' | 'tiposCatering' | 'extrasCatering', id: number) => {
    const current = formik.values[field];
    void formik.setFieldValue(field, current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const markInvalidFields = async () => {
    const errors = getStepErrors(formik.values, step);
    if (!Object.keys(errors).length) return false;
    const touched = Object.keys(errors).reduce<Record<string, boolean>>((result, key) => {
      result[key] = true;
      return result;
    }, {});
    formik.setErrors(errors);
    await formik.setTouched(touched, false);
    return true;
  };

  const goNext = async () => {
    if (await markInvalidFields()) return;
    if (step === 1 && (availability === 'checking' || availability === 'busy')) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const submitReservation = async () => {
    if (await markInvalidFields()) return;
    void formik.submitForm();
  };
  const stepHasErrors = Object.keys(getStepErrors(formik.values, step)).length > 0;
  const actionFeedbackDisabled = stepHasErrors || catalogLoading || !!catalogError || (step === 1 && (availability === 'busy' || availability === 'checking'));

  const dateLabel = formik.values.fecha
    ? new Date(`${formik.values.fecha}T12:00:00`).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Elegir fecha';

  if (savedId !== null) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}><Check color={Colors.white} size={30} strokeWidth={3} /></View>
        <Text style={styles.successTitle}>Reserva creada</Text>
        <Text style={styles.successText}>La reserva quedó registrada correctamente.</Text>
        <Text style={styles.successCode}>N.º {savedId}</Text>
        <Button label="Crear otra reserva" onPress={() => {
          setSavedId(null);
          setStep(0);
          formik.resetForm();
        }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[globalStyles.screenContent, styles.content]}
        keyboardShouldPersistTaps="handled"
      >
        <Card radius="panel" shadow="soft" style={styles.heading}>
          <View style={styles.headingText}>
            <Text style={styles.title}>Nueva reserva</Text>
            <Text style={styles.subtitle}>Armá tu próximo evento</Text>
          </View>
          <View style={styles.budgetBadge}>
            <Text style={styles.budgetLabel}>PRESUPUESTO</Text>
            <Text style={styles.budgetValue}>{formatCurrency(budget)}</Text>
          </View>
        </Card>

        <View style={styles.stepper}>
          {STEPS.map((label, index) => (
            <React.Fragment key={label}>
              <Pressable onPress={() => index < step && setStep(index)} style={styles.stepItem}>
                <View style={[styles.stepDot, index === step && styles.stepDotCurrent, index < step && styles.stepDotDone]}>
                  {index < step ? <Check size={14} color={Colors.white} strokeWidth={3} /> : <Text style={[styles.stepNumber, index === step && styles.stepNumberCurrent]}>{index + 1}</Text>}
                </View>
                <Text style={[styles.stepLabel, index === step && styles.stepLabelCurrent]}>{label}</Text>
              </Pressable>
              {index < STEPS.length - 1 && <View style={[styles.stepLine, index < step && styles.stepLineDone]} />}
            </React.Fragment>
          ))}
        </View>

        <Card radius="panel" shadow="soft" style={styles.formSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>PASO 0{step + 1}</Text>
            <Text style={styles.sectionTitle}>{[
              'Tipo de evento',
              'Datos del evento',
              'Cotización',
              'Catering',
              'Contacto y estado',
            ][step]}</Text>
          </View>

          {catalogLoading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : catalogError ? (
            <Text style={styles.inlineError}>{catalogError}</Text>
          ) : (
            <>
              {step === 0 && (
                <>
                  <Select
                    label="Duración del evento"
                    value={formik.values.duration}
                    options={DURATIONS}
                    error={!!formik.errors.duration && !!formik.touched.duration}
                    onChange={(value) => {
                      const duration = value as Duracion;
                      void formik.setFieldValue('duration', duration);
                      const firstTipo = tiposEvento.find((tipo) => tipo.duracion === duration);
                      void formik.setFieldValue('tipoEventoId', firstTipo?.id ?? '');
                    }}
                    placeholder="Seleccionar duración"
                  />
                  <Select
                    label="Tipo de evento"
                    value={formik.values.tipoEventoId}
                    options={eventTypesByDuration.map((tipo) => ({ label: tipo.nombre, value: tipo.id }))}
                    error={!!formik.errors.tipoEventoId && !!formik.touched.tipoEventoId}
                    onChange={(value) => void formik.setFieldValue('tipoEventoId', Number(value))}
                    placeholder="Seleccionar tipo"
                  />
                  <View style={styles.capacityRow}>
                    <Stepper label="Adultos" value={formik.values.capacidadAdultos} onChange={(value) => void formik.setFieldValue('capacidadAdultos', value)} min={1} max={1000} step={5} />
                    <Stepper label="Niños" value={formik.values.capacidadNinos} onChange={(value) => void formik.setFieldValue('capacidadNinos', value)} min={0} max={1000} step={5} />
                  </View>
                  <View style={styles.capacitySummary}>
                    <Text style={styles.capacitySummaryLabel}>Capacidad total</Text>
                    <Text style={styles.capacitySummaryValue}>{guestCount} personas</Text>
                  </View>
                  {(formik.errors.duration || formik.errors.tipoEventoId) && (
                    <Text style={styles.inlineError}>{formik.errors.duration || formik.errors.tipoEventoId}</Text>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <Input
                    label="Nombre del evento"
                    value={formik.values.nombre}
                    onChangeText={(value) => void formik.setFieldValue('nombre', value)}
                    placeholder="Ej. Cumpleaños de Martina"
                    error={formik.errors.nombre}
                    touched={!!formik.touched.nombre}
                  />
                  <Text style={styles.fieldLabel}>Fecha del evento</Text>
                  <Pressable
                    style={[styles.dateButton, formik.touched.fecha && formik.errors.fecha && styles.dateButtonError]}
                    onPress={() => setDatePickerOpen(true)}
                  >
                    <CalendarDays size={18} color={Colors.primary} />
                    <Text style={[styles.dateText, !formik.values.fecha && styles.datePlaceholder]}>{dateLabel}</Text>
                    <Text style={styles.dateChange}>Cambiar</Text>
                  </Pressable>
                  {formik.touched.fecha && formik.errors.fecha && <Text style={styles.fieldError}>{formik.errors.fecha}</Text>}
                  <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                        <Select label="Desde" value={formik.values.horaInicio} options={TIMES} error={!!formik.errors.horaInicio && !!formik.touched.horaInicio} onChange={(value) => void formik.setFieldValue('horaInicio', value)} placeholder="Hora" />
                    </View>
                    <View style={styles.timeField}>
                        <Select label="Hasta" value={formik.values.horaFin} options={TIMES} error={!!formik.errors.horaFin && !!formik.touched.horaFin} onChange={(value) => void formik.setFieldValue('horaFin', value)} placeholder="Hora" />
                    </View>
                  </View>
                  {availability !== 'idle' && (
                    <View style={[styles.availability, availability === 'available' && styles.availabilityGood, availability === 'busy' && styles.availabilityBad]}>
                      {availability === 'checking' ? <ActivityIndicator size="small" color={Colors.text} /> : availability === 'available' ? <CircleCheck size={18} color={Colors.success} /> : availability === 'busy' ? <CircleX size={18} color={Colors.danger} /> : <CircleX size={18} color={Colors.warning} />}
                      <Text style={styles.availabilityText}>
                        {availability === 'checking' ? 'Verificando disponibilidad…' : availability === 'available' ? 'Horario disponible' : availability === 'busy' ? 'El horario se superpone con otro evento' : 'No se pudo verificar el horario'}
                      </Text>
                    </View>
                  )}
                  {(formik.touched.horaInicio && formik.errors.horaInicio || formik.touched.horaFin && formik.errors.horaFin) && (
                    <Text style={styles.inlineError}>{formik.errors.horaInicio || formik.errors.horaFin}</Text>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.helperText}>Sumá servicios y extras para personalizar la propuesta.</Text>
                  {selectedTipo && <PriceRow label={`Base · ${selectedTipo.nombre}`} price={selectedTipo.precioBase} prominent />}
                  <Text style={styles.groupLabel}>EXTRAS FIJOS</Text>
                  {extrasFijos.filter((extra) => !selectedTipo || extra.listaTipoEventoId.length === 0 || extra.listaTipoEventoId.includes(selectedTipo.id)).map((extra) => (
                    <Checkbox
                      key={extra.id}
                      label={extra.nombre}
                      checked={formik.values.extrasFijos.includes(extra.id)}
                      onChange={() => toggleId('extrasFijos', extra.id)}
                      rightText={formatCurrency(extra.precio * extra.cantidad)}
                    />
                  ))}
                  <Text style={styles.groupLabel}>EXTRAS VARIABLES</Text>
                  {extrasVariables.map((extra) => {
                    const quantity = formik.values.extrasVariables[extra.id] ?? 0;
                    return (
                      <View key={extra.id} style={styles.variableRow}>
                        <View style={styles.variableDescription}>
                          <Text style={styles.extraName}>{extra.nombre}</Text>
                          <Text style={styles.extraPrice}>{formatCurrency(extra.precio)} por unidad</Text>
                        </View>
                        <Stepper label="" value={quantity} onChange={(value) => void formik.setFieldValue(`extrasVariables.${extra.id}`, value)} min={0} max={500} />
                      </View>
                    );
                  })}
                  <PriceRow label="Presupuesto actualizado" price={budget} prominent />
                </>
              )}

              {step === 3 && (
                <>
                  <Checkbox
                    label="Agregar servicio de catering"
                    description="Los menús se calculan por persona."
                    checked={formik.values.cateringActivo}
                    onChange={(checked) => void formik.setFieldValue('cateringActivo', checked)}
                  />
                  {formik.values.cateringActivo && (
                    <>
                      <Text style={styles.groupLabel}>MENÚS</Text>
                      {tiposCatering.filter((extra) => !selectedTipo || extra.listaTipoEventoId.length === 0 || extra.listaTipoEventoId.includes(selectedTipo.id)).map((extra) => (
                        <Checkbox
                          key={extra.id}
                          label={extra.nombre}
                          description={`${formatCurrency(extra.precio)} por persona`}
                          checked={formik.values.tiposCatering.includes(extra.id)}
                          onChange={() => toggleId('tiposCatering', extra.id)}
                          rightText={formatCurrency(extra.precio * guestCount)}
                        />
                      ))}
                      <Text style={styles.groupLabel}>EXTRAS GASTRONÓMICOS</Text>
                      {extrasCatering.map((extra) => (
                        <Checkbox
                          key={extra.id}
                          label={extra.nombre}
                          checked={formik.values.extrasCatering.includes(extra.id)}
                          onChange={() => toggleId('extrasCatering', extra.id)}
                          rightText={formatCurrency(extra.precio * extra.cantidad)}
                        />
                      ))}
                      <Text style={styles.groupLabel}>OTRO CATERING</Text>
                      <Input
                        label="Precio por plato"
                        value={formik.values.cateringOtro}
                        onChangeText={(value) => void formik.setFieldValue('cateringOtro', value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                        placeholder="0"
                        keyboardType="numeric"
                        prefix={<Text style={styles.currencyPrefix}>$</Text>}
                      />
                      {Number(formik.values.cateringOtro) > 0 && (
                        <Input
                          label="Descripción del plato"
                          value={formik.values.cateringOtroDescripcion}
                          onChangeText={(value) => void formik.setFieldValue('cateringOtroDescripcion', value)}
                          placeholder="Ej. Menú vegetariano"
                        />
                      )}
                      <Text style={styles.guestCalculation}>{guestCount} personas × {formatCurrency(Number(formik.values.cateringOtro || 0))} por plato</Text>
                    </>
                  )}
                  <PriceRow label="Presupuesto actualizado" price={budget} prominent />
                </>
              )}

              {step === 4 && (
                <>
                  <Text style={styles.helperText}>Buscá por teléfono o email para completar los datos del cliente.</Text>
                  <Input
                    label="Teléfono"
                    value={formik.values.cliente.celular ?? ''}
                    onChangeText={(value) => {
                      void formik.setFieldValue('cliente.celular', value);
                      setClientSearch('idle');
                    }}
                    placeholder="11 5555 1111"
                    keyboardType="phone-pad"
                    error={formik.errors.cliente && typeof formik.errors.cliente !== 'string' ? formik.errors.cliente.celular : undefined}
                    touched={!!formik.touched.cliente}
                  />
                  <Input
                    label="Email"
                    value={formik.values.cliente.email ?? ''}
                    onChangeText={(value) => {
                      void formik.setFieldValue('cliente.email', value);
                      setClientSearch('idle');
                    }}
                    placeholder="cliente@correo.com"
                    keyboardType="email-address"
                    error={formik.errors.cliente && typeof formik.errors.cliente !== 'string' ? formik.errors.cliente.email : undefined}
                    touched={!!formik.touched.cliente}
                  />
                  <Button
                    label="Buscar cliente"
                    variant="outline"
                    onPress={searchClient}
                    loading={clientSearch === 'loading'}
                    icon={<Search size={17} color={Colors.primary} />}
                    style={styles.searchButton}
                  />
                  {clientSearch !== 'idle' && clientSearch !== 'loading' && (
                    <Text style={[styles.searchResult, clientSearch === 'found' ? styles.searchFound : styles.searchNotFound]}>
                      {clientSearch === 'found' ? 'Cliente encontrado. Completamos sus datos.' : clientSearch === 'not-found' ? 'No encontramos un cliente con esos datos. Podés continuar manualmente.' : 'No se pudo realizar la búsqueda.'}
                    </Text>
                  )}
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <Input label="Nombre" value={formik.values.cliente.nombre} onChangeText={(value) => void formik.setFieldValue('cliente.nombre', value)} placeholder="Nombre" error={formik.errors.cliente && typeof formik.errors.cliente !== 'string' ? formik.errors.cliente.nombre : undefined} touched={!!formik.touched.cliente} />
                    </View>
                    <View style={styles.nameField}>
                      <Input label="Apellido" value={formik.values.cliente.apellido} onChangeText={(value) => void formik.setFieldValue('cliente.apellido', value)} placeholder="Apellido" error={formik.errors.cliente && typeof formik.errors.cliente !== 'string' ? formik.errors.cliente.apellido : undefined} touched={!!formik.touched.cliente} />
                    </View>
                  </View>
                  <Select
                    label="Estado de la reserva"
                    value={formik.values.estado}
                    options={EVENT_STATUSES.map((estado) => ({ label: estado, value: estado }))}
                    onChange={(value) => void formik.setFieldValue('estado', value)}
                  />
                  <Input
                    label="Anotaciones"
                    value={formik.values.anotaciones}
                    onChangeText={(value) => void formik.setFieldValue('anotaciones', value)}
                    placeholder="Preferencias, pedidos especiales…"
                    multiline
                    numberOfLines={4}
                    style={styles.notesInput}
                  />
                  <View style={styles.reviewLine}><Text style={styles.reviewLabel}>Evento</Text><Text style={styles.reviewValue}>{formik.values.nombre || 'Sin nombre'}</Text></View>
                  <View style={styles.reviewLine}><Text style={styles.reviewLabel}>Invitados</Text><Text style={styles.reviewValue}>{guestCount}</Text></View>
                  <View style={styles.reviewLine}><Text style={styles.reviewLabel}>Presupuesto estimado</Text><Text style={styles.reviewBudget}>{formatCurrency(budget)}</Text></View>
                  {!!submitError && <Text style={styles.inlineError}>{submitError}</Text>}
                </>
              )}
            </>
          )}
        </Card>

        <View style={styles.footer}>
          {step > 0 ? (
            <Button label="Anterior" variant="ghost" onPress={() => setStep((current) => current - 1)} icon={<ArrowLeft size={17} color={Colors.primary} />} />
          ) : <View />}
          {step < STEPS.length - 1 ? (
            <Button
              label="Continuar"
              onPress={goNext}
              disabled={catalogLoading || !!catalogError}
              feedbackDisabled={actionFeedbackDisabled}
              icon={<ArrowRight size={17} color={actionFeedbackDisabled ? Colors.disabledText : Colors.white} />}
            />
          ) : (
            <Button
              label="Crear reserva"
              onPress={() => void submitReservation()}
              loading={formik.isSubmitting}
              feedbackDisabled={stepHasErrors}
              icon={<Check size={17} color={stepHasErrors ? Colors.disabledText : Colors.white} />}
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={datePickerOpen} transparent animationType="slide" onRequestClose={() => setDatePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDatePickerOpen(false)}>
          <Pressable style={styles.dateSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.dateSheetHeader}>
              <Text style={styles.dateSheetTitle}>Fecha del evento</Text>
              <Pressable onPress={() => setDatePickerOpen(false)}><Text style={styles.dateDone}>Listo</Text></Pressable>
            </View>
            <Calendar
              minDate={localDateKey(new Date())}
              markedDates={formik.values.fecha ? { [formik.values.fecha]: { selected: true, selectedColor: Colors.primary } } : {}}
              onDayPress={(date: DateData) => {
                void formik.setFieldValue('fecha', date.dateString);
                setDatePickerOpen(false);
              }}
              theme={{
                backgroundColor: Colors.white,
                calendarBackground: Colors.white,
                textSectionTitleColor: Colors.text,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.textDark,
                textDisabledColor: Colors.disabledText,
                monthTextColor: Colors.textDark,
                arrowColor: Colors.primary,
                textMonthFontFamily: 'Inter-SemiBold',
                textDayHeaderFontFamily: 'Inter-Medium',
                textDayFontFamily: 'Inter-Regular',
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PriceRow({ label, price, prominent = false }: { label: string; price: number; prominent?: boolean }) {
  return (
    <View style={[styles.priceRow, prominent && styles.priceRowProminent]}>
      <Text style={[styles.priceLabel, prominent && styles.priceLabelProminent]}>{label}</Text>
      <Text style={[styles.priceValue, prominent && styles.priceValueProminent]}>{formatCurrency(price)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.neutralBg },
  content: { paddingTop: 22, backgroundColor: Colors.neutralBg },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
    padding: 16,
  },
  headingText: { flex: 1 },
  title: { fontFamily: 'Inter-Bold', fontSize: 23, color: Colors.textDark },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.text, marginTop: 4 },
  budgetBadge: { backgroundColor: Colors.textDark, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11, minWidth: 118 },
  budgetLabel: { color: '#b7d8d1', fontFamily: 'Inter-SemiBold', fontSize: 9, letterSpacing: 0 },
  budgetValue: { color: Colors.white, fontFamily: 'Inter-Bold', fontSize: 14, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepItem: { alignItems: 'center', width: 52 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e1e5e3', alignItems: 'center', justifyContent: 'center' },
  stepDotCurrent: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.success },
  stepNumber: { color: Colors.neutralText, fontFamily: 'Inter-SemiBold', fontSize: 12 },
  stepNumberCurrent: { color: Colors.white },
  stepLabel: { color: Colors.text, fontFamily: 'Inter-Medium', fontSize: 10, marginTop: 5 },
  stepLabelCurrent: { color: Colors.textDark, fontFamily: 'Inter-Bold' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#dce2df', marginHorizontal: 2, marginBottom: 17 },
  stepLineDone: { backgroundColor: Colors.success },
  formSection: { padding: 18 },
  sectionHeading: { marginBottom: 18 },
  sectionEyebrow: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.primary },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 19, color: Colors.textDark, marginTop: 4 },
  loader: { paddingVertical: 36 },
  capacityRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  capacitySummary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f1f5f3', borderRadius: 6, padding: 12, marginTop: 16 },
  capacitySummaryLabel: { color: Colors.text, fontFamily: 'Inter-Medium', fontSize: 13 },
  capacitySummaryValue: { color: Colors.textDark, fontFamily: 'Inter-Bold', fontSize: 13 },
  fieldLabel: { color: Colors.textSoft, fontFamily: 'Inter-SemiBold', fontSize: 13, marginBottom: 6 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.neutralBorder, borderRadius: Radius.input, minHeight: 48, paddingHorizontal: 12, marginBottom: 12 },
  dateButtonError: { borderColor: Colors.danger },
  dateText: { flex: 1, color: Colors.textDark, fontFamily: 'Inter-Medium', fontSize: 13, textTransform: 'capitalize' },
  datePlaceholder: { color: Colors.disabledText },
  dateChange: { color: Colors.primary, fontFamily: 'Inter-SemiBold', fontSize: 12 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 6, backgroundColor: '#f4f5f4', marginTop: 2, marginBottom: 12 },
  availabilityGood: { backgroundColor: '#e9f5ef' },
  availabilityBad: { backgroundColor: '#fff0f0' },
  availabilityText: { color: Colors.textDark, fontFamily: 'Inter-Medium', fontSize: 12, flex: 1 },
  helperText: { color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  groupLabel: { color: Colors.textSoft, fontFamily: 'Inter-Bold', fontSize: 10, marginTop: 20, marginBottom: 9 },
  variableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#edf0ee' },
  variableDescription: { flex: 1 },
  extraName: { color: Colors.textDark, fontFamily: 'Inter-Medium', fontSize: 13 },
  extraPrice: { color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 11, marginTop: 3 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderColor: '#edf0ee' },
  priceRowProminent: { borderBottomWidth: 0, borderTopWidth: 1, marginTop: 12, paddingVertical: 14, borderColor: Colors.neutralBorder },
  priceLabel: { color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 13, flex: 1 },
  priceLabelProminent: { color: Colors.textDark, fontFamily: 'Inter-SemiBold' },
  priceValue: { color: Colors.textDark, fontFamily: 'Inter-Medium', fontSize: 13 },
  priceValueProminent: { color: Colors.primary, fontFamily: 'Inter-Bold', fontSize: 16 },
  currencyPrefix: { color: Colors.text, fontFamily: 'Inter-SemiBold' },
  guestCalculation: { color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 11, marginTop: -4 },
  searchButton: { marginTop: 2, marginBottom: 12 },
  searchResult: { fontFamily: 'Inter-Medium', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  searchFound: { color: Colors.success },
  searchNotFound: { color: Colors.text },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
  notesInput: { minHeight: 96, alignItems: 'flex-start' },
  reviewLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderColor: '#edf0ee', paddingVertical: 10 },
  reviewLabel: { color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 12 },
  reviewValue: { color: Colors.textDark, fontFamily: 'Inter-SemiBold', fontSize: 12, flexShrink: 1, textAlign: 'right' },
  reviewBudget: { color: Colors.primary, fontFamily: 'Inter-Bold', fontSize: 13 },
  inlineError: { color: Colors.danger, fontFamily: 'Inter-Medium', fontSize: 12, marginTop: 6 },
  fieldError: { color: Colors.danger, fontFamily: 'Inter-Regular', fontSize: 11, marginTop: -7, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  dateSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingBottom: 24, paddingHorizontal: 10 },
  dateSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderColor: Colors.neutralBorder },
  dateSheetTitle: { color: Colors.textDark, fontFamily: 'Inter-Bold', fontSize: 16 },
  dateDone: { color: Colors.primary, fontFamily: 'Inter-Bold', fontSize: 14, padding: 4 },
  successScreen: { flex: 1, backgroundColor: Colors.tertiary, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successTitle: { color: Colors.textDark, fontFamily: 'Inter-Bold', fontSize: 23 },
  successText: { color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 14, marginTop: 8, textAlign: 'center' },
  successCode: { color: Colors.primary, fontFamily: 'Inter-Bold', fontSize: 15, marginTop: 16, marginBottom: 22 },
});