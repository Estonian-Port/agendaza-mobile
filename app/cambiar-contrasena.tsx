import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { KeyboardScrollProvider } from '@/components/ui/KeyboardScrollContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error.response;
    if (response && typeof response === 'object' && 'data' in response) {
      const body: unknown = response.data;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object') {
        const fields = body as Record<string, unknown>;
        for (const key of ['message', 'error', 'mensaje']) {
          const value = fields[key];
          if (typeof value === 'string' && value.trim()) return value;
        }
      }
    }
  }
  return error instanceof Error ? error.message : 'No se pudo cambiar la contraseña. Intentá nuevamente.';
}

export default function CambiarContrasenaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const { token, completePasswordChange } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState('');

  if (!token) return <Redirect href="/login" />;

  const passwordError = !password
    ? 'Ingresá una contraseña.'
    : password.length < 8
      ? 'Debe tener al menos 8 caracteres.'
      : !/[A-Z]/.test(password)
        ? 'Incluí al menos una letra mayúscula.'
        : !/[0-9]/.test(password)
          ? 'Incluí al menos un número.'
          : '';
  const confirmationError = !confirmation
    ? 'Confirmá tu contraseña.'
    : password !== confirmation
      ? 'Las contraseñas no coinciden.'
      : '';

  const handleSave = async () => {
    setTouched(true);
    if (passwordError || confirmationError || saving) return;
    setSaving(true);
    setRequestError('');
    try {
      const destination = await completePasswordChange(password);
      if (destination === 'onboarding') router.replace('/complete-profile');
      else if (destination === 'email-verification') router.replace('/verificar-email');
      else if (destination === 'single') router.replace('/(tabs)/calendario');
      else if (destination === 'multiple') router.replace('/seleccionar-agenda');
      else router.replace('/(tabs)/calendario');
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <KeyboardScrollProvider scrollRef={scrollRef}>
            <Card radius="panel" shadow="soft" style={styles.form}>
              <View style={styles.iconWrap}>
                <LockKeyhole size={24} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Cambiar Contraseña</Text>
              <Text style={styles.subtitle}>Para continuar, elegí una nueva contraseña.</Text>

              <View style={styles.fields}>
                <Input
                  label="Nueva Contraseña"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setRequestError('');
                  }}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={passwordError}
                  touched={touched}
                  onBlur={() => setTouched(true)}
                  editable={!saving}
                  suffix={(
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onPress={() => setShowPassword((visible) => !visible)}
                      hitSlop={8}
                    >
                      {showPassword ? <EyeOff size={18} color={Colors.text} /> : <Eye size={18} color={Colors.text} />}
                    </Pressable>
                  )}
                />
                <Input
                  label="Confirmar Contraseña"
                  value={confirmation}
                  onChangeText={(value) => {
                    setConfirmation(value);
                    setRequestError('');
                  }}
                  placeholder="Repetí la nueva contraseña"
                  secureTextEntry={!showConfirmation}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={confirmationError}
                  touched={touched}
                  onBlur={() => setTouched(true)}
                  editable={!saving}
                  suffix={(
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                      onPress={() => setShowConfirmation((visible) => !visible)}
                      hitSlop={8}
                    >
                      {showConfirmation ? <EyeOff size={18} color={Colors.text} /> : <Eye size={18} color={Colors.text} />}
                    </Pressable>
                  )}
                />
              </View>

              {requestError ? <Text accessibilityRole="alert" style={styles.error}>{requestError}</Text> : null}

              <Button
                label="Guardar"
                onPress={handleSave}
                loading={saving}
                disabled={!password || !confirmation || !!passwordError || !!confirmationError}
                fullWidth
                size="lg"
              />
            </Card>
          </KeyboardScrollProvider>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.neutralBg },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: Spacing.xl,
  },
  form: { padding: 24 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf2ff',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.title,
    color: Colors.textDark,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  fields: { gap: Spacing.sm, marginBottom: Spacing.md },
  error: {
    ...Typography.caption,
    color: Colors.danger,
    marginBottom: Spacing.md,
  },
});