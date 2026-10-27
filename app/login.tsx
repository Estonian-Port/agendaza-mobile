import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, UserRound, Eye, EyeOff } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const handleLogin = async () => {
    setTouched(true);
    if (!username || !password) return;
    const result = await login(username, password);
    if (result === 'single') {
      router.replace('/(tabs)/calendario');
    } else if (result === 'multiple') {
      router.replace('/seleccionar-agenda');
    }
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
        <Card radius="panel" shadow="soft" style={styles.loginCard}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.brand}>Agendaza</Text>
          <Text style={styles.tagline}>Gestión de salones y eventos</Text>

          <View style={styles.inputWrap}>
            <Input
              label="Nombre de usuario"
              value={username}
              onChangeText={setUsername}
              placeholder="Ingrese su nombre de usuario"
              error={!username && touched ? 'El nombre de usuario es requerido' : ''}
              touched={touched}
              prefix={<UserRound size={18} color={Colors.text} />}
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
        </Card>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.neutralBg },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loginCard: {
    alignItems: 'center',
    padding: 24,
  },
  logoImage: { width: 64, height: 64, marginBottom: 12 },
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
    marginBottom: 24,
  },
  inputWrap: { width: '100%', marginBottom: 4 },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.danger,
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtn: { marginTop: 12 },
});
