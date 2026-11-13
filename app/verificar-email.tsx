import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usuarioService } from '@/services/usuario.service';

const RESEND_COOLDOWN_SECONDS = 59;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error.response;
    if (response && typeof response === 'object' && 'data' in response) {
      const body: unknown = response.data;
      if (body && typeof body === 'object') {
        const fields = body as Record<string, unknown>;
        for (const key of ['message', 'error', 'mensaje']) {
          const value = fields[key];
          if (typeof value === 'string' && value.trim()) return value;
        }
      }
    }
  }
  return error instanceof Error ? error.message : 'No se pudo completar la verificación. Intentá nuevamente.';
}

export default function VerificarEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, agendas, usuario, requiresOnboarding, requiresEmailVerification, requiresPasswordChange, confirmEmailVerification } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [requestingInitial, setRequestingInitial] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const initialRequestStarted = useRef(false);

  useEffect(() => {
    if (cooldownEndsAt === null) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) setCooldownEndsAt(null);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  useEffect(() => {
    if (!token || requiresOnboarding || !requiresEmailVerification || initialRequestStarted.current) return;
    initialRequestStarted.current = true;
    setRequestingInitial(true);
    setError('');
    void usuarioService.requestEmailVerification()
      .then(() => {
        setNotice('Te enviamos un código a tu dirección.');
        setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      })
      .catch((requestError: unknown) => setError(getErrorMessage(requestError)))
      .finally(() => setRequestingInitial(false));
  }, [token, requiresOnboarding, requiresEmailVerification]);

  if (!token) return <Redirect href="/login" />;
  if (requiresOnboarding) return <Redirect href="/complete-profile" />;
  if (requiresPasswordChange && !requiresEmailVerification) return <Redirect href="/cambiar-contrasena" />;
  if (!requiresEmailVerification) {
    return <Redirect href={agendas.length > 1 && !usuario?.empresaId ? '/seleccionar-agenda' : '/(tabs)/calendario'} />;
  }

  const handleResend = async () => {
    setResending(true);
    setError('');
    setNotice('');
    try {
      await usuarioService.requestEmailVerification();
      setNotice('Enviamos un nuevo código a tu email.');
      setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setResending(false);
    }
  };

  const handleConfirm = async () => {
    setTouched(true);
    if (!codigo.trim() || loading) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const destination = await confirmEmailVerification(codigo.trim());
      if (destination === 'onboarding') router.replace('/complete-profile');
      else if (destination === 'email-verification') setError('El email todavía figura sin verificar. Revisá el código e intentá nuevamente.');
      else if (destination === 'password-change') router.replace('/cambiar-contrasena');
      else if (destination === 'multiple') router.replace('/seleccionar-agenda');
      else router.replace('/(tabs)/calendario');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Card radius="panel" shadow="soft" style={styles.form}>
            <View style={styles.iconWrap}>
              <MailCheck size={24} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Verificá tu email.</Text>
            <Text style={styles.subtitle}>Te enviamos un código a tu dirección.</Text>
            <Input
              label="Código de verificación"
              value={codigo}
              onChangeText={(value) => {
                setCodigo(value);
                setError('');
              }}
              placeholder="Ingresá el código"
              autoCapitalize="characters"
              autoCorrect={false}
              error={!codigo.trim() ? 'El código es obligatorio.' : ''}
              touched={touched}
              editable={!loading}
              onBlur={() => setTouched(true)}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
            <Button
              label="Confirmar email"
              onPress={handleConfirm}
              loading={loading}
              disabled={!codigo.trim()}
              fullWidth
              size="lg"
              style={styles.confirmButton}
            />
            <Button
              label={cooldownSeconds > 0 ? `Reenviar código (${cooldownSeconds} s)` : 'Reenviar código'}
              variant="ghost"
              onPress={handleResend}
              loading={resending}
              disabled={requestingInitial || cooldownSeconds > 0}
              fullWidth
            />
          </Card>
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
  title: { ...Typography.title, color: Colors.textDark },
  subtitle: {
    ...Typography.body,
    color: Colors.text,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  error: { ...Typography.caption, color: Colors.danger, marginBottom: Spacing.md },
  notice: { ...Typography.caption, color: Colors.success, marginBottom: Spacing.md },
  confirmButton: { marginBottom: Spacing.xs },
});