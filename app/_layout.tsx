import { useEffect, useState } from 'react';
import { SplashScreen, Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LocaleConfig } from 'react-native-calendars';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getStoreUrl, isNativeUpdateRequired } from '@/services/version.service';

LocaleConfig.locales.es = {
  monthNames: [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ],
  monthNamesShort: [
    'ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
    'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.',
  ],
  dayNames: [
    'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
  ],
  dayNamesShort: ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [checkingVersion, setCheckingVersion] = useState(Platform.OS !== 'web');
  const [updateRequired, setUpdateRequired] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    isNativeUpdateRequired()
      .then((required) => {
        if (active) setUpdateRequired(required);
      })
      .catch(() => {
        if (active) setUpdateRequired(false);
      })
      .finally(() => {
        if (active) setCheckingVersion(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (checkingVersion) {
    return (
      <View style={styles.checking}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (updateRequired) {
    return (
      <View style={styles.updateRequired}>
        <Text style={styles.updateTitle}>Actualización necesaria</Text>
        <Text style={styles.updateMessage}>
          Instalá la última versión de Agendaza para continuar.
        </Text>
        <Button
          label="Actualizar ahora"
          onPress={() => Linking.openURL(getStoreUrl())}
          fullWidth
        />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

function AppNavigator() {
  const { authReady } = useAuth();

  if (!authReady) {
    return (
      <View style={styles.checking}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <AuthNavigationGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="seleccionar-agenda" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="complete-profile" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="verificar-email" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="cambiar-contrasena" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

function AuthNavigationGuard() {
  const { requiresOnboarding, requiresEmailVerification, requiresPasswordChange } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (requiresOnboarding && pathname !== '/complete-profile') {
      router.replace('/complete-profile');
      return;
    }
    if (requiresEmailVerification && pathname !== '/verificar-email' && pathname !== '/login') {
      router.replace('/verificar-email');
      return;
    }
    if (requiresPasswordChange && pathname !== '/cambiar-contrasena') {
      router.replace('/cambiar-contrasena');
    }
  }, [pathname, requiresOnboarding, requiresEmailVerification, requiresPasswordChange, router]);

  return null;
}

const styles = StyleSheet.create({
  checking: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  updateRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.white,
  },
  updateTitle: {
    ...Typography.title,
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  updateMessage: {
    ...Typography.body,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
