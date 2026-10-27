import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { CalendarDays, Lock, Mail, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Radius, Shadow, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const handleLogin = async () => {
    setTouched(true);
    if (!email || !password) return;
    const ok = await login(email, password);
    if (ok) {
      router.replace('/(tabs)');
    }
  };

  const fillDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <CalendarDays size={40} color={Colors.white} strokeWidth={2.2} />
          </View>
          <Text style={styles.brand}>Agendaza</Text>
          <Text style={styles.tagline}>Gestión de salones y eventos</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.welcome}>Bienvenido</Text>
          <Text style={styles.subtitle}>Ingresá con tu cuenta para continuar</Text>

          <View style={styles.inputWrap}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="ejemplo@agendaza.com"
              keyboardType="email-address"
              error={!email && touched ? 'El email es requerido' : ''}
              touched={touched}
              prefix={<Mail size={18} color={Colors.text} />}
            />
          </View>

          <View style={styles.inputWrap}>
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              error={!password && touched ? 'La contraseña es requerida' : ''}
              touched={touched}
              prefix={<Lock size={18} color={Colors.text} />}
              suffix={
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.text} />
                  ) : (
                    <Eye size={18} color={Colors.text} />
                  )}
                </Pressable>
              }
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            label="Iniciar sesión"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.demoWrap}>
          <Text style={styles.demoTitle}>Cuentas de prueba (Mock Mode)</Text>
          <View style={styles.demoRow}>
            {demoAccounts.map((acc) => (
              <Pressable
                key={acc.email}
                style={({ pressed }) => [styles.demoChip, pressed && styles.demoChipPressed]}
                onPress={() => fillDemo(acc.email, acc.password)}
              >
                <Text style={styles.demoChipLabel}>{acc.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const demoAccounts = [
  { label: 'Admin', email: 'admin@agendaza.com', password: 'admin123' },
  { label: 'Encargado', email: 'encargado@agendaza.com', password: 'encargado123' },
  { label: 'Cliente', email: 'cliente@agendaza.com', password: 'cliente123' },
  { label: 'Empleado', email: 'empleado@agendaza.com', password: 'empleado123' },
];

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.tertiary },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: 30,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadow.cardLg,
  },
  brand: {
    fontFamily: 'Inter-Bold',
    fontSize: 30,
    color: Colors.textDark,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.cardLg,
    padding: 24,
    marginTop: 8,
    ...Shadow.cardLg,
  },
  welcome: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: Colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 22,
  },
  inputWrap: { marginBottom: 4 },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.danger,
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtn: { marginTop: 12 },
  demoWrap: {
    marginTop: 24,
  },
  demoTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  demoChip: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    ...Shadow.soft,
  },
  demoChipPressed: { opacity: 0.8 },
  demoChipLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.primary,
  },
});
