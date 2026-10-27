import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { CalendarDays, Wallet, Plus, Users, Settings, LogOut } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography } from '@/constants/theme';
import { Rol } from '@/types/domain';

const ROLE_TABS: Record<Rol, { name: string; title: string; icon: any; roles: Rol[] }[]> = {
  ADMINISTRADOR: [
    { name: 'calendario', title: 'Agenda', icon: CalendarDays, roles: ['ADMINISTRADOR', 'ENCARGADO', 'EMPLEADO'] },
    { name: 'finanzas', title: 'Finanzas', icon: Wallet, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'nueva', title: 'Reservar', icon: Plus, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'clientes', title: 'Clientes', icon: Users, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'ajustes', title: 'Ajustes', icon: Settings, roles: ['ADMINISTRADOR', 'ENCARGADO', 'CLIENTE', 'EMPLEADO'] },
  ],
  ENCARGADO: [
    { name: 'calendario', title: 'Agenda', icon: CalendarDays, roles: ['ADMINISTRADOR', 'ENCARGADO', 'EMPLEADO'] },
    { name: 'finanzas', title: 'Finanzas', icon: Wallet, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'nueva', title: 'Reservar', icon: Plus, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
    { name: 'clientes', title: 'Clientes', icon: Users, roles: ['ADMINISTRADOR', 'ENCARGADO'] },
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

  if (!usuario) {
    return <Redirect href="/login" />;
  }

  const tabs = ROLE_TABS[usuario.rol];

  return (
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
  );
}
