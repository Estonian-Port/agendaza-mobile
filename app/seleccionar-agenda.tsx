import React, { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Building2, ChevronRight, LogOut } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Colors, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function SeleccionarAgendaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { usuario, agendas, selectAgenda, logout, requiresOnboarding } = useAuth();
  const [selecting, setSelecting] = useState(false);

  if (!usuario) return <Redirect href="/login" />;
  if (requiresOnboarding) return <Redirect href="/complete-profile" />;

  const sortedAgendas = [...agendas].sort((a, b) => a.id - b.id);

  const handleSelect = async (agenda: (typeof sortedAgendas)[number]) => {
    if (selecting) return;
    setSelecting(true);
    try {
      await selectAgenda(agenda);
      router.replace('/(tabs)/calendario');
    } catch (error) {
      Alert.alert(
        'No se pudo seleccionar la agenda',
        error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      );
    } finally {
      setSelecting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <Card radius="panel" shadow="soft" style={styles.heading}>
        <Text style={styles.eyebrow}>Agendaza · {usuario.nombre}</Text>
        <Text style={styles.title}>Seleccione una Agenda</Text>
        <Text style={styles.subtitle}>Elija el salón que desea gestionar.</Text>
      </Card>

      <View style={styles.list}>
        {sortedAgendas.map((agenda, index) => (
          <Card
            key={agenda.id}
            onPress={() => { void handleSelect(agenda); }}
            radius="panel"
            shadow="soft"
            style={styles.agendaCard}
          >
            <View style={styles.iconWrap}>
              <Building2 size={22} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.agendaInfo}>
              <Text style={styles.agendaName}>{agenda.nombre}</Text>
              {'direccion' in agenda && agenda.direccion ? (
                <Text style={styles.agendaAddress}>{agenda.direccion}</Text>
              ) : null}
            </View>
            <ChevronRight size={20} color={Colors.text} />
          </Card>
        ))}
      </View>

      <View style={styles.spacer} />

      <Pressable
        accessibilityRole="button"
        onPress={() => { void logout(); router.replace('/login'); }}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
      >
        <LogOut size={17} color={Colors.text} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.neutralBg },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  heading: {
    marginBottom: 28,
    padding: 16,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 27,
    lineHeight: 34,
    color: Colors.textDark,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    marginTop: 7,
  },
  list: { gap: 12 },
  spacer: { flexGrow: 1 },
  agendaCard: {
    minHeight: 86,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaInfo: { flex: 1, gap: 4 },
  agendaName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
  },
  agendaAddress: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.text,
  },
  numberWrap: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.text },
  logout: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  logoutText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text },
  pressed: { opacity: 0.65 },
});