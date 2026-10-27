import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'neutral' | 'warning';
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: ReactNode;
}

export function Badge({ label, variant = 'neutral', size = 'sm', dot, icon }: BadgeProps) {
  const palette = palettes[variant];
  const sizing = sizes[size];
  return (
    <View style={[styles.base, sizing, palette.container]}>
      {dot && <View style={[styles.dot, palette.dot]} />}
      {icon}
      <Text style={[Typography.micro, palette.text]}>{label}</Text>
    </View>
  );
}

const palettes = {
  primary: {
    container: { backgroundColor: 'rgba(13, 110, 253, 0.12)' },
    text: { color: Colors.primary },
    dot: { backgroundColor: Colors.primary },
  },
  secondary: {
    container: { backgroundColor: 'rgba(30, 144, 255, 0.12)' },
    text: { color: Colors.secondary },
    dot: { backgroundColor: Colors.secondary },
  },
  success: {
    container: { backgroundColor: 'rgba(25, 135, 84, 0.12)' },
    text: { color: Colors.success },
    dot: { backgroundColor: Colors.success },
  },
  danger: {
    container: { backgroundColor: 'rgba(220, 53, 69, 0.12)' },
    text: { color: Colors.danger },
    dot: { backgroundColor: Colors.danger },
  },
  warning: {
    container: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
    text: { color: Colors.warning },
    dot: { backgroundColor: Colors.warning },
  },
  neutral: {
    container: { backgroundColor: Colors.neutralInput },
    text: { color: Colors.neutralText },
    dot: { backgroundColor: Colors.neutralText },
  },
} as const;

const sizes = {
  sm: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.badge },
  md: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.badge },
} as const;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
});
