import React from 'react';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Building2, CalendarDays, ChevronLeft, ChevronRight, LogOut, Plus, Settings, UserRound, Wallet } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography } from '@/constants/theme';
import { Rol } from '@/types/domain';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROLE_TABS: Record<Rol, { name: string; title: string; icon: any; roles: Rol[] }[]> = {
  ADMINISTRADOR: [
    { name: 'calendario', title: 'Agenda', icon: CalendarDays, roles: ['ADMINISTRADOR', 'ENCARGADO', 'EMPLEADO'] },
    { name: 'nueva', title: 'Reservar', icon: Plus, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'finanzas', title: 'Finanzas', icon: Wallet, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'ajustes', title: 'Ajustes', icon: Settings, roles: ['ADMINISTRADOR', 'ENCARGADO', 'CLIENTE', 'EMPLEADO'] },
  ],
  ENCARGADO: [
    { name: 'calendario', title: 'Agenda', icon: CalendarDays, roles: ['ADMINISTRADOR', 'ENCARGADO', 'EMPLEADO'] },
    { name: 'nueva', title: 'Reservar', icon: Plus, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'finanzas', title: 'Finanzas', icon: Wallet, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'ajustes', title: 'Ajustes', icon: Settings, roles: ['ADMINISTRADOR', 'ENCARGADO', 'CLIENTE', 'EMPLEADO'] },
  ],
  CLIENTE: [
    { name: 'calendario', title: 'Mis Eventos', icon: CalendarDays, roles: ['CLIENTE'] },
    { name: 'ajustes', title: 'Ajustes', icon: Settings, roles: ['ADMINISTRADOR', 'ENCARGADO', 'CLIENTE', 'EMPLEADO'] },
  ],
  EMPLEADO: [
    { name: 'calendario', title: 'Agenda', icon: CalendarDays, roles: ['ADMINISTRADOR', 'ENCARGADO', 'EMPLEADO'] },
    { name: 'nueva', title: 'Reservar', icon: Plus, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'ajustes', title: 'Ajustes', icon: Settings, roles: ['ADMINISTRADOR', 'ENCARGADO', 'CLIENTE', 'EMPLEADO'] },
  ],
};

export default function TabLayout() {
  const { usuario, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuView, setMenuView] = useState<'menu' | 'profile' | 'company'>('menu');

  if (!usuario) {
    return <Redirect href="/login" />;
  }

  const tabs = ROLE_TABS[usuario.rol];

  return (
    <View style={styles.screen}>
      <View style={[styles.navbar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brand}>
          <CalendarDays size={23} color={Colors.primary} strokeWidth={2.2} />
          <Text style={styles.brandName}>Agendaza</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir opciones de usuario"
          onPress={() => {
            setMenuView('menu');
            setMenuVisible(true);
          }}
          style={({ pressed }) => [styles.userButton, pressed && styles.pressed]}
        >
          <UserRound size={20} color={Colors.textDark} strokeWidth={2} />
        </Pressable>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.text,
          tabBarStyle: {
            backgroundColor: Colors.white,
            borderTopColor: Colors.neutralBorder,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontFamily: 'Inter-Medium',
            fontSize: 11,
            marginTop: 2,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => <tab.icon color={color} size={size} strokeWidth={2} />,
            }}
          />
        ))}
      </Tabs>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)} />
          <View style={[styles.menu, { top: insets.top + 60 }]}>
            {menuView === 'menu' ? (
              <>
                <View style={styles.menuIdentity}>
                  <Text style={styles.userName}>{usuario.nombre} {usuario.apellido}</Text>
                  <Text style={styles.userEmail}>{usuario.email}</Text>
                </View>
                <Pressable style={styles.menuItem} onPress={() => setMenuView('profile')}>
                  <UserRound size={18} color={Colors.text} />
                  <Text style={styles.menuLabel}>Perfil</Text>
                  <ChevronRight size={17} color={Colors.text} />
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => setMenuView('company')}>
                  <Building2 size={18} color={Colors.text} />
                  <Text style={styles.menuLabel}>Empresa</Text>
                  <ChevronRight size={17} color={Colors.text} />
                </Pressable>
                <View style={styles.menuDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    void logout();
                  }}
                >
                  <LogOut size={18} color={Colors.danger} />
                  <Text style={[styles.menuLabel, styles.logoutLabel]}>Cerrar sesión</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.detailBack} onPress={() => setMenuView('menu')}>
                  <ChevronLeft size={18} color={Colors.textDark} />
                  <Text style={styles.detailTitle}>{menuView === 'profile' ? 'Perfil' : 'Empresa'}</Text>
                </Pressable>
                {menuView === 'profile' ? (
                  <>
                    <Text style={styles.detailLabel}>Nombre</Text>
                    <Text style={styles.detailValue}>{usuario.nombre} {usuario.apellido}</Text>
                    <Text style={styles.detailLabel}>Correo</Text>
                    <Text style={styles.detailValue}>{usuario.email}</Text>
                    <Text style={styles.detailLabel}>Rol</Text>
                    <Text style={styles.detailValue}>{usuario.rol}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.detailLabel}>Nombre</Text>
                    <Text style={styles.detailValue}>{usuario.empresaNombre || 'Empresa'}</Text>
                    <Text style={styles.detailLabel}>Identificador</Text>
                    <Text style={styles.detailValue}>{usuario.empresaId}</Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  navbar: {
    minHeight: 58,
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandName: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    color: Colors.textDark,
  },
  userButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: Colors.neutralBg,
  },
  pressed: { opacity: 0.7 },
  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.18)' },
  menu: {
    position: 'absolute',
    right: 12,
    width: 260,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  menuIdentity: { paddingHorizontal: 16, paddingVertical: 10 },
  userName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark },
  userEmail: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text, marginTop: 3 },
  menuItem: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textDark },
  menuDivider: { height: 1, backgroundColor: Colors.neutralBorder, marginVertical: 5 },
  logoutLabel: { color: Colors.danger },
  detailBack: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  detailTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark },
  detailLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.text, marginTop: 9, marginHorizontal: 16 },
  detailValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textDark, marginTop: 3, marginHorizontal: 16 },
});
