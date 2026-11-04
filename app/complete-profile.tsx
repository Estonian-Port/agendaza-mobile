import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import Markdown from 'react-native-markdown-display';
import { useRouter } from 'expo-router';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyboardScrollProvider } from '@/components/ui/KeyboardScrollContext';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { onboardingService, type PerfilOnboarding, type TerminosVigentes } from '@/services/onboarding.service';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error';
type FormField = 'nombre' | 'apellido' | 'celular' | 'fechaNacimiento' | 'username' | 'email' | 'password' | 'confirmPassword';
type DatePickerMode = 'days' | 'years' | 'decades' | 'months';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error.response;
    if (response && typeof response === 'object' && 'data' in response) {
      const data = response.data;
      if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
        return data.message;
      }
    }
  }
  return error instanceof Error ? error.message : fallback;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function displayDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const usernameCheckId = useRef(0);
  const savingRef = useRef(false);
  const { usuario, token, requiresOnboarding, completeOnboarding } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = Number(today.slice(0, 4));

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [terms, setTerms] = useState<TerminosVigentes | null>(null);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsError, setTermsError] = useState('');
  const [termsVisible, setTermsVisible] = useState(false);
  const [dateVisible, setDateVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<DatePickerMode>('days');
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const [pickerDecade, setPickerDecade] = useState(Math.floor(currentYear / 10) * 10);
  const [decadePageStart, setDecadePageStart] = useState(Math.floor(currentYear / 100) * 100);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [values, setValues] = useState({
    nombre: '', apellido: '', celular: '', fechaNacimiento: '', username: '', email: '', password: '', confirmPassword: '',
  });
  const [usernameEnabled, setUsernameEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({});

  useEffect(() => {
    if (!token) router.replace('/login');
    else if (!requiresOnboarding) router.replace('/');
  }, [requiresOnboarding, router, token]);

  const loadTerms = useCallback(async () => {
    try {
      setTerms(await onboardingService.getCurrentTerms());
    } catch (error) {
      setTerms(null);
      setTermsError(errorMessage(error, 'No se pudieron cargar los términos vigentes.'));
    } finally {
      setTermsLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
  const profile: PerfilOnboarding = await onboardingService.getProfile();
  setProfileUserId(typeof profile.id === 'number' ? profile.id : null);
  const currentUsername = profile.username ?? '';
  const currentEmail = profile.email?.trim() ?? '';
  const currentCelular = profile.celular === undefined ? '' : String(profile.celular);

  const usernameIsEmail = isEmail(currentUsername);
  const emailIsMissing = !currentEmail || currentEmail.toLowerCase().startsWith('sin-email-');
  const celularIsPlaceholder = currentCelular.startsWith('999');

  setUsernameEnabled(usernameIsEmail);
  setEmailEnabled(emailIsMissing);

  setValues((current) => ({
    ...current,
    nombre: profile.nombre ?? '',
    apellido: profile.apellido ?? '',
    celular: celularIsPlaceholder ? '' : currentCelular,
    fechaNacimiento: profile.fechaNacimiento ?? '',
    username: usernameIsEmail ? '' : currentUsername,
    email: emailIsMissing ? '' : currentEmail,
    }));
    } catch (error) {
      setProfileError(errorMessage(error, 'No se pudo cargar tu perfil.'));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = setTimeout(() => {
      void loadTerms();
      void loadProfile();
    }, 0);
    return () => clearTimeout(request);
  }, [loadProfile, loadTerms]);

  const update = (field: FormField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === 'username') {
      usernameCheckId.current += 1;
      setAvailability('idle');
    }
    setSaveError('');
  };

  const validateUsername = async () => {
    setTouched((current) => ({ ...current, username: true }));
    const username = values.username.trim();
    if (!usernameEnabled || username.length < 3) {
      setAvailability('idle');
      return;
    }
    const checkId = ++usernameCheckId.current;
    setAvailability('checking');
    try {
      const available = await onboardingService.checkUsername(username);
      if (usernameCheckId.current === checkId) setAvailability(available ? 'available' : 'taken');
    } catch {
      if (usernameCheckId.current === checkId) setAvailability('error');
    }
  };

  const errors = useMemo(() => ({
    nombre: !values.nombre.trim() ? 'El nombre es obligatorio.' : '',
    apellido: !values.apellido.trim() ? 'El apellido es obligatorio.' : '',
    celular: !values.celular.trim() ? 'El celular es obligatorio.' : '',
    fechaNacimiento: !values.fechaNacimiento ? 'La fecha de nacimiento es obligatoria.' : '',
    username: usernameEnabled && values.username.trim().length < 3 ? 'Debe tener al menos 3 caracteres.' : '',
    email: values.email && !isEmail(values.email) ? 'Ingresá un email válido.' : '',
    password: !values.password
      ? 'La contraseña es obligatoria.'
      : values.password.length < 8
        ? 'Debe tener al menos 8 caracteres.'
        : !/[A-Z]/.test(values.password) || !/[0-9]/.test(values.password)
          ? 'Incluí al menos una mayúscula y un número.'
          : '',
    confirmPassword: !values.confirmPassword
      ? 'Confirmá tu contraseña.'
      : values.password !== values.confirmPassword
        ? 'Las contraseñas no coinciden.'
        : '',
  }), [values, usernameEnabled]);

  const formValid = useMemo(() => {
    const requiredValid = !errors.nombre && !errors.apellido && !errors.celular && !errors.fechaNacimiento
      && !errors.password && !errors.confirmPassword && !errors.email;
    const usernameValid = !usernameEnabled || (!errors.username && availability === 'available');
    return requiredValid && usernameValid && !!terms && acceptedTerms && !profileLoading && !saving;
  }, [acceptedTerms, availability, errors, profileLoading, saving, terms, usernameEnabled]);

  const handleSave = async () => {
    if (!formValid || !terms || savingRef.current) return;
    const usuarioId = profileUserId ?? usuario?.id;
    if (!usuarioId) {
      setSaveError('No se pudo identificar tu usuario. Volvé a cargar tu perfil e intentá nuevamente.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      await onboardingService.completeProfile({
        nombre: values.nombre.trim(),
        apellido: values.apellido.trim(),
        celular: values.celular.trim(),
        fechaNacimiento: values.fechaNacimiento,
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        aceptoTerminos: true,
        versionTerminos: terms.version,
      });
      const destination = await completeOnboarding({
        nombre: values.nombre.trim(),
        apellido: values.apellido.trim(),
        celular: values.celular.trim(),
        username: values.username.trim() || usuario?.username,
        email: values.email.trim() || usuario?.email,
      }, usuarioId);
      router.replace(destination === 'multiple' ? '/seleccionar-agenda' : '/');
    } catch (error) {
      setSaveError(errorMessage(error, 'No se pudo guardar el perfil. Intentá nuevamente.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!token) return null;
  if (!requiresOnboarding) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <KeyboardScrollProvider scrollRef={scrollRef}>
            <View style={styles.heading}>
              <Text style={styles.title}>Completa tu perfil</Text>
              <Text style={styles.subtitle}>Necesitamos actualizar algunos datos para que puedas continuar.</Text>
            </View>

            {profileError ? (
              <View style={styles.noticeError}>
                <Text style={styles.errorText}>{profileError}</Text>
                <Button label="Reintentar" variant="ghost" onPress={() => {
                  setProfileLoading(true);
                  setProfileError('');
                  void loadProfile();
                }} />
              </View>
            ) : null}

            <View style={styles.form}>
              <Input label="Nombre" value={values.nombre} onChangeText={(value) => update('nombre', value)} error={errors.nombre} touched={!!touched.nombre} onBlur={() => setTouched((current) => ({ ...current, nombre: true }))} editable={!profileLoading && !saving} />
              <Input label="Apellido" value={values.apellido} onChangeText={(value) => update('apellido', value)} error={errors.apellido} touched={!!touched.apellido} onBlur={() => setTouched((current) => ({ ...current, apellido: true }))} editable={!profileLoading && !saving} />
              <Input label="Celular" value={values.celular} onChangeText={(value) => update('celular', value)} keyboardType="phone-pad" error={errors.celular} touched={!!touched.celular} onBlur={() => setTouched((current) => ({ ...current, celular: true }))} editable={!profileLoading && !saving} />
              <View style={styles.field}>
                <Text style={styles.label}>Fecha de nacimiento</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={values.fechaNacimiento ? `Fecha de nacimiento, ${displayDate(values.fechaNacimiento)}` : 'Seleccionar fecha de nacimiento'}
                  accessibilityState={{ disabled: profileLoading || saving }}
                  disabled={profileLoading || saving}
                  onPress={() => {
                    const startingDate = values.fechaNacimiento || today;
                    const startingYear = Number(startingDate.slice(0, 4));
                    setCalendarMonth(startingDate);
                    setPickerYear(startingYear);
                    setPickerDecade(Math.floor(startingYear / 10) * 10);
                    setDecadePageStart(Math.floor(startingYear / 100) * 100);
                    setDatePickerMode('days');
                    setDateVisible(true);
                  }}
                  style={[styles.dateButton, touched.fechaNacimiento && errors.fechaNacimiento ? styles.inputError : null]}
                >
                  <Text style={[styles.dateText, !values.fechaNacimiento && styles.placeholder]}>
                    {values.fechaNacimiento ? displayDate(values.fechaNacimiento) : 'Seleccioná una fecha'}
                  </Text>
                  <ChevronDown size={18} color={Colors.text} />
                </Pressable>
                {!!touched.fechaNacimiento && !!errors.fechaNacimiento && <Text style={styles.fieldError}>{errors.fechaNacimiento}</Text>}
              </View>

              <View style={styles.usernameField}>
                <Input
                  label="Nombre de usuario"
                  value={values.username}
                  onChangeText={(value) => update('username', value)}
                  editable={usernameEnabled && !profileLoading && !saving}
                  error={errors.username}
                  touched={!!touched.username}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={() => { void validateUsername(); }}
                />
                {usernameEnabled ? (
                  <View style={styles.validationLine} accessibilityLiveRegion="polite">
                    {availability === 'checking' ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
                    {availability === 'checking' && <Text style={styles.helperText}>Comprobando disponibilidad...</Text>}
                    {availability === 'available' && <><Check size={15} color={Colors.success} /><Text style={styles.successText}>Nombre de usuario disponible</Text></>}
                    {availability === 'taken' && <Text style={styles.errorText}>Ese nombre de usuario ya está en uso.</Text>}
                    {availability === 'error' && <Text style={styles.errorText}>No se pudo verificar. Salí del campo para reintentar.</Text>}
                  </View>
                ) : null}
              </View>

              <Input label="Email" value={values.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={emailEnabled && !profileLoading && !saving} error={errors.email} touched={!!touched.email} onBlur={() => setTouched((current) => ({ ...current, email: true }))} />
              <Input
                label="Contraseña"
                value={values.password}
                onChangeText={(value) => update('password', value)}
                secureTextEntry={!showPassword}
                error={errors.password}
                touched={!!touched.password}
                editable={!profileLoading && !saving}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                suffix={<Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShowPassword((value) => !value)} hitSlop={8}>{showPassword ? <EyeOff size={18} color={Colors.text} /> : <Eye size={18} color={Colors.text} />}</Pressable>}
              />
              <Input
                label="Confirmar contraseña"
                value={values.confirmPassword}
                onChangeText={(value) => update('confirmPassword', value)}
                secureTextEntry={!showConfirmation}
                error={errors.confirmPassword}
                touched={!!touched.confirmPassword}
                editable={!profileLoading && !saving}
                onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                suffix={<Pressable accessibilityRole="button" accessibilityLabel={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} onPress={() => setShowConfirmation((value) => !value)} hitSlop={8}>{showConfirmation ? <EyeOff size={18} color={Colors.text} /> : <Eye size={18} color={Colors.text} />}</Pressable>}
              />
            </View>

            <View style={styles.termsSection}>
              <View style={styles.termsRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel="He leído y acepto los Términos y Condiciones"
                  accessibilityState={{ checked: acceptedTerms, disabled: !terms || termsLoading }}
                  disabled={!terms || termsLoading || saving}
                  onPress={() => setAcceptedTerms((checked) => !checked)}
                  style={({ pressed }) => [styles.checkboxTouchable, pressed && styles.pressed]}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked, (!terms || termsLoading) && styles.checkboxDisabled]}>
                    {acceptedTerms && <Check size={15} color={Colors.white} strokeWidth={3} />}
                  </View>
                </Pressable>

                <Text style={[styles.acceptText, (!terms || termsLoading) && styles.disabledText]}>
                  <Text onPress={() => (!terms || termsLoading || saving ? null : setAcceptedTerms((checked) => !checked))}>
                    He leído y acepto los{' '}
                  </Text>
                  <Text style={styles.linkText} onPress={() => setTermsVisible(true)}>
                    Términos y Condiciones
                  </Text>
                </Text>
              </View>

              {!terms && termsError ? (
                <View style={styles.termsError}>
                  <Text style={styles.errorText}>{termsError}</Text>
                  <Button label="Reintentar carga" variant="ghost" onPress={() => {
                    setTermsLoading(true);
                    setTermsError('');
                    setAcceptedTerms(false);
                    void loadTerms();
                  }} />
                </View>
              ) : null}
              {termsLoading && <View style={styles.inlineStatus}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.helperText}>Cargando términos vigentes...</Text></View>}
            </View>

            {saveError ? <Text style={styles.saveError} accessibilityLiveRegion="polite">{saveError}</Text> : null}
            <Button
              label="Guardar"
              onPress={() => { void handleSave(); }}
              loading={saving}
              disabled={!formValid || !!profileError || !!termsError}
              fullWidth
              size="lg"
              style={styles.saveButton}
            />
          </KeyboardScrollProvider>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={dateVisible} transparent animationType="slide" onRequestClose={() => setDateVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dateModal, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fecha de nacimiento</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector de fecha" onPress={() => setDateVisible(false)} hitSlop={10}>
                <X size={21} color={Colors.textDark} />
              </Pressable>
            </View>
            {datePickerMode === 'days' ? (
              <Calendar
                key={calendarMonth}
                initialDate={calendarMonth}
                maxDate={today}
                markedDates={values.fechaNacimiento ? { [values.fechaNacimiento]: { selected: true, selectedColor: Colors.primary } } : {}}
                onMonthChange={(date: DateData) => setCalendarMonth(date.dateString)}
                onDayPress={(day: DateData) => {
                  update('fechaNacimiento', day.dateString);
                  setTouched((current) => ({ ...current, fechaNacimiento: true }));
                  setDateVisible(false);
                }}
                renderHeader={(date) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Elegir año o década"
                    onPress={() => {
                      const year = Number(calendarMonth.slice(0, 4));
                      setPickerYear(year);
                      setPickerDecade(Math.floor(year / 10) * 10);
                      setDatePickerMode('years');
                    }}
                    style={styles.calendarTitleButton}
                  >
                    <Text style={styles.calendarTitle}>{date?.toString('MMMM yyyy')}</Text>
                    <ChevronDown size={16} color={Colors.primary} />
                  </Pressable>
                )}
                theme={{ calendarBackground: Colors.white, todayTextColor: Colors.primary, arrowColor: Colors.primary, textMonthFontFamily: 'Inter-SemiBold', textDayFontFamily: 'Inter-Regular', textDayHeaderFontFamily: 'Inter-Medium' }}
              />
            ) : (
              <View style={styles.pickerPanel}>
                <View style={styles.pickerHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={datePickerMode === 'decades' ? 'Décadas anteriores' : datePickerMode === 'months' ? 'Año anterior' : 'Años anteriores'}
                    onPress={() => {
                      if (datePickerMode === 'decades') setDecadePageStart((value) => value - 100);
                      else if (datePickerMode === 'months') setPickerYear((value) => value - 1);
                      else setPickerDecade((value) => value - 10);
                    }}
                    style={styles.pickerArrow}
                  >
                    <ChevronLeft size={22} color={Colors.textDark} />
                  </Pressable>
                  {datePickerMode === 'years' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Elegir década"
                      onPress={() => {
                        const century = Math.floor(pickerDecade / 100) * 100;
                        setDecadePageStart(century === Math.floor(currentYear / 100) * 100 ? century - 100 : century);
                        setDatePickerMode('decades');
                      }}
                      style={styles.pickerTitleButton}
                    >
                      <Text style={styles.pickerTitle}>{pickerDecade}–{pickerDecade + 9}</Text>
                      <ChevronDown size={15} color={Colors.primary} />
                    </Pressable>
                  ) : datePickerMode === 'months' ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Volver a elegir año" onPress={() => setDatePickerMode('years')} style={styles.pickerTitleButton}>
                      <Text style={styles.pickerTitle}>{pickerYear}</Text>
                      <ChevronDown size={15} color={Colors.primary} />
                    </Pressable>
                  ) : (
                    <Text style={styles.pickerTitle}>{decadePageStart}s–{decadePageStart + 90}s</Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={datePickerMode === 'decades' ? 'Décadas siguientes' : datePickerMode === 'months' ? 'Año siguiente' : 'Años siguientes'}
                    disabled={datePickerMode === 'decades'
                      ? decadePageStart + 100 > Math.floor(currentYear / 100) * 100
                      : datePickerMode === 'months' ? pickerYear >= currentYear : pickerDecade + 10 > Math.floor(currentYear / 10) * 10}
                    onPress={() => {
                      if (datePickerMode === 'decades') setDecadePageStart((value) => value + 100);
                      else if (datePickerMode === 'months') setPickerYear((value) => value + 1);
                      else setPickerDecade((value) => value + 10);
                    }}
                    style={styles.pickerArrow}
                  >
                    <ChevronRight size={22} color={Colors.textDark} />
                  </Pressable>
                </View>
                {datePickerMode === 'years' ? (
                  <View style={styles.pickerGrid}>
                    {Array.from({ length: 10 }, (_, index) => pickerDecade + index).map((year) => (
                      <Pressable
                        key={year}
                        accessibilityRole="button"
                        accessibilityLabel={`Año ${year}`}
                        disabled={year > currentYear}
                        onPress={() => {
                          setPickerYear(year);
                          setDatePickerMode('months');
                        }}
                        style={[styles.pickerOption, year === pickerYear && styles.pickerOptionSelected, year > currentYear && styles.pickerOptionDisabled]}
                      >
                        <Text style={[styles.pickerOptionText, year === pickerYear && styles.pickerOptionSelectedText]}>{year}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : datePickerMode === 'decades' ? (
                  <View style={styles.pickerGrid}>
                    {Array.from({ length: 10 }, (_, index) => decadePageStart + index * 10).map((decade) => (
                      <Pressable
                        key={decade}
                        accessibilityRole="button"
                        accessibilityLabel={`Década de ${decade}`}
                        disabled={decade > Math.floor(currentYear / 10) * 10}
                        onPress={() => {
                          setPickerDecade(decade);
                          setPickerYear(decade);
                          setDatePickerMode('years');
                        }}
                        style={[styles.pickerOption, decade === pickerDecade && styles.pickerOptionSelected, decade > Math.floor(currentYear / 10) * 10 && styles.pickerOptionDisabled]}
                      >
                        <Text style={[styles.pickerOptionText, decade === pickerDecade && styles.pickerOptionSelectedText]}>{decade}s</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.pickerGrid}>
                    {MONTHS.map((month, index) => {
                      const monthNumber = String(index + 1).padStart(2, '0');
                      const selectedMonth = values.fechaNacimiento.startsWith(`${pickerYear}-${monthNumber}`);
                      const futureMonth = pickerYear === currentYear && index > Number(today.slice(5, 7)) - 1;
                      return (
                        <Pressable
                          key={month}
                          accessibilityRole="button"
                          accessibilityLabel={month}
                          disabled={futureMonth}
                          onPress={() => {
                            setCalendarMonth(`${pickerYear}-${monthNumber}-01`);
                            setDatePickerMode('days');
                          }}
                          style={[styles.pickerOption, styles.monthOption, selectedMonth && styles.pickerOptionSelected, futureMonth && styles.pickerOptionDisabled]}
                        >
                          <Text style={[styles.pickerOptionText, selectedMonth && styles.pickerOptionSelectedText]}>{month}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            <Button label="Cerrar" variant="outline" fullWidth onPress={() => setDateVisible(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={termsVisible} transparent animationType="slide" onRequestClose={() => setTermsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.termsModal, { marginTop: insets.top + 16, marginBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>Términos y Condiciones</Text>
                {terms ? <Text style={styles.version}>Versión {terms.version}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar términos y condiciones" onPress={() => setTermsVisible(false)} hitSlop={10}>
                <X size={21} color={Colors.textDark} />
              </Pressable>
            </View>
            {termsLoading ? (
              <View style={styles.modalState}><ActivityIndicator color={Colors.primary} /><Text style={styles.helperText}>Cargando términos...</Text></View>
            ) : termsError ? (
              <View style={styles.modalState}>
                <Text style={styles.errorText}>{termsError}</Text>
                <Button label="Reintentar" variant="outline" onPress={() => {
                  setTermsLoading(true);
                  setTermsError('');
                  setAcceptedTerms(false);
                  void loadTerms();
                }} />
              </View>
            ) : terms ? (
              <ScrollView style={styles.markdownScroll} contentContainerStyle={styles.markdownContent}>
                <Markdown style={markdownStyles}>{terms.texto}</Markdown>
              </ScrollView>
            ) : null}
            <Button label="Cerrar" variant="outline" fullWidth onPress={() => setTermsVisible(false)} style={styles.modalClose} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const markdownStyles = {
  body: { color: Colors.textDark, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 22 },
  heading1: { color: Colors.textDark, fontFamily: 'Inter-Bold', fontSize: 22, marginTop: 12, marginBottom: 8 },
  heading2: { color: Colors.textDark, fontFamily: 'Inter-SemiBold', fontSize: 18, marginTop: 10, marginBottom: 6 },
  heading3: { color: Colors.textDark, fontFamily: 'Inter-SemiBold', fontSize: 16, marginTop: 8, marginBottom: 4 },
  paragraph: { marginTop: 0, marginBottom: 10 },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  link: { color: Colors.primary },
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.neutralBg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  heading: { marginBottom: Spacing.lg },
  eyebrow: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.primary, marginBottom: 8 },
  title: { fontFamily: 'Inter-Bold', fontSize: 27, lineHeight: 34, color: Colors.textDark },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.text, marginTop: 6 },
  form: { backgroundColor: Colors.white, borderRadius: Radius.panel, borderWidth: 1, borderColor: Colors.neutralBorder, padding: 16 },
  field: { marginBottom: 12 },
  label: { ...Typography.caption, color: Colors.textSoft, fontWeight: '600', marginBottom: 6 },
  dateButton: { minHeight: 48, borderRadius: Radius.input, borderWidth: 1, borderColor: Colors.neutralBorder, backgroundColor: Colors.white, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputError: { borderColor: Colors.danger },
  dateText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textDark },
  placeholder: { color: Colors.disabledText },
  fieldError: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.danger, marginTop: 4 },
  usernameField: { marginBottom: 2 },
  validationLine: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -7, marginBottom: 10 },
  helperText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  successText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.success },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.danger },
  noticeError: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.danger, borderRadius: Radius.panel, padding: 14, marginBottom: 16 },
  termsSection: { marginTop: Spacing.md, marginBottom: Spacing.md },
  termsRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxTouchable: { marginRight: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: Colors.neutralBorder, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxDisabled: { backgroundColor: Colors.disabledBg },
  acceptText: { flex: 1, flexWrap: 'wrap', fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textDark },
  disabledText: { color: Colors.disabledText },
  linkText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.primary, textDecorationLine: 'underline' },
  termsError: { marginTop: 8, gap: 4 },
  inlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  saveError: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.danger, marginBottom: 10 },
  saveButton: { marginTop: 4 },
  pressed: { opacity: 0.7 },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 14 },
  dateModal: { width: '100%', maxWidth: 480, backgroundColor: Colors.white, borderRadius: Radius.panel, padding: 16, gap: 12 },
  calendarTitleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6 },
  calendarTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textDark, textTransform: 'capitalize' },
  pickerPanel: { gap: 12 },
  pickerHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerArrow: { width: 42, height: 42, borderRadius: Radius.input, backgroundColor: Colors.neutralBg, alignItems: 'center', justifyContent: 'center' },
  pickerTitleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 8 },
  pickerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textDark },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  pickerOption: { width: '30%', minHeight: 44, borderWidth: 1, borderColor: Colors.neutralBorder, borderRadius: Radius.input, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  monthOption: { minHeight: 46 },
  pickerOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pickerOptionDisabled: { opacity: 0.4 },
  pickerOptionText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark, textAlign: 'center' },
  pickerOptionSelectedText: { fontFamily: 'Inter-SemiBold', color: Colors.white },
  termsModal: { flex: 1, width: '100%', maxWidth: 640, backgroundColor: Colors.white, borderRadius: Radius.panel, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.neutralBorder },
  modalHeading: { flex: 1 },
  modalTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, lineHeight: 24, color: Colors.textDark },
  version: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text, marginTop: 3 },
  modalState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 },
  markdownScroll: { flex: 1, marginTop: 8 },
  markdownContent: { paddingBottom: 16 },
  modalClose: { marginTop: 12 },
});